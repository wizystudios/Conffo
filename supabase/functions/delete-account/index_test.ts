// Automated checks for the delete-account edge function.
// Verifies: (1) unauthenticated requests are rejected, (2) a valid user JWT
// triggers a full cascade wipe of public data and removal of the auth user.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/delete-account`;

Deno.test("rejects unauthenticated requests with 401", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, "unauthorized");
});

Deno.test("rejects bogus bearer tokens with 401", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: "Bearer not-a-real-jwt",
    },
  });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test("deletes user, profile, and auth row end-to-end", async () => {
  if (!SERVICE) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY missing — skipping e2e wipe test");
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE);
  const email = `delete-test-${crypto.randomUUID()}@conffo.test`;
  const password = "TestPassword!2026";

  // 1. Create a throwaway user via admin API.
  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert(!createErr, `create user failed: ${createErr?.message}`);
  const userId = created.user!.id;

  try {
    // Seed a profile row so we can verify cascade deletion.
    await admin.from("profiles").upsert({
      id: userId,
      username: `del_${userId.slice(0, 8)}`,
      onboarding_completed: false,
    });

    // 2. Sign in as the user to get a real JWT.
    const userClient = createClient(SUPABASE_URL, ANON);
    const { data: signIn, error: signInErr } =
      await userClient.auth.signInWithPassword({ email, password });
    assert(!signInErr && signIn.session, `sign in failed: ${signInErr?.message}`);
    const token = signIn.session!.access_token;

    // 3. Call the edge function with the user's JWT.
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON,
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await res.json();
    assertEquals(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assertEquals(body.ok, true);

    // 4. Profile row must be gone.
    const { data: prof } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    assertEquals(prof, null, "profile row should be deleted");

    // 5. Auth user must be gone.
    const { data: authLookup } = await admin.auth.admin.getUserById(userId);
    assertEquals(authLookup.user, null, "auth.users row should be deleted");
  } finally {
    // Safety net: if anything above threw before deletion, clean up.
    try { await admin.auth.admin.deleteUser(userId); } catch (_) { /* ignore */ }
  }
});

// E2E tests against the deployed admin-moderate endpoint.
// Verifies that only super admins (profiles.is_admin=true) can dismiss / delete
// / warn / temp_ban; everyone else gets HTTP 403 from the actual API route.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/admin-moderate`;

function svc() {
  return createClient(SUPABASE_URL, SERVICE);
}

async function makeUser(opts: { admin?: boolean } = {}) {
  const admin = svc();
  const email = `mod-${crypto.randomUUID()}@example.com`;
  const password = "TestPass123!aA";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("user creation failed");
  if (opts.admin) {
    await admin.from("profiles").upsert({ id: data.user.id, is_admin: true });
  }
  const u = createClient(SUPABASE_URL, ANON);
  const { data: s, error: sErr } = await u.auth.signInWithPassword({ email, password });
  if (sErr || !s.session) throw sErr ?? new Error("sign-in failed");
  return { userId: data.user.id, token: s.session.access_token };
}

async function cleanup(userId: string) {
  await svc().auth.admin.deleteUser(userId).catch(() => {});
}

async function call(token: string | null, body: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      apikey: ANON,
    },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  return { status: res.status, json: j };
}

Deno.test("admin-moderate: unauthenticated request returns 401", async () => {
  const r = await call(null, { action: "dismiss", reportId: crypto.randomUUID() });
  assertEquals(r.status, 401);
});

Deno.test("admin-moderate: regular user is rejected with 403 for every action", async () => {
  const u = await makeUser();
  try {
    for (const body of [
      { action: "dismiss", reportId: crypto.randomUUID() },
      { action: "delete", reportId: crypto.randomUUID(), confessionId: crypto.randomUUID() },
      { action: "warn", userId: crypto.randomUUID(), reason: "spam" },
      { action: "temp_ban", userId: crypto.randomUUID(), untilIso: new Date(Date.now() + 86400000).toISOString() },
    ]) {
      const r = await call(u.token, body);
      assertEquals(r.status, 403, `expected 403 for ${JSON.stringify(body)}, got ${r.status}`);
    }
  } finally {
    await cleanup(u.userId);
  }
});

Deno.test("admin-moderate: super admin can dismiss a report and warn a user", async () => {
  const admin = await makeUser({ admin: true });
  const victim = await makeUser();
  try {
    const s = svc();
    // create a report row to dismiss
    const { data: report, error: repErr } = await s.from("reports").insert({
      reporter_id: admin.userId,
      reported_user_id: victim.userId,
      reason: "test",
    }).select("id").single();
    assert(!repErr, repErr?.message);

    const r1 = await call(admin.token, { action: "dismiss", reportId: report!.id });
    assertEquals(r1.status, 200);
    assertEquals(r1.json.ok, true);

    const r2 = await call(admin.token, { action: "warn", userId: victim.userId, reason: "behave" });
    assertEquals(r2.status, 200);
    assertEquals(r2.json.ok, true);

    await s.from("reports").delete().eq("id", report!.id);
  } finally {
    await cleanup(admin.userId);
    await cleanup(victim.userId);
  }
});

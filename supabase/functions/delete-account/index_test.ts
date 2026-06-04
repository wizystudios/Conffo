// Automated checks for the delete-account edge function.
// Coverage:
//   - missing Authorization header                  -> 401
//   - bogus / malformed JWT                         -> 401
//   - syntactically valid but expired JWT           -> 401
//   - cross-user delete attempt (token A, body B)   -> only A is deleted
//   - end-to-end wipe of profile, follows, confessions, comments, reactions
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/delete-account`;

function callFn(headers: Record<string, string> = {}, body?: unknown) {
  return fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

Deno.test("rejects requests with no Authorization header", async () => {
  const res = await callFn();
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, "unauthorized");
});

Deno.test("rejects bogus bearer tokens", async () => {
  const res = await callFn({ Authorization: "Bearer not-a-real-jwt" });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test("rejects a syntactically valid but expired JWT", async () => {
  // header.payload.signature — payload has exp in the far past.
  // The function calls supabase.auth.getUser(token) which rejects expired tokens.
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payload = btoa(JSON.stringify({
    sub: "00000000-0000-0000-0000-000000000000",
    iat: 1, exp: 2, aud: "authenticated", role: "authenticated",
  })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const expired = `${header}.${payload}.invalidsignature`;
  const res = await callFn({ Authorization: `Bearer ${expired}` });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test({
  name: "cross-user body cannot override the JWT subject",
  ignore: !SERVICE,
  fn: async () => {
    const admin = createClient(SUPABASE_URL, SERVICE);
    const mkEmail = () => `xuser-${crypto.randomUUID()}@conffo.test`;
    const password = "TestPassword!2026";

    const a = await admin.auth.admin.createUser({
      email: mkEmail(), password, email_confirm: true,
    });
    const b = await admin.auth.admin.createUser({
      email: mkEmail(), password, email_confirm: true,
    });
    const aId = a.data.user!.id;
    const bId = b.data.user!.id;

    try {
      const userClient = createClient(SUPABASE_URL, ANON);
      const signIn = await userClient.auth.signInWithPassword({
        email: a.data.user!.email!, password,
      });
      const token = signIn.data.session!.access_token;

      // Attempt to delete user B while authenticated as A.
      const res = await callFn(
        { Authorization: `Bearer ${token}` },
        { user_id: bId },
      );
      await res.text();

      // A is deleted (the JWT's subject); B is untouched.
      const aLookup = await admin.auth.admin.getUserById(aId);
      const bLookup = await admin.auth.admin.getUserById(bId);
      assertEquals(aLookup.data.user, null, "JWT subject (A) should be deleted");
      assert(bLookup.data.user, "Other user (B) must NOT be deleted");
    } finally {
      try { await admin.auth.admin.deleteUser(aId); } catch (_) {}
      try { await admin.auth.admin.deleteUser(bId); } catch (_) {}
    }
  },
});

Deno.test({
  name: "end-to-end wipe removes profile, follows, confessions, comments, reactions",
  ignore: !SERVICE,
  fn: async () => {
    const admin = createClient(SUPABASE_URL, SERVICE);
    const email = `delete-test-${crypto.randomUUID()}@conffo.test`;
    const password = "TestPassword!2026";

    const created = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    const userId = created.data.user!.id;

    // Companion user so we can seed a follow edge in both directions.
    const peer = await admin.auth.admin.createUser({
      email: `peer-${crypto.randomUUID()}@conffo.test`,
      password, email_confirm: true,
    });
    const peerId = peer.data.user!.id;

    let confessionId: string | null = null;

    try {
      await admin.from("profiles").upsert({
        id: userId,
        username: `del_${userId.slice(0, 8)}`,
        onboarding_completed: false,
      });
      await admin.from("profiles").upsert({
        id: peerId,
        username: `peer_${peerId.slice(0, 8)}`,
        onboarding_completed: false,
      });

      const conf = await admin.from("confessions").insert({
        user_id: userId, content: "wipe-me", room: "general",
      }).select("id").single();
      confessionId = conf.data?.id ?? null;

      if (confessionId) {
        await admin.from("comments").insert({
          confession_id: confessionId, user_id: userId, content: "self-comment",
        });
        await admin.from("reactions").insert({
          confession_id: confessionId, user_id: userId, type: "like",
        });
      }
      await admin.from("user_follows").insert([
        { follower_id: userId, following_id: peerId },
        { follower_id: peerId, following_id: userId },
      ]);

      const userClient = createClient(SUPABASE_URL, ANON);
      const signIn = await userClient.auth.signInWithPassword({ email, password });
      const token = signIn.data.session!.access_token;

      const res = await callFn({ Authorization: `Bearer ${token}` });
      const body = await res.json();
      assertEquals(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
      assertEquals(body.ok, true);

      // Verify each related row is gone.
      const checks: Array<[string, Promise<{ data: unknown[] | null }>]> = [
        ["profiles", admin.from("profiles").select("id").eq("id", userId).then(r => ({ data: r.data })) as never],
        ["confessions", admin.from("confessions").select("id").eq("user_id", userId).then(r => ({ data: r.data })) as never],
        ["comments", admin.from("comments").select("id").eq("user_id", userId).then(r => ({ data: r.data })) as never],
        ["reactions", admin.from("reactions").select("id").eq("user_id", userId).then(r => ({ data: r.data })) as never],
        ["user_follows(out)", admin.from("user_follows").select("follower_id").eq("follower_id", userId).then(r => ({ data: r.data })) as never],
        ["user_follows(in)", admin.from("user_follows").select("following_id").eq("following_id", userId).then(r => ({ data: r.data })) as never],
      ];
      for (const [label, p] of checks) {
        const { data } = await p;
        assertEquals(data?.length ?? 0, 0, `${label} should be empty after wipe`);
      }

      const authLookup = await admin.auth.admin.getUserById(userId);
      assertEquals(authLookup.data.user, null, "auth.users row should be deleted");
    } finally {
      try { await admin.auth.admin.deleteUser(userId); } catch (_) {}
      try { await admin.auth.admin.deleteUser(peerId); } catch (_) {}
    }
  },
});

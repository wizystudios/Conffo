// RLS bypass tests — verifies that a hostile anon/authenticated client CANNOT:
//   1. Upload an avatar into someone else's folder
//   2. Read comment_likes when not signed in
//   3. Flip is_admin / is_moderator on their own profile
//   4. Read sensitive profile columns (contact_email, contact_phone, date_of_birth) as anon
//
// Run with:  deno test --allow-net --allow-env --allow-read supabase/functions/_rls_tests/rls_test.ts
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function anonClient() {
  return createClient(SUPABASE_URL, ANON);
}
function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE);
}

async function makeUser() {
  const admin = serviceClient();
  const email = `rls-${crypto.randomUUID()}@example.com`;
  const password = "TestPass123!aA";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("user creation failed");
  // sign in to get an access token
  const u = anonClient();
  const { data: s, error: sErr } = await u.auth.signInWithPassword({ email, password });
  if (sErr || !s.session) throw sErr ?? new Error("sign-in failed");
  return { userId: data.user.id, token: s.session.access_token };
}

async function authedClient(token: string) {
  return createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function cleanup(userId: string) {
  await serviceClient().auth.admin.deleteUser(userId).catch(() => {});
}

Deno.test("RLS: cannot upload avatar into another user's folder", async () => {
  const a = await makeUser();
  const b = await makeUser();
  try {
    const client = await authedClient(a.token);
    const blob = new Blob(["pixel"], { type: "image/png" });
    // Try to upload into B's folder
    const { error } = await client.storage
      .from("avatars")
      .upload(`${b.userId}/evil.png`, blob, { upsert: true });
    assert(error, "expected upload to be rejected by RLS, but it succeeded");
    // Upload into own folder must succeed
    const ownPath = `${a.userId}/me.png`;
    const own = await client.storage.from("avatars").upload(ownPath, blob, { upsert: true });
    assertEquals(own.error, null);
    await serviceClient().storage.from("avatars").remove([ownPath]).catch(() => {});
  } finally {
    await cleanup(a.userId);
    await cleanup(b.userId);
  }
});

Deno.test("RLS: anon cannot SELECT from comment_likes", async () => {
  const { data, error } = await anonClient().from("comment_likes").select("*").limit(1);
  // Either an explicit error or an empty array is acceptable — what's NOT acceptable
  // is leaking rows.
  if (!error) assertEquals(data?.length ?? 0, 0, "anon should not receive comment_likes rows");
});

Deno.test("RLS: user cannot escalate is_admin / is_moderator on their own profile", async () => {
  const a = await makeUser();
  try {
    const client = await authedClient(a.token);
    const r1 = await client.from("profiles").update({ is_admin: true }).eq("id", a.userId);
    assert(r1.error, "is_admin self-escalation must be blocked");
    const r2 = await client.from("profiles").update({ is_moderator: true }).eq("id", a.userId);
    assert(r2.error, "is_moderator self-escalation must be blocked");
    const { data } = await serviceClient().from("profiles").select("is_admin,is_moderator").eq("id", a.userId).maybeSingle();
    assertEquals(data?.is_admin ?? false, false);
    assertEquals(data?.is_moderator ?? false, false);
  } finally {
    await cleanup(a.userId);
  }
});

Deno.test("RLS: anon cannot read sensitive profile columns", async () => {
  // contact_email / contact_phone / date_of_birth / birthdate / gender are revoked from anon
  const { error } = await anonClient()
    .from("profiles")
    .select("contact_email,contact_phone,date_of_birth")
    .limit(1);
  assert(error, "anon must be denied sensitive profile columns; got rows back");
});

Deno.test("RLS: anon CANNOT read profiles.is_admin / is_moderator", async () => {
  const { error } = await anonClient().from("profiles").select("is_admin,is_moderator").limit(1);
  assert(error, "anon SELECT of is_admin/is_moderator must be denied by column-level REVOKE");
});

Deno.test("RLS: authenticated user CANNOT read profiles.is_admin / is_moderator", async () => {
  const a = await makeUser();
  try {
    const client = await authedClient(a.token);
    const { error } = await client.from("profiles").select("is_admin,is_moderator").limit(1);
    assert(error, "authenticated SELECT of is_admin/is_moderator must be denied");
  } finally {
    await cleanup(a.userId);
  }
});

Deno.test("RLS: stories.viewed_by is NOT readable by anon or authenticated", async () => {
  // anon
  const anonRes = await anonClient().from("stories").select("viewed_by").limit(1);
  assert(anonRes.error, "anon must be denied stories.viewed_by");
  // authenticated
  const a = await makeUser();
  try {
    const client = await authedClient(a.token);
    const r = await client.from("stories").select("viewed_by").limit(1);
    assert(r.error, "authenticated must be denied stories.viewed_by raw column");
  } finally {
    await cleanup(a.userId);
  }
});

Deno.test("RLS: community member cannot self-insert with role='admin' or 'creator'", async () => {
  const a = await makeUser();
  try {
    const svc = serviceClient();
    // create a throwaway community owned by a different user
    const owner = await makeUser();
    const { data: room } = await svc.from("communities")
      .insert({ name: `t-${crypto.randomUUID()}`, creator_id: owner.userId })
      .select("id").single();
    const client = await authedClient(a.token);
    const evil = await client.from("community_members")
      .insert({ community_id: room!.id, user_id: a.userId, role: "admin" });
    assert(evil.error, "self-join as admin must be blocked");
    const evil2 = await client.from("community_members")
      .insert({ community_id: room!.id, user_id: a.userId, role: "creator" });
    assert(evil2.error, "self-join as creator must be blocked");
    // member join must work
    const ok = await client.from("community_members")
      .insert({ community_id: room!.id, user_id: a.userId, role: "member" });
    assert(!ok.error, `member self-join should succeed: ${ok.error?.message}`);
    await svc.from("communities").delete().eq("id", room!.id);
    await cleanup(owner.userId);
  } finally {
    await cleanup(a.userId);
  }
});

Deno.test("RLS: non-admin authenticated user cannot read password_reset_audit", async () => {
  const a = await makeUser();
  try {
    const client = await authedClient(a.token);
    const { data, error } = await client.from("password_reset_audit").select("id").limit(1);
    // Either RLS rejects or returns empty — both acceptable, what we MUST avoid is leaking rows.
    assert(error || (data ?? []).length === 0, "non-admin must not see audit rows");
  } finally {
    await cleanup(a.userId);
  }
});

Deno.test("RLS: password_reset_audit rows are immutable (UPDATE/DELETE blocked even for service_role)", async () => {
  const svc = serviceClient();
  const ins = await svc.from("password_reset_audit").insert({
    target_email: `imm-${crypto.randomUUID()}@example.com`,
    method: "email_link",
    delivery_status: "sent",
  }).select("id").single();
  assert(!ins.error, `seed insert failed: ${ins.error?.message}`);
  const upd = await svc.from("password_reset_audit").update({ delivery_status: "failed" }).eq("id", ins.data!.id);
  assert(upd.error, "audit UPDATE must be blocked by trigger");
  const del = await svc.from("password_reset_audit").delete().eq("id", ins.data!.id);
  assert(del.error, "audit DELETE must be blocked by trigger");
});

Deno.test("RLS: admin_moderation_audit rows are immutable", async () => {
  const svc = serviceClient();
  const fakeAdmin = crypto.randomUUID();
  const ins = await svc.from("admin_moderation_audit").insert({
    admin_id: fakeAdmin, action: "dismiss", details: { test: true },
  }).select("id").single();
  assert(!ins.error, `seed insert failed: ${ins.error?.message}`);
  const upd = await svc.from("admin_moderation_audit").update({ action: "delete" }).eq("id", ins.data!.id);
  assert(upd.error, "moderation audit UPDATE must be blocked");
  const del = await svc.from("admin_moderation_audit").delete().eq("id", ins.data!.id);
  assert(del.error, "moderation audit DELETE must be blocked");
});

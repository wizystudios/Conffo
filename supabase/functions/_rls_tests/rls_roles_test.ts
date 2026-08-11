// Per-role RLS regression tests for sensitive columns and relations.
// Verifies behavior across three roles:
//   - anon (no session)
//   - authenticated (regular signed-in user)
//   - admin (profile.is_admin = true, promoted via service_role)
//
// Sensitive surfaces covered:
//   - profiles: is_admin, is_moderator, contact_email, contact_phone, date_of_birth,
//               birthdate, gender, location, privacy_settings
//   - stories.viewed_by
//   - user_activity_log (self read + ip_address column)
//   - password_reset_audit and admin_moderation_audit read
//
// Run with:
//   deno test --allow-net --allow-env --allow-read supabase/functions/_rls_tests/rls_roles_test.ts
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function anonClient() { return createClient(SUPABASE_URL, ANON); }
function serviceClient() { return createClient(SUPABASE_URL, SERVICE); }

async function makeUser(opts: { admin?: boolean } = {}): Promise<{ id: string; token: string; email: string }> {
  const admin = serviceClient();
  const email = `rls-${crypto.randomUUID()}@example.com`;
  const password = "TestPass123!aA";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  if (opts.admin) {
    // Bypass the escalation trigger via service_role (auth.uid() IS NULL branch).
    const { error: pErr } = await admin.from("profiles").upsert({ id: data.user.id, is_admin: true });
    if (pErr) throw pErr;
  }
  const u = anonClient();
  const { data: s, error: sErr } = await u.auth.signInWithPassword({ email, password });
  if (sErr || !s.session) throw sErr ?? new Error("sign-in failed");
  return { id: data.user.id, token: s.session.access_token, email };
}

function tokenClient(token: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
}

async function cleanup(id: string) {
  await serviceClient().auth.admin.deleteUser(id).catch(() => {});
}

// ────────────────────────────────────────────────────────────────
// Sensitive profile columns per role
// ────────────────────────────────────────────────────────────────

const SENSITIVE_PROFILE_COLS = [
  "is_admin", "is_moderator",
  "contact_email", "contact_phone",
  "date_of_birth", "birthdate", "gender", "location",
  "privacy_settings",
];

for (const col of SENSITIVE_PROFILE_COLS) {
  Deno.test(`RLS: anon CANNOT read profiles.${col}`, async () => {
    const { error } = await anonClient().from("profiles").select(col).limit(1);
    assert(error, `anon must be denied profiles.${col}, got rows back`);
  });

  Deno.test(`RLS: authenticated user CANNOT read profiles.${col} of another user`, async () => {
    const u = await makeUser();
    try {
      const { error } = await tokenClient(u.token).from("profiles").select(col).limit(1);
      assert(error, `authenticated must be denied profiles.${col}`);
    } finally { await cleanup(u.id); }
  });
}

Deno.test("RLS: authenticated user CAN read their own non-sensitive profile columns", async () => {
  const u = await makeUser();
  try {
    const { data, error } = await tokenClient(u.token)
      .from("profiles").select("id,username,avatar_url,is_public").eq("id", u.id).maybeSingle();
    assert(!error, `own profile read must succeed: ${error?.message}`);
    assert(data, "own profile row must be returned");
  } finally { await cleanup(u.id); }
});

Deno.test("RLS: admin CANNOT bypass column-level revoke on profiles.is_admin via direct SELECT", async () => {
  // Column-level REVOKEs apply to the SQL role, not the app-level admin flag.
  // Admins must use security-definer RPCs (is_current_user_admin, list_users_admin) to see privileged columns.
  const admin = await makeUser({ admin: true });
  try {
    const { error } = await tokenClient(admin.token).from("profiles").select("is_admin").limit(1);
    assert(error, "admin direct SELECT of profiles.is_admin must still be blocked at the column level");
  } finally { await cleanup(admin.id); }
});

Deno.test("RLS: admin can call is_current_user_admin RPC and gets true", async () => {
  const admin = await makeUser({ admin: true });
  try {
    // deno-lint-ignore no-explicit-any
    const { data, error } = await (tokenClient(admin.token).rpc as any)("is_current_user_admin");
    assert(!error, `RPC must succeed: ${error?.message}`);
    assert(data === true, "is_current_user_admin must return true for admin");
  } finally { await cleanup(admin.id); }
});

// ────────────────────────────────────────────────────────────────
// stories.viewed_by
// ────────────────────────────────────────────────────────────────

Deno.test("RLS: anon CANNOT read stories.viewed_by", async () => {
  const { error } = await anonClient().from("stories").select("viewed_by").limit(1);
  assert(error, "anon must be denied stories.viewed_by");
});

Deno.test("RLS: authenticated (non-owner) CANNOT read stories.viewed_by", async () => {
  const u = await makeUser();
  try {
    const { error } = await tokenClient(u.token).from("stories").select("viewed_by").limit(1);
    assert(error, "authenticated must be denied stories.viewed_by");
  } finally { await cleanup(u.id); }
});

// ────────────────────────────────────────────────────────────────
// user_activity_log
// ────────────────────────────────────────────────────────────────

Deno.test("RLS: user CAN read their own activity log rows (self-read policy)", async () => {
  const u = await makeUser();
  try {
    const svc = serviceClient();
    await svc.from("user_activity_log").insert({ user_id: u.id, activity_type: "test", details: { ok: true } });
    const { data, error } = await tokenClient(u.token)
      .from("user_activity_log").select("id,activity_type,user_id").eq("user_id", u.id);
    assert(!error, `self read must succeed: ${error?.message}`);
    assert((data ?? []).length >= 1, "user must see their own activity rows");
  } finally { await cleanup(u.id); }
});

Deno.test("RLS: user CANNOT read another user's activity log rows", async () => {
  const a = await makeUser();
  const b = await makeUser();
  try {
    const svc = serviceClient();
    await svc.from("user_activity_log").insert({ user_id: b.id, activity_type: "test-other", details: {} });
    const { data } = await tokenClient(a.token)
      .from("user_activity_log").select("id,user_id").eq("user_id", b.id);
    assert((data ?? []).length === 0, "user must not see another user's activity rows");
  } finally { await cleanup(a.id); await cleanup(b.id); }
});

Deno.test("RLS: user CANNOT read ip_address column on activity log (column-level REVOKE)", async () => {
  const u = await makeUser();
  try {
    const svc = serviceClient();
    await svc.from("user_activity_log").insert({ user_id: u.id, activity_type: "ip-test", ip_address: "127.0.0.1" });
    const { error } = await tokenClient(u.token).from("user_activity_log").select("ip_address").eq("user_id", u.id);
    assert(error, "ip_address must be denied to authenticated role");
  } finally { await cleanup(u.id); }
});

// ────────────────────────────────────────────────────────────────
// Audit tables
// ────────────────────────────────────────────────────────────────

Deno.test("RLS: anon CANNOT read password_reset_audit", async () => {
  const { data, error } = await anonClient().from("password_reset_audit").select("id").limit(1);
  assert(error || (data ?? []).length === 0, "anon must not receive audit rows");
});

Deno.test("RLS: anon CANNOT read admin_moderation_audit", async () => {
  const { data, error } = await anonClient().from("admin_moderation_audit").select("id").limit(1);
  assert(error || (data ?? []).length === 0, "anon must not receive audit rows");
});

Deno.test("RLS: regular authenticated user CANNOT read admin_moderation_audit", async () => {
  const u = await makeUser();
  try {
    const { data, error } = await tokenClient(u.token).from("admin_moderation_audit").select("id").limit(1);
    assert(error || (data ?? []).length === 0, "non-admin must not see moderation audit rows");
  } finally { await cleanup(u.id); }
});

// ────────────────────────────────────────────────────────────────
// Follows (user_follows / room_follows)
// ────────────────────────────────────────────────────────────────

Deno.test("RLS: anon CANNOT insert a room follow", async () => {
  const { error } = await anonClient()
    .from("room_follows").insert({ room_id: "random", user_id: crypto.randomUUID() });
  assert(error, "anon must not be able to follow a room");
});

Deno.test("RLS: user CANNOT create a room follow on behalf of another user", async () => {
  const a = await makeUser();
  const b = await makeUser();
  try {
    const { error } = await tokenClient(a.token)
      .from("room_follows").insert({ room_id: "random", user_id: b.id });
    assert(error, "spoofed user_id on room_follows must be rejected");
  } finally { await cleanup(a.id); await cleanup(b.id); }
});

Deno.test("RLS: user CAN follow a room for themselves and only sees their own follows", async () => {
  const a = await makeUser();
  const b = await makeUser();
  try {
    const ca = tokenClient(a.token);
    const { error: insErr } = await ca.from("room_follows").insert({ room_id: "random", user_id: a.id });
    assert(!insErr, `self follow must succeed: ${insErr?.message}`);
    await serviceClient().from("room_follows").insert({ room_id: "random", user_id: b.id });
    const { data } = await ca.from("room_follows").select("user_id");
    assert((data ?? []).every((r) => r.user_id === a.id), "user must only see their own room follows");
  } finally { await cleanup(a.id); await cleanup(b.id); }
});

Deno.test("RLS: user CANNOT create a user_follow with a spoofed follower_id", async () => {
  const a = await makeUser();
  const b = await makeUser();
  try {
    const { error } = await tokenClient(a.token)
      .from("user_follows").insert({ follower_id: b.id, following_id: a.id });
    assert(error, "spoofed follower_id must be rejected");
  } finally { await cleanup(a.id); await cleanup(b.id); }
});

Deno.test("RLS: user CANNOT delete another user's follow edge", async () => {
  const a = await makeUser();
  const b = await makeUser();
  try {
    const svc = serviceClient();
    await svc.from("user_follows").insert({ follower_id: b.id, following_id: a.id });
    await tokenClient(a.token).from("user_follows").delete().eq("follower_id", b.id).eq("following_id", a.id);
    const { data } = await svc.from("user_follows").select("id")
      .eq("follower_id", b.id).eq("following_id", a.id);
    assert((data ?? []).length === 1, "another user's follow edge must survive");
  } finally { await cleanup(a.id); await cleanup(b.id); }
});

// ────────────────────────────────────────────────────────────────
// Room permissions
// ────────────────────────────────────────────────────────────────

Deno.test("RLS: anon CAN read rooms (public catalog) but CANNOT insert", async () => {
  const c = anonClient();
  const { error: readErr } = await c.from("rooms").select("id,name").limit(1);
  assert(!readErr, `rooms must be publicly readable: ${readErr?.message}`);
  const { error: insErr } = await c.from("rooms")
    .insert({ id: `t-${crypto.randomUUID()}`, name: "x", description: "x" });
  assert(insErr, "anon must not create rooms");
});

Deno.test("RLS: regular authenticated user CANNOT create, update or delete rooms", async () => {
  const u = await makeUser();
  const id = `t-${crypto.randomUUID()}`;
  try {
    const c = tokenClient(u.token);
    const { error: insErr } = await c.from("rooms").insert({ id, name: "x", description: "x" });
    assert(insErr, "non-admin must not create rooms");

    await serviceClient().from("rooms").insert({ id, name: "temp", description: "temp" });
    await c.from("rooms").update({ name: "hacked" }).eq("id", id);
    const { data } = await serviceClient().from("rooms").select("name").eq("id", id).maybeSingle();
    assert(data?.name === "temp", "non-admin must not update rooms");

    await c.from("rooms").delete().eq("id", id);
    const { data: still } = await serviceClient().from("rooms").select("id").eq("id", id);
    assert((still ?? []).length === 1, "non-admin must not delete rooms");
  } finally {
    await serviceClient().from("rooms").delete().eq("id", id);
    await cleanup(u.id);
  }
});

// ────────────────────────────────────────────────────────────────
// Confession visibility by room + ownership
// ────────────────────────────────────────────────────────────────

async function seedConfession(userId: string, room = "random"): Promise<string> {
  const svc = serviceClient();
  const { data, error } = await svc.from("confessions")
    .insert({ content: `rls-${crypto.randomUUID()}`, room_id: room, user_id: userId })
    .select("id").single();
  if (error) throw error;
  return data.id as string;
}

Deno.test("RLS: confessions are readable per room by anon and authenticated", async () => {
  const owner = await makeUser();
  let id = "";
  try {
    id = await seedConfession(owner.id, "random");
    const { data: anonRows, error: anonErr } = await anonClient()
      .from("confessions").select("id,room_id").eq("room_id", "random").limit(50);
    assert(!anonErr, `room-scoped read must work for anon: ${anonErr?.message}`);
    assert((anonRows ?? []).every((r) => r.room_id === "random"), "room filter must hold");

    const { data: authRows, error: authErr } = await tokenClient(owner.token)
      .from("confessions").select("id").eq("id", id);
    assert(!authErr && (authRows ?? []).length === 1, "authenticated must read the confession");
  } finally {
    if (id) await serviceClient().from("confessions").delete().eq("id", id);
    await cleanup(owner.id);
  }
});

Deno.test("RLS: user CANNOT edit or delete another user's confession", async () => {
  const owner = await makeUser();
  const other = await makeUser();
  let id = "";
  try {
    id = await seedConfession(owner.id);
    const c = tokenClient(other.token);
    await c.from("confessions").update({ content: "hijacked" }).eq("id", id);
    const svc = serviceClient();
    const { data } = await svc.from("confessions").select("content").eq("id", id).maybeSingle();
    assert(data?.content !== "hijacked", "non-owner must not update a confession");

    await c.from("confessions").delete().eq("id", id);
    const { data: still } = await svc.from("confessions").select("id").eq("id", id);
    assert((still ?? []).length === 1, "non-owner must not delete a confession");
  } finally {
    if (id) await serviceClient().from("confessions").delete().eq("id", id);
    await cleanup(owner.id); await cleanup(other.id);
  }
});

Deno.test("RLS: user CANNOT insert a confession attributed to another user", async () => {
  const a = await makeUser();
  const b = await makeUser();
  try {
    const { error } = await tokenClient(a.token)
      .from("confessions").insert({ content: "spoof", room_id: "random", user_id: b.id });
    assert(error, "spoofed confession author must be rejected");
  } finally { await cleanup(a.id); await cleanup(b.id); }
});

// ────────────────────────────────────────────────────────────────
// Moderation actions (reports + audit) per role
// ────────────────────────────────────────────────────────────────

Deno.test("RLS: reporter CAN file a report but CANNOT resolve it", async () => {
  const reporter = await makeUser();
  const owner = await makeUser();
  let confessionId = "";
  try {
    confessionId = await seedConfession(owner.id);
    const c = tokenClient(reporter.token);
    const { data, error } = await c.from("reports")
      .insert({ item_type: "confession", item_id: confessionId, reason: "spam", user_id: reporter.id })
      .select("id").single();
    assert(!error, `report insert must succeed: ${error?.message}`);

    await c.from("reports").update({ resolved: true }).eq("id", data!.id);
    const { data: row } = await serviceClient().from("reports").select("resolved").eq("id", data!.id).maybeSingle();
    assert(row?.resolved === false, "non-admin must not resolve reports");
  } finally {
    if (confessionId) await serviceClient().from("confessions").delete().eq("id", confessionId);
    await cleanup(reporter.id); await cleanup(owner.id);
  }
});

Deno.test("RLS: regular user CANNOT ban another user via profiles.banned_until", async () => {
  const a = await makeUser();
  const b = await makeUser();
  try {
    await tokenClient(a.token).from("profiles")
      .update({ banned_until: new Date(Date.now() + 864e5).toISOString() }).eq("id", b.id);
    const { data } = await serviceClient().from("profiles").select("banned_until").eq("id", b.id).maybeSingle();
    assert(!data?.banned_until, "non-admin must not ban other users");
  } finally { await cleanup(a.id); await cleanup(b.id); }
});

Deno.test("RLS: nobody can write or mutate admin_moderation_audit from a client role", async () => {
  const admin = await makeUser({ admin: true });
  try {
    const { error: insErr } = await tokenClient(admin.token).from("admin_moderation_audit")
      .insert({ admin_id: admin.id, action: "forged" });
    assert(insErr, "client roles must not insert moderation audit rows");

    const svc = serviceClient();
    const { data: seeded } = await svc.from("admin_moderation_audit")
      .insert({ admin_id: admin.id, action: "seeded" }).select("id").single();
    const { error: updErr } = await svc.from("admin_moderation_audit")
      .update({ action: "tampered" }).eq("id", seeded!.id);
    assert(updErr, "audit rows must be immutable even for service_role");
  } finally { await cleanup(admin.id); }
});

Deno.test("RLS: device link + recovery code tables are unreachable from client roles", async () => {
  const u = await makeUser();
  try {
    for (const table of ["device_link_codes", "account_recovery_codes"]) {
      const { data: anonData, error: anonErr } = await anonClient().from(table).select("id").limit(1);
      assert(anonErr || (anonData ?? []).length === 0, `anon must not read ${table}`);
      const { data: authData, error: authErr } = await tokenClient(u.token).from(table).select("id").limit(1);
      assert(authErr || (authData ?? []).length === 0, `authenticated must not read ${table}`);
    }
  } finally { await cleanup(u.id); }
});

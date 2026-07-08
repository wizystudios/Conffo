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

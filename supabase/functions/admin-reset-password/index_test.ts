// E2E tests for the rate-limited, super-admin-only password reset endpoint.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/admin-reset-password`;

function svc() { return createClient(SUPABASE_URL, SERVICE); }

async function makeUser(opts: { admin?: boolean } = {}) {
  const a = svc();
  const email = `prw-${crypto.randomUUID()}@example.com`;
  const password = "TestPass123!aA";
  const { data, error } = await a.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("create failed");
  if (opts.admin) await a.from("profiles").upsert({ id: data.user.id, is_admin: true });
  const u = createClient(SUPABASE_URL, ANON);
  const { data: s } = await u.auth.signInWithPassword({ email, password });
  return { userId: data.user.id, email, token: s!.session!.access_token };
}
async function cleanup(id: string) { await svc().auth.admin.deleteUser(id).catch(() => {}); }

async function call(token: string | null, body: unknown) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

Deno.test("admin-reset-password: unauthenticated -> 401", async () => {
  const r = await call(null, { action: "send_link", email: "x@x.com" });
  assertEquals(r.status, 401);
});

Deno.test("admin-reset-password: non-admin -> 403 and audit row written with forbidden", async () => {
  const u = await makeUser();
  try {
    const r = await call(u.token, { action: "send_link", email: u.email });
    assertEquals(r.status, 403);
    const { data } = await svc().from("password_reset_audit")
      .select("delivery_status,error")
      .eq("requestor_id", u.userId)
      .order("created_at", { ascending: false }).limit(1);
    assertEquals(data?.[0]?.delivery_status, "forbidden");
  } finally {
    await cleanup(u.userId);
  }
});

Deno.test("admin-reset-password: admin can send link and audit row records 'sent'", async () => {
  const admin = await makeUser({ admin: true });
  const target = await makeUser();
  try {
    const r = await call(admin.token, { action: "send_link", email: target.email });
    assertEquals(r.status, 200);
    const { data } = await svc().from("password_reset_audit")
      .select("delivery_status,target_email,method")
      .eq("requestor_id", admin.userId)
      .order("created_at", { ascending: false }).limit(1);
    assertEquals(data?.[0]?.delivery_status, "sent");
    assertEquals(data?.[0]?.target_email, target.email);
    assertEquals(data?.[0]?.method, "email_link");
  } finally {
    await cleanup(admin.userId);
    await cleanup(target.userId);
  }
});

Deno.test("admin-reset-password: rate limit kicks in after 5 attempts in 10 min", async () => {
  const admin = await makeUser({ admin: true });
  const target = await makeUser();
  try {
    // 5 allowed, 6th should be 429
    for (let i = 0; i < 5; i++) {
      const r = await call(admin.token, { action: "send_link", email: target.email });
      assert(r.status === 200, `attempt ${i} expected 200, got ${r.status}`);
    }
    const r6 = await call(admin.token, { action: "send_link", email: target.email });
    assertEquals(r6.status, 429);
  } finally {
    await cleanup(admin.userId);
    await cleanup(target.userId);
  }
});

// Super-admin-only password reset endpoint.
//
// Security controls:
//   1. Requires a valid JWT
//   2. Caller must have profiles.is_admin = true (source of truth)
//   3. Per-requestor + per-IP rate limit (max 5 attempts / 10 min, 20 / hour)
//   4. Every attempt — including forbidden/rate-limited — is written to
//      public.password_reset_audit so admins can see abuse patterns.
//
// Two operations are supported:
//   { action: "send_link", email }            -> sends a reset email
//   { action: "set_password", userId, password } -> directly sets a new password
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMITS = [
  { windowMs: 10 * 60 * 1000, max: 5 },   // 5 per 10 minutes per bucket
  { windowMs: 60 * 60 * 1000, max: 20 },  // 20 per hour per bucket
];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent = req.headers.get("user-agent") ?? null;

  async function audit(row: {
    requestor_id?: string | null;
    requestor_email?: string | null;
    target_user_id?: string | null;
    target_email: string;
    method: "email_link" | "admin_set_password";
    delivery_status: "sent" | "failed" | "rate_limited" | "forbidden";
    error?: string | null;
  }) {
    await admin
      .from("password_reset_audit")
      .insert({ ...row, ip_address: ip, user_agent: userAgent })
      .then(() => undefined, () => undefined);
  }

  // 1. Authn
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "unauthorized" });
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "unauthorized" });

  // 2. Authz — super admin only
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();

  let body: { action?: string; email?: string; userId?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const method = body.action === "set_password" ? "admin_set_password" : "email_link";
  const targetEmail = (body.email ?? "").trim().toLowerCase();

  if (!profile?.is_admin) {
    await audit({
      requestor_id: userData.user.id,
      requestor_email: userData.user.email,
      target_email: targetEmail || "(unknown)",
      method,
      delivery_status: "forbidden",
      error: "not_admin",
    });
    return json(403, { error: "forbidden" });
  }

  // 3. Rate limit (per requestor + per IP)
  const now = new Date();
  const buckets = [`user:${userData.user.id}`, `ip:${ip}`];
  for (const window of RATE_LIMITS) {
    const since = new Date(now.getTime() - window.windowMs).toISOString();
    for (const bucket of buckets) {
      const { count } = await admin
        .from("admin_action_rate_limits")
        .select("id", { count: "exact", head: true })
        .eq("action", "admin_reset_password")
        .eq("bucket_key", bucket)
        .gte("attempted_at", since);
      if ((count ?? 0) >= window.max) {
        await audit({
          requestor_id: userData.user.id,
          requestor_email: userData.user.email,
          target_email: targetEmail || "(unknown)",
          method,
          delivery_status: "rate_limited",
          error: `bucket=${bucket}`,
        });
        return json(429, { error: "rate_limited" });
      }
    }
  }
  await admin.from("admin_action_rate_limits").insert(
    buckets.map((b) => ({ action: "admin_reset_password", bucket_key: b })),
  );

  // 4. Execute action
  try {
    if (body.action === "set_password") {
      if (!body.userId || !body.password || body.password.length < 8) {
        return json(400, { error: "missing_fields" });
      }
      const r = await admin.auth.admin.updateUserById(body.userId, { password: body.password });
      if (r.error) throw r.error;
      await audit({
        requestor_id: userData.user.id,
        requestor_email: userData.user.email,
        target_user_id: body.userId,
        target_email: r.data.user?.email ?? "(unknown)",
        method,
        delivery_status: "sent",
      });
      return json(200, { ok: true });
    } else {
      if (!targetEmail) return json(400, { error: "missing_email" });
      const { data: link, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: targetEmail,
      });
      if (error) throw error;
      await audit({
        requestor_id: userData.user.id,
        requestor_email: userData.user.email,
        target_user_id: link.user?.id ?? null,
        target_email: targetEmail,
        method,
        delivery_status: "sent",
      });
      return json(200, { ok: true });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await audit({
      requestor_id: userData.user.id,
      requestor_email: userData.user.email,
      target_email: targetEmail || "(unknown)",
      method,
      delivery_status: "failed",
      error: msg,
    });
    return json(500, { error: msg });
  }
});

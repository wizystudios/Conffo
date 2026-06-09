// Admin moderation endpoint. Verifies JWT, checks profiles.is_admin server-side
// (the source of truth), then executes the requested action with the service role.
// Client-side checks are never trusted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | { action: "dismiss"; reportId: string }
  | { action: "delete"; reportId: string; confessionId: string }
  | { action: "warn"; userId: string; reason: string }
  | { action: "temp_ban"; userId: string; untilIso: string };

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

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "unauthorized" });

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "unauthorized" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  // Source of truth: profiles.is_admin — never trust client claims.
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profErr) return json(500, { error: "profile_lookup_failed" });
  if (!profile?.is_admin) return json(403, { error: "forbidden" });

  let body: Action;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const adminId = userData.user.id;
  const nowIso = new Date().toISOString();

  try {
    switch (body.action) {
      case "dismiss": {
        if (!body.reportId) return json(400, { error: "missing_reportId" });
        const { error } = await admin
          .from("reports")
          .update({ resolved: true, resolved_at: nowIso, resolved_by: adminId })
          .eq("id", body.reportId);
        if (error) throw error;
        break;
      }
      case "delete": {
        if (!body.reportId || !body.confessionId) return json(400, { error: "missing_ids" });
        const d = await admin.from("confessions").delete().eq("id", body.confessionId);
        if (d.error) throw d.error;
        const u = await admin
          .from("reports")
          .update({ resolved: true, resolved_at: nowIso, resolved_by: adminId })
          .eq("id", body.reportId);
        if (u.error) throw u.error;
        break;
      }
      case "warn": {
        if (!body.userId || !body.reason) return json(400, { error: "missing_fields" });
        const { error } = await admin.from("notifications").insert({
          user_id: body.userId,
          type: "moderation_warning",
          content: `Warning from moderators: ${body.reason}`,
        });
        if (error) throw error;
        break;
      }
      case "temp_ban": {
        if (!body.userId || !body.untilIso) return json(400, { error: "missing_fields" });
        const { error } = await admin
          .from("profiles")
          .update({ banned_until: body.untilIso })
          .eq("id", body.userId);
        if (error) throw error;
        break;
      }
      default:
        return json(400, { error: "unknown_action" });
    }
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }

  // Audit trail — both the legacy activity log and the new immutable moderation audit.
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;
  await admin.from("user_activity_log").insert({
    user_id: adminId,
    activity_type: "moderation_action",
    details: body as unknown as Record<string, unknown>,
  }).then(() => undefined, () => undefined);
  await admin.from("admin_moderation_audit").insert({
    admin_id: adminId,
    admin_email: userData.user.email,
    action: body.action,
    target_user_id: "userId" in body ? body.userId : null,
    target_content_id: "confessionId" in body ? body.confessionId : null,
    details: body as unknown as Record<string, unknown>,
    ip_address: ip,
  }).then(() => undefined, () => undefined);

  return json(200, { ok: true });
});

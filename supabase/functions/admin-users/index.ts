// Admin user management endpoint. Verifies JWT, checks profiles.is_admin server-side,
// then performs the requested privileged action with the service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | { action: "ban"; userId: string; untilIso?: string; reason?: string }
  | { action: "unban"; userId: string }
  | { action: "promote_admin"; userId: string }
  | { action: "demote_admin"; userId: string }
  | { action: "promote_moderator"; userId: string }
  | { action: "demote_moderator"; userId: string }
  | { action: "verify"; userId: string }
  | { action: "unverify"; userId: string };

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
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile?.is_admin) return json(403, { error: "forbidden" });

  let body: Action;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (!("userId" in body) || !body.userId) return json(400, { error: "missing_userId" });
  if (body.userId === userData.user.id && body.action.startsWith("demote")) {
    return json(400, { error: "cannot_self_demote" });
  }

  const adminId = userData.user.id;
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;

  try {
    switch (body.action) {
      case "ban": {
        const until = body.untilIso ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await admin.from("profiles").update({ banned_until: until }).eq("id", body.userId);
        if (error) throw error;
        break;
      }
      case "unban": {
        const { error } = await admin.from("profiles").update({ banned_until: null }).eq("id", body.userId);
        if (error) throw error;
        break;
      }
      case "promote_admin": {
        const { error } = await admin.from("profiles").update({ is_admin: true }).eq("id", body.userId);
        if (error) throw error;
        break;
      }
      case "demote_admin": {
        const { error } = await admin.from("profiles").update({ is_admin: false }).eq("id", body.userId);
        if (error) throw error;
        break;
      }
      case "promote_moderator": {
        const { error } = await admin.from("profiles").update({ is_moderator: true }).eq("id", body.userId);
        if (error) throw error;
        break;
      }
      case "demote_moderator": {
        const { error } = await admin.from("profiles").update({ is_moderator: false }).eq("id", body.userId);
        if (error) throw error;
        break;
      }
      case "verify": {
        const { error } = await admin.from("profiles").update({
          is_verified: true,
          verification_date: new Date().toISOString(),
          verification_type: "admin_approved",
        }).eq("id", body.userId);
        if (error) throw error;
        break;
      }
      case "unverify": {
        const { error } = await admin.from("profiles").update({
          is_verified: false,
          verification_date: null,
          verification_type: null,
        }).eq("id", body.userId);
        if (error) throw error;
        break;
      }
      default:
        return json(400, { error: "unknown_action" });
    }
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }

  await admin.from("admin_moderation_audit").insert({
    admin_id: adminId,
    admin_email: userData.user.email,
    action: body.action,
    target_user_id: body.userId,
    details: body as unknown as Record<string, unknown>,
    ip_address: ip,
  }).then(() => undefined, () => undefined);

  return json(200, { ok: true });
});

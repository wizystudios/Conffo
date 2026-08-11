// Device linking + anonymous account recovery.
//
// Flows:
//  1. create_code   (authenticated) -> short one-time code + QR payload, 10 min TTL.
//  2. claim_code    (anon)          -> exchanges a valid code for a Supabase session
//                                      (magic-link token_hash the client verifies).
//  3. gen_recovery  (authenticated) -> generates one-time recovery codes (hashed at rest,
//                                      plaintext returned exactly once).
//  4. redeem_recovery (anon)        -> exchanges a recovery code for a session token_hash.
//
// Codes are single-use and short-lived. Only this function (service_role) can read or
// write public.device_link_codes / public.account_recovery_codes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const svc = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// Unambiguous alphabet (no 0/O/1/I) so codes are easy to read out loud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes).map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function requireUser(req: Request): Promise<{ id: string; email: string | null } | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/** Mint a one-time magic-link token the new device can exchange for a session. */
async function mintSessionToken(userId: string): Promise<{ token_hash: string; email: string } | { error: string }> {
  const admin = svc();
  const { data: userRes, error: uErr } = await admin.auth.admin.getUserById(userId);
  if (uErr || !userRes.user?.email) return { error: "account has no email to link with" };
  const email = userRes.user.email;
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data?.properties?.hashed_token) return { error: error?.message ?? "could not mint session" };
  return { token_hash: data.properties.hashed_token, email };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: { action?: string; code?: string; device_label?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const action = String(body.action ?? "");
  const admin = svc();

  // ── 1. create a link code (must be signed in on the trusted device) ──
  if (action === "create_code") {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    // Invalidate any earlier pending codes for this user.
    await admin.from("device_link_codes").update({ status: "expired" })
      .eq("user_id", user.id).eq("status", "pending");

    const code = randomCode(8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await admin.from("device_link_codes").insert({
      code,
      user_id: user.id,
      status: "pending",
      device_label: typeof body.device_label === "string" ? body.device_label.slice(0, 120) : null,
      expires_at: expiresAt,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ code, expires_at: expiresAt });
  }

  // ── 2. claim a link code from the new device (no session yet) ──
  if (action === "claim_code") {
    const code = String(body.code ?? "").toUpperCase().replace(/[^A-Z2-9]/g, "");
    if (code.length !== 8) return json({ error: "invalid code" }, 400);

    const { data: row } = await admin.from("device_link_codes")
      .select("id,user_id,status,expires_at").eq("code", code).maybeSingle();
    if (!row || row.status !== "pending" || !row.user_id) return json({ error: "code not found or already used" }, 404);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await admin.from("device_link_codes").update({ status: "expired" }).eq("id", row.id);
      return json({ error: "code expired" }, 410);
    }

    const minted = await mintSessionToken(row.user_id);
    if ("error" in minted) return json({ error: minted.error }, 500);

    await admin.from("device_link_codes")
      .update({ status: "claimed", claimed_at: new Date().toISOString() }).eq("id", row.id);
    await admin.from("user_activity_log").insert({
      user_id: row.user_id, activity_type: "device_linked", details: { method: "link_code" },
    }).then(() => {}, () => {});

    return json({ token_hash: minted.token_hash, email: minted.email });
  }

  // ── 3. generate recovery codes (signed in) ──
  if (action === "gen_recovery") {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);
    const count = Math.min(Math.max(Number(body.count ?? 5), 1), 10);

    // Rotating recovery codes invalidates the previous unused set.
    await admin.from("account_recovery_codes").delete().eq("user_id", user.id).is("used_at", null);

    const codes: string[] = [];
    const rows: Array<{ user_id: string; code_hash: string }> = [];
    for (let i = 0; i < count; i++) {
      const plain = `${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;
      codes.push(plain);
      rows.push({ user_id: user.id, code_hash: await sha256(plain) });
    }
    const { error } = await admin.from("account_recovery_codes").insert(rows);
    if (error) return json({ error: error.message }, 500);
    return json({ codes });
  }

  // ── 4. redeem a recovery code from a new device (no session) ──
  if (action === "redeem_recovery") {
    const raw = String(body.code ?? "").toUpperCase().replace(/[^A-Z2-9-]/g, "");
    if (raw.length < 12) return json({ error: "invalid recovery code" }, 400);
    const hash = await sha256(raw);

    const { data: row } = await admin.from("account_recovery_codes")
      .select("id,user_id,used_at").eq("code_hash", hash).is("used_at", null).maybeSingle();
    if (!row) return json({ error: "recovery code not found or already used" }, 404);

    const minted = await mintSessionToken(row.user_id);
    if ("error" in minted) return json({ error: minted.error }, 500);

    await admin.from("account_recovery_codes")
      .update({ used_at: new Date().toISOString() }).eq("id", row.id);
    await admin.from("user_activity_log").insert({
      user_id: row.user_id, activity_type: "account_recovered", details: { method: "recovery_code" },
    }).then(() => {}, () => {});

    return json({ token_hash: minted.token_hash, email: minted.email });
  }

  return json({ error: "unknown action" }, 400);
});

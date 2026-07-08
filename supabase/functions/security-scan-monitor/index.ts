// Security scan monitor: accepts a POST of Supabase linter findings from CI,
// diffs against the security_scan_snapshots table, and alerts on NEW findings
// via public.admin_alerts and (if RESEND_API_KEY is configured) email.
//
// Auth: requires a shared bearer token in the SECURITY_SCAN_MONITOR_TOKEN env var
// so only CI (or an admin invoking with the token) can push findings.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Finding = {
  id?: string;
  name: string;
  level: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SCAN_TOKEN = Deno.env.get("SECURITY_SCAN_MONITOR_TOKEN") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const ALERT_TO = Deno.env.get("SECURITY_ALERT_EMAIL") ?? "";
const ALERT_FROM = Deno.env.get("SECURITY_ALERT_FROM") ?? "onboarding@resend.dev";

async function fingerprint(f: Finding): Promise<string> {
  const s = `${f.id ?? ""}::${f.name}::${f.level}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendEmail(subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  if (!ALERT_TO) return { sent: false, reason: "SECURITY_ALERT_EMAIL not set" };
  if (RESEND_KEY && LOVABLE_KEY) {
    try {
      const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_KEY}`,
          "X-Connection-Api-Key": RESEND_KEY,
        },
        body: JSON.stringify({ from: ALERT_FROM, to: [ALERT_TO], subject, html }),
      });
      if (!r.ok) return { sent: false, reason: `resend ${r.status}: ${await r.text()}` };
      return { sent: true };
    } catch (e) {
      return { sent: false, reason: String(e) };
    }
  }
  return { sent: false, reason: "RESEND_API_KEY not configured (admin_alerts row still written)" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!SCAN_TOKEN || token !== SCAN_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { findings?: Finding[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const findings = Array.isArray(body.findings) ? body.findings : [];
  if (findings.length === 0) {
    return new Response(JSON.stringify({ ok: true, new: 0, seen: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date().toISOString();

  // Hash all findings
  const hashed: Array<{ hash: string; f: Finding }> = [];
  for (const f of findings) hashed.push({ hash: await fingerprint(f), f });

  // Look up which are already known
  const { data: known, error: readErr } = await svc
    .from("security_scan_snapshots")
    .select("finding_hash")
    .in("finding_hash", hashed.map((h) => h.hash));
  if (readErr) {
    return new Response(JSON.stringify({ error: readErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const knownSet = new Set((known ?? []).map((r) => r.finding_hash));
  const newFindings = hashed.filter((h) => !knownSet.has(h.hash));

  // Upsert last_seen_at for all
  await svc.from("security_scan_snapshots").upsert(
    hashed.map((h) => ({
      finding_hash: h.hash,
      level: h.f.level,
      name: h.f.name,
      payload: h.f as unknown as Record<string, unknown>,
      last_seen_at: now,
    })),
    { onConflict: "finding_hash" },
  );

  // Alert on new findings
  if (newFindings.length > 0) {
    const severity = newFindings.some((h) => h.f.level === "error") ? "error" : "warning";
    const summary = `${newFindings.length} new security finding${newFindings.length === 1 ? "" : "s"} detected`;
    const details = { findings: newFindings.map((h) => ({ hash: h.hash, ...h.f })) };
    await svc.from("admin_alerts").insert({
      kind: "security_scan",
      severity,
      message: summary,
      details: details as unknown as Record<string, unknown>,
    });
    const html = `<h2>${summary}</h2><ul>` +
      newFindings.map((h) => `<li><b>[${h.f.level}]</b> ${h.f.name}<br/><small>${h.f.description ?? ""}</small></li>`).join("") +
      `</ul>`;
    const emailResult = await sendEmail(`[Security] ${summary}`, html);
    return new Response(
      JSON.stringify({ ok: true, new: newFindings.length, seen: hashed.length - newFindings.length, email: emailResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true, new: 0, seen: hashed.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdmin(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) return false;
  const { data } = await adminClient()
    .from("profiles")
    .select("is_admin")
    .eq("id", ctx.getUserId())
    .maybeSingle();
  return !!data?.is_admin;
}

export default defineTool({
  name: "resolve_report",
  title: "Resolve report by deleting content (admin)",
  description:
    "Admin only. Deletes the reported confession and marks the report resolved. Writes an entry to admin_moderation_audit.",
  inputSchema: {
    reportId: z.string().uuid().describe("Report UUID."),
    confessionId: z.string().uuid().describe("Confession UUID to delete."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ reportId, confessionId }, ctx) => {
    if (!(await requireAdmin(ctx))) {
      return { content: [{ type: "text", text: "forbidden" }], isError: true };
    }
    const admin = adminClient();
    const adminId = ctx.getUserId();
    const nowIso = new Date().toISOString();

    const d = await admin.from("confessions").delete().eq("id", confessionId);
    if (d.error) return { content: [{ type: "text", text: d.error.message }], isError: true };
    const u = await admin
      .from("reports")
      .update({ resolved: true, resolved_at: nowIso, resolved_by: adminId })
      .eq("id", reportId);
    if (u.error) return { content: [{ type: "text", text: u.error.message }], isError: true };

    await admin.from("admin_moderation_audit").insert({
      admin_id: adminId,
      admin_email: ctx.getUserEmail?.() ?? null,
      action: "delete",
      target_content_id: confessionId,
      details: { reportId, confessionId, via: "mcp" },
    }).then(() => undefined, () => undefined);

    return {
      content: [{ type: "text", text: "Report resolved and confession deleted." }],
      structuredContent: { ok: true, reportId, confessionId },
    };
  },
});

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
  name: "dismiss_report",
  title: "Dismiss report (admin)",
  description:
    "Admin only. Marks a moderation report resolved with no action. Writes an entry to admin_moderation_audit.",
  inputSchema: { reportId: z.string().uuid().describe("Report UUID.") },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ reportId }, ctx) => {
    if (!(await requireAdmin(ctx))) {
      return { content: [{ type: "text", text: "forbidden" }], isError: true };
    }
    const admin = adminClient();
    const adminId = ctx.getUserId();
    const nowIso = new Date().toISOString();

    const { error } = await admin
      .from("reports")
      .update({ resolved: true, resolved_at: nowIso, resolved_by: adminId })
      .eq("id", reportId);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    await admin.from("admin_moderation_audit").insert({
      admin_id: adminId,
      admin_email: ctx.getUserEmail?.() ?? null,
      action: "dismiss",
      details: { reportId, via: "mcp" },
    }).then(() => undefined, () => undefined);

    return {
      content: [{ type: "text", text: "Report dismissed." }],
      structuredContent: { ok: true, reportId },
    };
  },
});

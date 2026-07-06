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
  name: "list_pending_reports",
  title: "List pending reports (admin)",
  description:
    "Admin only. List unresolved moderation reports. Requires the caller to be a super admin (profiles.is_admin).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max reports to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!(await requireAdmin(ctx))) {
      return { content: [{ type: "text", text: "forbidden" }], isError: true };
    }
    const { data, error } = await adminClient()
      .from("reports")
      .select("id, item_type, item_id, reason, details, user_id, created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { reports: data },
    };
  },
});

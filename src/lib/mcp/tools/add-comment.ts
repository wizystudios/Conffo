import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "add_comment",
  title: "Comment on confession",
  description:
    "Post an anonymous comment on a confession as the authenticated user. The user_id is enforced server-side from the verified token.",
  inputSchema: {
    confessionId: z.string().uuid().describe("Confession UUID to comment on."),
    content: z.string().trim().min(1).max(2000).describe("Comment text."),
    parentCommentId: z.string().uuid().optional().describe("Parent comment for threaded replies."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ confessionId, content, parentCommentId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await userClient(ctx)
      .from("comments")
      .insert({
        confession_id: confessionId,
        content,
        user_id: ctx.getUserId(),
        parent_comment_id: parentCommentId ?? null,
      })
      .select("id, content, confession_id, created_at, parent_comment_id")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { comment: data },
    };
  },
});

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
  name: "create_confession",
  title: "Post confession",
  description:
    "Post a new anonymous confession as the authenticated user. The user_id is taken from the verified token — never from input.",
  inputSchema: {
    content: z.string().trim().min(1).max(4000).describe("Confession text."),
    roomId: z.string().trim().min(1).describe("Target room ID."),
    tags: z.array(z.string().trim().min(1)).max(10).optional().describe("Optional topic tags."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ content, roomId, tags }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await userClient(ctx)
      .from("confessions")
      .insert({ content, room_id: roomId, tags: tags ?? [], user_id: ctx.getUserId() })
      .select("id, content, room_id, created_at, tags")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { confession: data },
    };
  },
});

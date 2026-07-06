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
  name: "unfollow_room",
  title: "Unfollow room",
  description: "Unfollow a Conffo room as the authenticated user.",
  inputSchema: { roomId: z.string().trim().min(1).describe("Room ID to unfollow.") },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ roomId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { error } = await userClient(ctx)
      .from("room_follows")
      .delete()
      .eq("user_id", ctx.getUserId())
      .eq("room_id", roomId);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Unfollowed ${roomId}` }],
      structuredContent: { ok: true, roomId },
    };
  },
});

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
  name: "follow_room",
  title: "Follow room",
  description: "Follow a Conffo room as the authenticated user.",
  inputSchema: { roomId: z.string().trim().min(1).describe("Room ID to follow.") },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ roomId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { error } = await userClient(ctx)
      .from("room_follows")
      .upsert({ user_id: ctx.getUserId(), room_id: roomId }, { onConflict: "user_id,room_id" });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Following ${roomId}` }],
      structuredContent: { ok: true, roomId },
    };
  },
});

import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const ReactionType = z.enum(["like", "laugh", "shock", "heart"]);

export default defineTool({
  name: "add_reaction",
  title: "React to confession",
  description:
    "Add a reaction to a confession as the authenticated user. Valid types: like (Felt this), heart (Loved), laugh, shock (Changed my view).",
  inputSchema: {
    confessionId: z.string().uuid().describe("Confession UUID to react to."),
    type: ReactionType.describe("Reaction type."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ confessionId, type }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { error } = await userClient(ctx)
      .from("reactions")
      .upsert(
        { confession_id: confessionId, user_id: ctx.getUserId(), type },
        { onConflict: "confession_id,user_id,type" },
      );
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Reacted ${type}` }],
      structuredContent: { ok: true, confessionId, type },
    };
  },
});

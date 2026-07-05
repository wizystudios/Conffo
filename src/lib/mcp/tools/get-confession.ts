import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function anonClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "get_confession",
  title: "Get confession",
  description: "Fetch a single confession by its ID, including comments count and reactions.",
  inputSchema: {
    id: z.string().uuid().describe("Confession UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const client = anonClient();
    const { data: confession, error } = await client
      .from("confessions")
      .select("id, content, room_id, created_at, tags, media_type, media_url")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!confession) {
      return { content: [{ type: "text", text: "Confession not found." }], isError: true };
    }
    const { data: comments } = await client
      .from("comments")
      .select("id, content, created_at")
      .eq("confession_id", id)
      .order("created_at", { ascending: true })
      .limit(50);
    return {
      content: [{ type: "text", text: JSON.stringify({ confession, comments }) }],
      structuredContent: { confession, comments: comments ?? [] },
    };
  },
});

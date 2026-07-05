import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function anonClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_confessions",
  title: "Search confessions",
  description:
    "Search recent public anonymous confessions on Conffo. Optionally filter by room ID or match text content.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free-text substring to match in confession content."),
    roomId: z.string().trim().optional().describe("Room ID to filter by (e.g. 'relationships', 'work')."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum number of confessions to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, roomId, limit }) => {
    let q = anonClient()
      .from("confessions")
      .select("id, content, room_id, created_at, tags, media_type")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (roomId) q = q.eq("room_id", roomId);
    if (query) q = q.ilike("content", `%${query}%`);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { confessions: data },
    };
  },
});

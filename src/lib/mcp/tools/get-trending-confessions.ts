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
  name: "get_trending_confessions",
  title: "Get trending confessions",
  description:
    "Return the most-reacted-to confessions from the last N hours, optionally filtered by room. Ranked by total reactions.",
  inputSchema: {
    roomId: z.string().trim().optional().describe("Room ID to filter by (e.g. 'relationships')."),
    hours: z.number().int().min(1).max(720).optional().describe("Lookback window in hours (default 48)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max confessions to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ roomId, hours, limit }) => {
    const client = anonClient();
    const sinceISO = new Date(Date.now() - (hours ?? 48) * 3600_000).toISOString();
    const max = limit ?? 10;

    let cq = client
      .from("confessions")
      .select("id, content, room_id, created_at, tags, media_type")
      .gte("created_at", sinceISO);
    if (roomId) cq = cq.eq("room_id", roomId);
    const { data: confessions, error } = await cq.limit(500);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!confessions?.length) {
      return {
        content: [{ type: "text", text: "[]" }],
        structuredContent: { trending: [] },
      };
    }
    const ids = confessions.map((c) => c.id);
    const { data: reactions } = await client
      .from("reactions")
      .select("confession_id")
      .in("confession_id", ids);
    const counts = new Map<string, number>();
    for (const r of reactions ?? []) {
      counts.set(r.confession_id, (counts.get(r.confession_id) ?? 0) + 1);
    }
    const ranked = confessions
      .map((c) => ({ ...c, reaction_count: counts.get(c.id) ?? 0 }))
      .sort((a, b) => b.reaction_count - a.reaction_count)
      .slice(0, max);
    return {
      content: [{ type: "text", text: JSON.stringify(ranked) }],
      structuredContent: { trending: ranked, window_hours: hours ?? 48 },
    };
  },
});

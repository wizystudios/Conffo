#!/usr/bin/env node
// Simple MCP test client for the Conffo MCP server.
// Usage: node scripts/mcp-test-client.mjs [endpoint]
//
// Speaks MCP Streamable HTTP directly (no SDK) so it runs with zero deps.

const ENDPOINT =
  process.argv[2] ??
  "https://obijcwprhqyslfplnego.supabase.co/functions/v1/mcp";

let idCounter = 1;
let sessionId = null;

async function rpc(method, params) {
  const body = { jsonrpc: "2.0", id: idCounter++, method, params };
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/event-stream")) {
    const text = await res.text();
    // Pull the first `data: {...}` line.
    const line = text.split("\n").find((l) => l.startsWith("data:"));
    if (!line) throw new Error("no data frame in SSE response");
    return JSON.parse(line.slice(5).trim());
  }
  return res.json();
}

function assert(cond, msg) {
  if (!cond) {
    console.error("❌", msg);
    process.exitCode = 1;
  } else {
    console.log("✅", msg);
  }
}

async function main() {
  console.log(`→ endpoint: ${ENDPOINT}\n`);

  // 1. initialize
  const init = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "conffo-test-client", version: "0.1.0" },
  });
  assert(init.result?.serverInfo?.name, `initialize → ${init.result?.serverInfo?.name}`);
  await rpc("notifications/initialized", {});

  // 2. list tools
  const listed = await rpc("tools/list", {});
  const tools = listed.result?.tools ?? [];
  assert(tools.length >= 4, `tools/list returned ${tools.length} tools`);
  for (const t of tools) console.log(`   • ${t.name} — ${t.title}`);

  // 3. list_rooms
  const rooms = await rpc("tools/call", { name: "list_rooms", arguments: {} });
  const roomsPayload = rooms.result?.structuredContent?.rooms ?? [];
  assert(Array.isArray(roomsPayload) && roomsPayload.length > 0,
    `list_rooms returned ${roomsPayload.length} rooms`);

  // 4. search_confessions
  const search = await rpc("tools/call", {
    name: "search_confessions",
    arguments: { limit: 3 },
  });
  const searchPayload = search.result?.structuredContent?.confessions ?? [];
  assert(Array.isArray(searchPayload), `search_confessions returned ${searchPayload.length} rows`);

  // 5. get_confession (uses first search result if available)
  if (searchPayload[0]) {
    const one = await rpc("tools/call", {
      name: "get_confession",
      arguments: { id: searchPayload[0].id },
    });
    assert(one.result?.structuredContent?.confession?.id === searchPayload[0].id,
      "get_confession round-trip");
  }

  // 6. get_trending_confessions
  const trending = await rpc("tools/call", {
    name: "get_trending_confessions",
    arguments: { hours: 168, limit: 5 },
  });
  const trendingPayload = trending.result?.structuredContent?.trending ?? [];
  assert(Array.isArray(trendingPayload),
    `get_trending_confessions returned ${trendingPayload.length} rows`);
  for (const c of trendingPayload.slice(0, 3)) {
    console.log(`   • [${c.reaction_count}] ${c.content.slice(0, 60)}…`);
  }
}

main().catch((err) => {
  console.error("test client failed:", err);
  process.exit(1);
});

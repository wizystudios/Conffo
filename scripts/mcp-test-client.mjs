#!/usr/bin/env node
// Simple MCP test client for the Conffo MCP server.
// Usage:
//   node scripts/mcp-test-client.mjs [endpoint]
//   MCP_TOKEN=<oauth> node scripts/mcp-test-client.mjs
//   MCP_TOKEN=<admin oauth> MCP_ADMIN=1 node scripts/mcp-test-client.mjs
//
// Speaks MCP Streamable HTTP directly (no SDK) so it runs with zero deps.

const ENDPOINT =
  process.argv[2] ??
  "https://obijcwprhqyslfplnego.supabase.co/functions/v1/mcp";
const TOKEN = process.env.MCP_TOKEN ?? null;
const ADMIN = !!process.env.MCP_ADMIN;

let idCounter = 1;
let sessionId = null;

async function rpc(method, params) {
  const body = { jsonrpc: "2.0", id: idCounter++, method, params };
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  if (TOKEN) headers["Authorization"] = `Bearer ${TOKEN}`;

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
  console.log(`→ endpoint: ${ENDPOINT}`);
  console.log(`→ auth: ${TOKEN ? "OAuth bearer" : "none"}${ADMIN ? " (admin mode)" : ""}\n`);

  const init = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "conffo-test-client", version: "0.2.0" },
  });
  assert(init.result?.serverInfo?.name, `initialize → ${init.result?.serverInfo?.name}`);
  await rpc("notifications/initialized", {});

  const listed = await rpc("tools/list", {});
  const tools = listed.result?.tools ?? [];
  assert(tools.length >= 10, `tools/list returned ${tools.length} tools`);
  for (const t of tools) console.log(`   • ${t.name} — ${t.title}`);

  // ─── read tools ────────────────────────────────────────────────
  const rooms = await rpc("tools/call", { name: "list_rooms", arguments: {} });
  const roomsPayload = rooms.result?.structuredContent?.rooms ?? [];
  assert(Array.isArray(roomsPayload) && roomsPayload.length > 0,
    `list_rooms returned ${roomsPayload.length} rooms`);

  const search = await rpc("tools/call", {
    name: "search_confessions",
    arguments: { limit: 3 },
  });
  const searchPayload = search.result?.structuredContent?.confessions ?? [];
  assert(Array.isArray(searchPayload), `search_confessions returned ${searchPayload.length} rows`);

  if (searchPayload[0]) {
    const one = await rpc("tools/call", {
      name: "get_confession",
      arguments: { id: searchPayload[0].id },
    });
    assert(one.result?.structuredContent?.confession?.id === searchPayload[0].id,
      "get_confession round-trip");
  }

  const trending = await rpc("tools/call", {
    name: "get_trending_confessions",
    arguments: { hours: 168, limit: 5 },
  });
  const trendingPayload = trending.result?.structuredContent?.trending ?? [];
  assert(Array.isArray(trendingPayload),
    `get_trending_confessions returned ${trendingPayload.length} rows`);

  // ─── write tools (auth required) ────────────────────────────────
  if (TOKEN) {
    const roomId = roomsPayload[0]?.id ?? "random";
    const follow = await rpc("tools/call", {
      name: "follow_room",
      arguments: { roomId },
    });
    assert(follow.result?.structuredContent?.ok === true,
      `follow_room(${roomId})`);

    const followed = await rpc("tools/call", { name: "list_followed_rooms", arguments: {} });
    const followedList = followed.result?.structuredContent?.follows ?? [];
    assert(followedList.some((f) => f.room_id === roomId),
      `list_followed_rooms includes ${roomId}`);

    if (searchPayload[0]) {
      const react = await rpc("tools/call", {
        name: "add_reaction",
        arguments: { confessionId: searchPayload[0].id, type: "heart" },
      });
      assert(react.result?.structuredContent?.ok === true,
        `add_reaction(heart) on ${searchPayload[0].id.slice(0, 8)}…`);
    }

    // Confession + comment are destructive-ish; only run with MCP_WRITE=1
    if (process.env.MCP_WRITE) {
      const created = await rpc("tools/call", {
        name: "create_confession",
        arguments: { content: "MCP test client confession", roomId },
      });
      const conf = created.result?.structuredContent?.confession;
      assert(conf?.id, `create_confession → ${conf?.id?.slice(0, 8)}…`);

      if (conf?.id) {
        const c = await rpc("tools/call", {
          name: "add_comment",
          arguments: { confessionId: conf.id, content: "MCP test client comment" },
        });
        assert(c.result?.structuredContent?.comment?.id,
          "add_comment round-trip");
      }
    }
  } else {
    console.log("… skipped write tools (set MCP_TOKEN=<oauth> to exercise)");
  }

  // ─── admin tools ────────────────────────────────────────────────
  if (TOKEN && ADMIN) {
    const pending = await rpc("tools/call", {
      name: "list_pending_reports",
      arguments: { limit: 5 },
    });
    const reports = pending.result?.structuredContent?.reports;
    assert(Array.isArray(reports),
      `list_pending_reports returned ${reports?.length ?? 0} reports`);
  }
}

main().catch((err) => {
  console.error("test client failed:", err);
  process.exit(1);
});

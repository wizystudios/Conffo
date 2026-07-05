# Conffo MCP Server

This app exposes a Model Context Protocol (MCP) server so AI assistants
(ChatGPT, Claude, Cursor, Codex, etc.) can read Conffo's public confession
content.

**Endpoint (production):**
```
https://obijcwprhqyslfplnego.supabase.co/functions/v1/mcp
```

Transport: MCP Streamable HTTP. Authentication: none (read-only public data).

## Design principles

- **Read-only by default.** All currently-shipped tools are marked
  `readOnlyHint: true` and never mutate the database.
- **Elevated tools require auth.** Writing confessions, reactions, comments,
  follows, and admin moderation tools require Supabase OAuth 2.1
  (not yet enabled — see "Roadmap" below).
- **Anonymous by contract.** No tool exposes another user's PII. `user_id`s
  are opaque UUIDs; contact fields are never returned.

## Tools

### `list_rooms`
List every confession room (topic).

Input: _none_
Output: `{ rooms: [{ id, name, description, is_pinned }] }`

### `search_confessions`
Search recent public confessions.

| Param | Type | Notes |
| --- | --- | --- |
| `query` | string? | Substring to match in `content` |
| `roomId` | string? | e.g. `"relationships"`, `"work"` |
| `limit` | int? (1–50) | Default 20 |

Output: `{ confessions: [{ id, content, room_id, created_at, tags, media_type }] }`

### `get_confession`
Fetch one confession plus its first 50 comments.

| Param | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Confession ID |

Output: `{ confession, comments: [{ id, content, created_at }] }`

### `get_trending_confessions`
Rank confessions by total reactions in a lookback window.

| Param | Type | Notes |
| --- | --- | --- |
| `roomId` | string? | Filter to one room |
| `hours` | int? (1–720) | Lookback window, default 48 |
| `limit` | int? (1–50) | Default 10 |

Output: `{ trending: [{ ...confession, reaction_count }], window_hours }`

## Testing

A simple Node test client lives at `scripts/mcp-test-client.mjs`. It calls
each tool against the deployed endpoint and prints the results.

```bash
node scripts/mcp-test-client.mjs
```

## Roadmap (not yet shipped)

The following require enabling Supabase OAuth 2.1 as the MCP authorization
server so each assistant connects as a real user:

- `follow_room` / `unfollow_room` / `list_followed_rooms`
- `create_confession`, `add_reaction`, `add_comment`
- `my_reports_status` — status timeline of my submitted reports
- Admin-gated: `list_pending_reports`, `resolve_report` (checks `is_admin`)

Ask us to "enable OAuth for MCP" to turn these on.

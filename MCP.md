# Conffo MCP Server

An MCP (Model Context Protocol) server that lets AI assistants
(ChatGPT, Claude, Cursor, Codex, ...) read AND write Conffo data on behalf of
the connected user.

**Endpoint (production):**
```
https://obijcwprhqyslfplnego.supabase.co/functions/v1/mcp
```

Transport: MCP Streamable HTTP.
Authentication: Supabase OAuth 2.1 for all write / admin tools; read tools
are public.

## Design principles

- **Read-only by default.** All read tools are marked `readOnlyHint: true`
  and never mutate the database. They work without any credential.
- **User identity comes from the token, never from input.** Every write tool
  derives `user_id` from `ctx.getUserId()` (the verified Supabase JWT `sub`
  claim). No `user_id` parameter is exposed — a client cannot impersonate
  another user.
- **Admin tools are gated server-side.** `list_pending_reports`,
  `resolve_report`, and `dismiss_report` re-check `profiles.is_admin` via the
  service role on every call and record the action to `admin_moderation_audit`.
- **Anonymous by contract.** No tool exposes another user's PII. `user_id`s
  are opaque UUIDs; contact fields are never returned.

## Enabling OAuth 2.1

Supabase Auth is the OAuth 2.1 authorization server; `@lovable.dev/mcp-js` is
the resource server that validates bearer tokens.

1. In the Supabase Dashboard → Authentication → OAuth Server, enable OAuth 2.1
   with Dynamic Client Registration (DCR).
2. Set the redirect allow-list to include this app's origin plus
   `/.lovable/oauth/consent`.
3. Connected assistants (ChatGPT/Claude) self-register via DCR and redirect
   users through `/.lovable/oauth/consent`, the consent screen shipped with the
   app.

The MCP server is already configured to verify tokens against
`https://<project-ref>.supabase.co/auth/v1` and only accept tokens whose
audience is `authenticated` and which carry a `client_id` claim (real OAuth
clients — not copied `signInWithPassword` sessions).

## Tools

### Read tools (no auth)

| Tool | Purpose |
| --- | --- |
| `list_rooms` | List all rooms. |
| `search_confessions` | Search recent public confessions. Filters: `query`, `roomId`, `limit`. |
| `get_confession` | Fetch one confession by `id` plus its first 50 comments. |
| `get_trending_confessions` | Rank by total reactions in a lookback window. Filters: `roomId`, `hours` (1–720), `limit` (1–50). |

### Write tools (OAuth required)

| Tool | Purpose | Input |
| --- | --- | --- |
| `follow_room` | Follow a room as the caller. | `roomId` |
| `unfollow_room` | Unfollow a room. | `roomId` |
| `list_followed_rooms` | List rooms the caller follows. | _none_ |
| `create_confession` | Post a confession as the caller. | `content`, `roomId`, `tags?` |
| `add_reaction` | React to a confession. | `confessionId`, `type` (`like` / `laugh` / `shock` / `heart`) |
| `add_comment` | Comment on a confession. | `confessionId`, `content`, `parentCommentId?` |

`user_id` is **never** part of the input schema — it is taken from the
verified OAuth token. Attempting to spoof a user_id via input is impossible;
the field does not exist on any write tool.

### Admin tools (OAuth + `profiles.is_admin = true`)

| Tool | Purpose | Input | Audit |
| --- | --- | --- | --- |
| `list_pending_reports` | List unresolved reports. | `limit?` (1–100) | read-only, no audit |
| `resolve_report` | Delete the reported confession and resolve the report. | `reportId`, `confessionId` | `admin_moderation_audit` (`action = 'delete'`) |
| `dismiss_report` | Mark a report resolved with no action. | `reportId` | `admin_moderation_audit` (`action = 'dismiss'`) |

Non-admin callers receive `forbidden` — the check runs against
`profiles.is_admin` using the service role on every call, and cannot be
short-circuited by JWT claims.

## Authenticated example (curl)

Assuming you have a Supabase OAuth access token issued for this app's OAuth
client (obtained by walking the DCR + consent flow above):

```bash
ENDPOINT="https://obijcwprhqyslfplnego.supabase.co/functions/v1/mcp"
TOKEN="<oauth-access-token>"

# 1. initialize (captures the session id from Mcp-Session-Id response header)
curl -sS -D headers.txt -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'

SID=$(grep -i '^mcp-session-id:' headers.txt | awk '{print $2}' | tr -d '\r')

# 2. follow a room as the token's owner
curl -sS -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Mcp-Session-Id: $SID" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"follow_room","arguments":{"roomId":"relationships"}}}'

# 3. post a confession — user_id is taken from the token
curl -sS -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Mcp-Session-Id: $SID" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_confession","arguments":{"content":"Hello from an agent","roomId":"random"}}}'
```

## Testing

`scripts/mcp-test-client.mjs` is a zero-dependency Node client that exercises
the deployed endpoint.

```bash
# unauthenticated — hits the read tools
node scripts/mcp-test-client.mjs

# authenticated — hits read + write tools as the token's owner
MCP_TOKEN="<oauth-access-token>" node scripts/mcp-test-client.mjs

# admin — exercises list_pending_reports as well
MCP_TOKEN="<super-admin-oauth-token>" MCP_ADMIN=1 node scripts/mcp-test-client.mjs
```

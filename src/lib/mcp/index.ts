import { defineMcp } from "@lovable.dev/mcp-js";
import listRoomsTool from "./tools/list-rooms";
import searchConfessionsTool from "./tools/search-confessions";
import getConfessionTool from "./tools/get-confession";
import getTrendingConfessionsTool from "./tools/get-trending-confessions";

export default defineMcp({
  name: "conffo-mcp",
  title: "Conffo",
  version: "0.2.0",
  instructions:
    "Read-only access to public anonymous confessions on Conffo. All tools are read-only by design; writing confessions/reactions/comments and admin moderation require OAuth (not yet enabled). Use `list_rooms` to discover topics, `search_confessions` to browse or filter, `get_confession` for a single item with comments, and `get_trending_confessions` to rank by reactions within a lookback window.",
  tools: [
    listRoomsTool,
    searchConfessionsTool,
    getConfessionTool,
    getTrendingConfessionsTool,
  ],
});

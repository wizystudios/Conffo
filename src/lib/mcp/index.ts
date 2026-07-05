import { defineMcp } from "@lovable.dev/mcp-js";
import listRoomsTool from "./tools/list-rooms";
import searchConfessionsTool from "./tools/search-confessions";
import getConfessionTool from "./tools/get-confession";

export default defineMcp({
  name: "conffo-mcp",
  title: "Conffo",
  version: "0.1.0",
  instructions:
    "Read-only access to public anonymous confessions on Conffo. Use `list_rooms` to discover topics, `search_confessions` to browse or filter by room/keyword, and `get_confession` to fetch a specific confession with its comments.",
  tools: [listRoomsTool, searchConfessionsTool, getConfessionTool],
});

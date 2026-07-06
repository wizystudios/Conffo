import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRoomsTool from "./tools/list-rooms";
import searchConfessionsTool from "./tools/search-confessions";
import getConfessionTool from "./tools/get-confession";
import getTrendingConfessionsTool from "./tools/get-trending-confessions";
import followRoomTool from "./tools/follow-room";
import unfollowRoomTool from "./tools/unfollow-room";
import listFollowedRoomsTool from "./tools/list-followed-rooms";
import createConfessionTool from "./tools/create-confession";
import addReactionTool from "./tools/add-reaction";
import addCommentTool from "./tools/add-comment";
import listPendingReportsTool from "./tools/list-pending-reports";
import resolveReportTool from "./tools/resolve-report";
import dismissReportTool from "./tools/dismiss-report";

// Direct supabase.co host — NEVER the .lovable.cloud proxy. Built from the
// inlined project ref so this stays import-safe (no runtime env read at eval).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "conffo-mcp",
  title: "Conffo",
  version: "0.3.0",
  instructions:
    "Read/write access to Conffo. Read tools (list_rooms, search_confessions, get_confession, get_trending_confessions) work without auth. Write tools (follow_room, unfollow_room, list_followed_rooms, create_confession, add_reaction, add_comment) require Supabase OAuth — the caller's user_id is always taken from the verified token, never from input. Admin tools (list_pending_reports, resolve_report, dismiss_report) additionally require profiles.is_admin and write to admin_moderation_audit.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listRoomsTool,
    searchConfessionsTool,
    getConfessionTool,
    getTrendingConfessionsTool,
    followRoomTool,
    unfollowRoomTool,
    listFollowedRoomsTool,
    createConfessionTool,
    addReactionTool,
    addCommentTool,
    listPendingReportsTool,
    resolveReportTool,
    dismissReportTool,
  ],
});

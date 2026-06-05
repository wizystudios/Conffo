// Decides whether a push notification should fire for a given event.
// Centralised so we can unit-test the rules without touching the DOM
// Notification API. The caller (toast / service worker) only fires when
// shouldFirePush() returns true.
import { supabase } from "@/integrations/supabase/client";

export type PushEvent =
  | { kind: "new_comment"; confessionId: string; commentId: string; authorId: string; recipientId: string }
  | { kind: "new_reply"; parentCommentId: string; commentId: string; authorId: string; recipientId: string }
  | { kind: "trending"; confessionId: string; reactionCount: number; recipientId: string };

/** Reactions needed before a "your confession is trending" push fires. */
export const TRENDING_THRESHOLD = 25;

export interface GateResult {
  fire: boolean;
  reason: string;
}

const allow = (reason = "ok"): GateResult => ({ fire: true, reason });
const block = (reason: string): GateResult => ({ fire: false, reason });

/** Has the underlying confession been removed (e.g. by moderation)? */
async function confessionExists(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("confessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/** Has the underlying comment been removed? */
async function commentExists(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("comments")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function shouldFirePush(event: PushEvent): Promise<GateResult> {
  // Never push yourself for your own action.
  if ("authorId" in event && event.authorId === event.recipientId) {
    return block("self_action");
  }

  switch (event.kind) {
    case "new_comment": {
      if (!(await confessionExists(event.confessionId))) {
        return block("confession_deleted");
      }
      if (!(await commentExists(event.commentId))) {
        return block("comment_deleted");
      }
      return allow();
    }
    case "new_reply": {
      if (!(await commentExists(event.parentCommentId))) {
        return block("parent_deleted");
      }
      if (!(await commentExists(event.commentId))) {
        return block("comment_deleted");
      }
      return allow();
    }
    case "trending": {
      if (event.reactionCount < TRENDING_THRESHOLD) {
        return block("below_threshold");
      }
      if (!(await confessionExists(event.confessionId))) {
        return block("confession_deleted");
      }
      return allow();
    }
  }
}

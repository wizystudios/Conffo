// Decides whether a push notification should fire for a given event.
// Centralised so callers (toast/service worker/dispatcher) only fire when
// shouldFirePush() returns true. Also handles:
//   - dedup: same (recipient, kind, target) within DEDUP_WINDOW_MS
//   - rate limit: per-recipient cap inside RATE_WINDOW_MS
//   - per-room configurable trending threshold (rooms.trending_threshold)
//   - suppression when the underlying confession/comment was moderated away
import { supabase } from "@/integrations/supabase/client";

export type PushEvent =
  | { kind: "new_comment"; confessionId: string; commentId: string; authorId: string; recipientId: string }
  | { kind: "new_reply"; parentCommentId: string; commentId: string; authorId: string; recipientId: string }
  | { kind: "trending"; confessionId: string; roomId?: string | null; reactionCount: number; recipientId: string };

/** Default reactions threshold when a room has no override. */
export const DEFAULT_TRENDING_THRESHOLD = 25;

/** Suppress duplicate push for the same (recipient, kind, target) within this window. */
export const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Max pushes per recipient inside the rate window. */
export const RATE_LIMIT_MAX = 8;
export const RATE_WINDOW_MS = 60 * 1000; // 1 minute

export interface GateResult {
  fire: boolean;
  reason: string;
}

const allow = (reason = "ok"): GateResult => ({ fire: true, reason });
const block = (reason: string): GateResult => ({ fire: false, reason });

// ----- in-memory dedup + rate-limit state -----
// Keyed by recipient + event signature. Safe per-tab; the same logic also
// runs server-side in the edge function for cross-device dedup.
const recentPushes = new Map<string, number>();
const recipientTimestamps = new Map<string, number[]>();

function eventSignature(event: PushEvent): string {
  switch (event.kind) {
    case "new_comment":
      return `${event.recipientId}:new_comment:${event.confessionId}`;
    case "new_reply":
      return `${event.recipientId}:new_reply:${event.parentCommentId}`;
    case "trending":
      return `${event.recipientId}:trending:${event.confessionId}`;
  }
}

/** Test-only: clear dedup/rate state between runs. */
export function __resetPushGateState() {
  recentPushes.clear();
  recipientTimestamps.clear();
}

function isDuplicate(event: PushEvent, now: number): boolean {
  const key = eventSignature(event);
  const last = recentPushes.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  return false;
}

function isRateLimited(recipientId: string, now: number): boolean {
  const arr = recipientTimestamps.get(recipientId) ?? [];
  const fresh = arr.filter((t) => now - t < RATE_WINDOW_MS);
  recipientTimestamps.set(recipientId, fresh);
  return fresh.length >= RATE_LIMIT_MAX;
}

function recordPush(event: PushEvent, now: number) {
  recentPushes.set(eventSignature(event), now);
  const arr = recipientTimestamps.get(event.recipientId) ?? [];
  arr.push(now);
  recipientTimestamps.set(event.recipientId, arr);
}

// ----- moderation existence checks -----
async function confessionExists(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("confessions").select("id").eq("id", id).maybeSingle();
  if (error) return false;
  return !!data;
}

async function commentExists(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("comments").select("id").eq("id", id).maybeSingle();
  if (error) return false;
  return !!data;
}

/** Fetch trending threshold for a room (falls back to default). */
export async function getTrendingThreshold(roomId?: string | null): Promise<number> {
  if (!roomId) return DEFAULT_TRENDING_THRESHOLD;
  const { data, error } = await supabase
    .from("rooms")
    .select("trending_threshold" as never)
    .eq("id", roomId)
    .maybeSingle();
  if (error || !data) return DEFAULT_TRENDING_THRESHOLD;
  const raw = (data as { trending_threshold?: number }).trending_threshold;
  return typeof raw === "number" && raw > 0 ? raw : DEFAULT_TRENDING_THRESHOLD;
}

export async function shouldFirePush(
  event: PushEvent,
  now: number = Date.now(),
): Promise<GateResult> {
  // Never push yourself for your own action.
  if ("authorId" in event && event.authorId === event.recipientId) {
    return block("self_action");
  }

  // Dedup before doing any DB work.
  if (isDuplicate(event, now)) return block("duplicate");

  // Existence + threshold checks.
  switch (event.kind) {
    case "new_comment": {
      if (!(await confessionExists(event.confessionId))) return block("confession_deleted");
      if (!(await commentExists(event.commentId))) return block("comment_deleted");
      break;
    }
    case "new_reply": {
      if (!(await commentExists(event.parentCommentId))) return block("parent_deleted");
      if (!(await commentExists(event.commentId))) return block("comment_deleted");
      break;
    }
    case "trending": {
      const threshold = await getTrendingThreshold(event.roomId);
      if (event.reactionCount < threshold) return block("below_threshold");
      if (!(await confessionExists(event.confessionId))) return block("confession_deleted");
      break;
    }
  }

  // Rate limit per recipient (checked last so deletes/dedup short-circuit cheaply).
  if (isRateLimited(event.recipientId, now)) return block("rate_limited");

  recordPush(event, now);
  return allow();
}

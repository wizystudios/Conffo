// Per-user notification preferences with per-room and per-topic toggles.
import { supabase } from "@/integrations/supabase/client";

export interface NotificationPreferences {
  replies_enabled: boolean;
  comments_enabled: boolean;
  trending_enabled: boolean;
  /** roomId -> false to mute that room (omit = enabled). */
  room_overrides: Record<string, boolean>;
  /** topicId -> false to mute that topic. */
  topic_overrides: Record<string, boolean>;
}

export const DEFAULT_PREFS: NotificationPreferences = {
  replies_enabled: true,
  comments_enabled: true,
  trending_enabled: true,
  room_overrides: {},
  topic_overrides: {},
};

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("notification_preferences" as never)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return DEFAULT_PREFS;
  const d = data as unknown as Partial<NotificationPreferences>;
  return { ...DEFAULT_PREFS, ...d };
}

export async function savePreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>,
): Promise<void> {
  await supabase
    .from("notification_preferences" as never)
    .upsert({ user_id: userId, ...prefs } as never, { onConflict: "user_id" });
}

export type PrefKind = "new_comment" | "new_reply" | "trending";

/** Pure check used by the gate — given prefs + event context decide allow/deny. */
export function isAllowedByPrefs(
  prefs: NotificationPreferences,
  kind: PrefKind,
  ctx: { roomId?: string | null; topicId?: string | null } = {},
): boolean {
  if (kind === "new_comment" && !prefs.comments_enabled) return false;
  if (kind === "new_reply" && !prefs.replies_enabled) return false;
  if (kind === "trending" && !prefs.trending_enabled) return false;
  if (ctx.roomId && prefs.room_overrides[ctx.roomId] === false) return false;
  if (ctx.topicId && prefs.topic_overrides[ctx.topicId] === false) return false;
  return true;
}

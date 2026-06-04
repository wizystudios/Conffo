// Admin moderation actions. Kept as plain async functions so they can be
// unit-tested with a mocked Supabase client and reused from AdminPage.
import { supabase } from "@/integrations/supabase/client";

export type ModerationAction = "dismiss" | "delete" | "warn" | "temp_ban";

export interface ModerationResult {
  ok: boolean;
  error?: string;
}

const ok = (): ModerationResult => ({ ok: true });
const fail = (e: unknown): ModerationResult => ({
  ok: false,
  error: e instanceof Error ? e.message : String(e),
});

/** Mark a report resolved without taking action against the content/user. */
export async function dismissReport(
  reportId: string,
  adminId: string,
): Promise<ModerationResult> {
  try {
    const { error } = await supabase
      .from("reports")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
      })
      .eq("id", reportId);
    if (error) throw error;
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** Permanently delete a reported confession and resolve the report. */
export async function deleteReportedConfession(
  reportId: string,
  confessionId: string,
  adminId: string,
): Promise<ModerationResult> {
  try {
    const del = await supabase.from("confessions").delete().eq("id", confessionId);
    if (del.error) throw del.error;
    const upd = await supabase
      .from("reports")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
      })
      .eq("id", reportId);
    if (upd.error) throw upd.error;
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** Send an in-app warning notification to a user. */
export async function warnUser(
  userId: string,
  reason: string,
): Promise<ModerationResult> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type: "moderation_warning",
      content: `Warning from moderators: ${reason}`,
    });
    if (error) throw error;
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** Temporarily ban a user until the supplied ISO date. Stored on profile. */
export async function tempBanUser(
  userId: string,
  untilIso: string,
): Promise<ModerationResult> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ banned_until: untilIso })
      .eq("id", userId);
    if (error) throw error;
    return ok();
  } catch (e) {
    return fail(e);
  }
}

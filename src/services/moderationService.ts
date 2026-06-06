// Admin moderation actions. All actions are routed through the `admin-moderate`
// edge function which performs server-side super-admin verification — the
// client never trusts its own role check.
import { supabase } from "@/integrations/supabase/client";

export type ModerationAction = "dismiss" | "delete" | "warn" | "temp_ban";

export interface ModerationResult {
  ok: boolean;
  error?: string;
}

async function invoke(body: Record<string, unknown>): Promise<ModerationResult> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-moderate", { body });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && "error" in data) {
      return { ok: false, error: String((data as { error: unknown }).error) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const dismissReport = (reportId: string, _adminId?: string) =>
  invoke({ action: "dismiss", reportId });

export const deleteReportedConfession = (reportId: string, confessionId: string, _adminId?: string) =>
  invoke({ action: "delete", reportId, confessionId });

export const warnUser = (userId: string, reason: string) =>
  invoke({ action: "warn", userId, reason });

export const tempBanUser = (userId: string, untilIso: string) =>
  invoke({ action: "temp_ban", userId, untilIso });

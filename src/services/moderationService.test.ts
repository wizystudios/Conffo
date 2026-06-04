import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase client BEFORE importing the service under test.
const updateMock = vi.fn();
const deleteMock = vi.fn();
const insertMock = vi.fn();
const eqUpdate = vi.fn();
const eqDelete = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn((_table: string) => ({
        update: (...args: unknown[]) => {
          updateMock(...args);
          return { eq: (...e: unknown[]) => { eqUpdate(...e); return Promise.resolve({ error: null }); } };
        },
        delete: () => {
          deleteMock();
          return { eq: (...e: unknown[]) => { eqDelete(...e); return Promise.resolve({ error: null }); } };
        },
        insert: (...args: unknown[]) => {
          insertMock(...args);
          return Promise.resolve({ error: null });
        },
      })),
    },
  };
});

import {
  dismissReport,
  deleteReportedConfession,
  warnUser,
  tempBanUser,
} from "./moderationService";

beforeEach(() => {
  updateMock.mockClear();
  deleteMock.mockClear();
  insertMock.mockClear();
  eqUpdate.mockClear();
  eqDelete.mockClear();
});

describe("moderationService", () => {
  it("dismissReport marks the report resolved with admin id", async () => {
    const res = await dismissReport("report-1", "admin-9");
    expect(res.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.resolved).toBe(true);
    expect(payload.resolved_by).toBe("admin-9");
    expect(typeof payload.resolved_at).toBe("string");
    expect(eqUpdate).toHaveBeenCalledWith("id", "report-1");
  });

  it("deleteReportedConfession deletes the content then resolves the report", async () => {
    const res = await deleteReportedConfession("r-1", "c-1", "admin-1");
    expect(res.ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(eqDelete).toHaveBeenCalledWith("id", "c-1");
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(eqUpdate).toHaveBeenCalledWith("id", "r-1");
  });

  it("warnUser inserts a moderation_warning notification with reason", async () => {
    const res = await warnUser("user-1", "Be respectful");
    expect(res.ok).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(row.user_id).toBe("user-1");
    expect(row.type).toBe("moderation_warning");
    expect(String(row.content)).toContain("Be respectful");
  });

  it("tempBanUser writes banned_until on the user's profile", async () => {
    const until = new Date(Date.now() + 86_400_000).toISOString();
    const res = await tempBanUser("user-7", until);
    expect(res.ok).toBe(true);
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.banned_until).toBe(until);
    expect(eqUpdate).toHaveBeenCalledWith("id", "user-7");
  });
});

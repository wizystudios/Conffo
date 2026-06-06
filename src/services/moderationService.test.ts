import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

import { dismissReport, deleteReportedConfession, warnUser, tempBanUser } from "./moderationService";

beforeEach(() => invokeMock.mockReset());

describe("moderationService — routes through admin-moderate edge function", () => {
  it("dismissReport calls edge function with dismiss action", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const r = await dismissReport("r1");
    expect(r.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith("admin-moderate", { body: { action: "dismiss", reportId: "r1" } });
  });

  it("deleteReportedConfession forwards both ids", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    await deleteReportedConfession("r1", "c1");
    expect(invokeMock).toHaveBeenCalledWith("admin-moderate", {
      body: { action: "delete", reportId: "r1", confessionId: "c1" },
    });
  });

  it("warnUser sends reason text", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    await warnUser("u1", "stop spamming");
    expect(invokeMock).toHaveBeenCalledWith("admin-moderate", {
      body: { action: "warn", userId: "u1", reason: "stop spamming" },
    });
  });

  it("tempBanUser sends ISO date", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    await tempBanUser("u1", "2030-01-01T00:00:00Z");
    expect(invokeMock).toHaveBeenCalledWith("admin-moderate", {
      body: { action: "temp_ban", userId: "u1", untilIso: "2030-01-01T00:00:00Z" },
    });
  });

  it("returns ok:false when the edge function rejects with 403", async () => {
    invokeMock.mockResolvedValue({ data: { error: "forbidden" }, error: null });
    const r = await dismissReport("r1");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("forbidden");
  });

  it("returns ok:false when the http call itself fails", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "network" } });
    const r = await dismissReport("r1");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("network");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Per-table state used by the mocked Supabase client.
const existing: Record<string, Set<string>> = {
  confessions: new Set(),
  comments: new Set(),
};
const roomThresholds = new Map<string, number>();

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: (table: string) => ({
        select: (_cols: string) => ({
          eq: (_col: string, value: string) => ({
            maybeSingle: () => {
              if (table === "rooms") {
                const t = roomThresholds.get(value);
                return Promise.resolve({
                  data: t !== undefined ? { trending_threshold: t } : null,
                  error: null,
                });
              }
              return Promise.resolve({
                data: existing[table]?.has(value) ? { id: value } : null,
                error: null,
              });
            },
          }),
        }),
      }),
    },
  };
});

import {
  shouldFirePush,
  __resetPushGateState,
  DEFAULT_TRENDING_THRESHOLD,
  DEDUP_WINDOW_MS,
  RATE_LIMIT_MAX,
} from "./pushNotificationGate";

beforeEach(() => {
  existing.confessions = new Set(["conf-1"]);
  existing.comments = new Set(["cmt-1", "cmt-parent"]);
  roomThresholds.clear();
  __resetPushGateState();
});

describe("pushNotificationGate — base rules", () => {
  it("fires for a new comment on an existing confession", async () => {
    const res = await shouldFirePush({
      kind: "new_comment", confessionId: "conf-1", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    });
    expect(res.fire).toBe(true);
  });

  it("suppresses comment push when the confession was moderated away", async () => {
    existing.confessions.delete("conf-1");
    const res = await shouldFirePush({
      kind: "new_comment", confessionId: "conf-1", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    });
    expect(res).toEqual({ fire: false, reason: "confession_deleted" });
  });

  it("suppresses a reply push when the parent comment was deleted", async () => {
    existing.comments.delete("cmt-parent");
    const res = await shouldFirePush({
      kind: "new_reply", parentCommentId: "cmt-parent", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    });
    expect(res.reason).toBe("parent_deleted");
  });

  it("never pushes the user for their own action", async () => {
    const res = await shouldFirePush({
      kind: "new_comment", confessionId: "conf-1", commentId: "cmt-1",
      authorId: "same", recipientId: "same",
    });
    expect(res.reason).toBe("self_action");
  });
});

describe("pushNotificationGate — trending thresholds", () => {
  it("uses the default threshold when no room is provided", async () => {
    const below = await shouldFirePush({
      kind: "trending", confessionId: "conf-1",
      reactionCount: DEFAULT_TRENDING_THRESHOLD - 1, recipientId: "b",
    });
    expect(below.reason).toBe("below_threshold");

    const at = await shouldFirePush({
      kind: "trending", confessionId: "conf-1",
      reactionCount: DEFAULT_TRENDING_THRESHOLD, recipientId: "b",
    });
    expect(at.fire).toBe(true);
  });

  it("honours a per-room trending threshold override (lower)", async () => {
    roomThresholds.set("room-soft", 5);
    const res = await shouldFirePush({
      kind: "trending", confessionId: "conf-1", roomId: "room-soft",
      reactionCount: 5, recipientId: "b",
    });
    expect(res.fire).toBe(true);
  });

  it("honours a per-room trending threshold override (higher)", async () => {
    roomThresholds.set("room-strict", 100);
    const res = await shouldFirePush({
      kind: "trending", confessionId: "conf-1", roomId: "room-strict",
      reactionCount: 50, recipientId: "b",
    });
    expect(res.reason).toBe("below_threshold");
  });

  it("suppresses trending push after moderation deletes the confession", async () => {
    existing.confessions.delete("conf-1");
    const res = await shouldFirePush({
      kind: "trending", confessionId: "conf-1",
      reactionCount: DEFAULT_TRENDING_THRESHOLD + 50, recipientId: "b",
    });
    expect(res.reason).toBe("confession_deleted");
  });
});

describe("pushNotificationGate — dedup + rate limit", () => {
  it("dedupes the same event signature inside the dedup window", async () => {
    const evt = {
      kind: "new_comment" as const, confessionId: "conf-1", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    };
    const first = await shouldFirePush(evt, 1_000);
    const second = await shouldFirePush(evt, 1_000 + 30_000);
    expect(first.fire).toBe(true);
    expect(second).toEqual({ fire: false, reason: "duplicate" });
  });

  it("allows the event again after the dedup window expires", async () => {
    const evt = {
      kind: "new_comment" as const, confessionId: "conf-1", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    };
    const t0 = 10_000;
    await shouldFirePush(evt, t0);
    const later = await shouldFirePush(evt, t0 + DEDUP_WINDOW_MS + 1);
    expect(later.fire).toBe(true);
  });

  it("rate-limits a recipient after RATE_LIMIT_MAX pushes in the window", async () => {
    // Seed unique comment ids so dedup doesn't fire first.
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      existing.comments.add(`cmt-${i}`);
      const r = await shouldFirePush({
        kind: "new_comment", confessionId: "conf-1", commentId: `cmt-${i}`,
        authorId: "a", recipientId: "rl",
      }, 1_000 + i);
      expect(r.fire).toBe(true);
    }
    existing.comments.add("cmt-overflow");
    const overflow = await shouldFirePush({
      kind: "new_comment", confessionId: "conf-1", commentId: "cmt-overflow",
      authorId: "a", recipientId: "rl",
    }, 1_500);
    expect(overflow).toEqual({ fire: false, reason: "rate_limited" });
  });
});

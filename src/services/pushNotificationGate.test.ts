import { describe, it, expect, vi, beforeEach } from "vitest";

// Per-table state used by the mocked Supabase client. Each test seeds
// which IDs should exist so we can simulate moderation deletes.
const existing: Record<string, Set<string>> = {
  confessions: new Set(),
  comments: new Set(),
};

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: (table: string) => ({
        select: (_cols: string) => ({
          eq: (_col: string, value: string) => ({
            maybeSingle: () =>
              Promise.resolve({
                data: existing[table]?.has(value) ? { id: value } : null,
                error: null,
              }),
          }),
        }),
      }),
    },
  };
});

import {
  shouldFirePush,
  TRENDING_THRESHOLD,
} from "./pushNotificationGate";

beforeEach(() => {
  existing.confessions = new Set(["conf-1"]);
  existing.comments = new Set(["cmt-1", "cmt-parent"]);
});

describe("pushNotificationGate", () => {
  it("fires for a new comment on an existing confession", async () => {
    const res = await shouldFirePush({
      kind: "new_comment",
      confessionId: "conf-1",
      commentId: "cmt-1",
      authorId: "user-a",
      recipientId: "user-b",
    });
    expect(res.fire).toBe(true);
  });

  it("suppresses comment push when the confession was moderated away", async () => {
    existing.confessions.delete("conf-1");
    const res = await shouldFirePush({
      kind: "new_comment",
      confessionId: "conf-1",
      commentId: "cmt-1",
      authorId: "user-a",
      recipientId: "user-b",
    });
    expect(res.fire).toBe(false);
    expect(res.reason).toBe("confession_deleted");
  });

  it("suppresses comment push when the comment itself was deleted", async () => {
    existing.comments.delete("cmt-1");
    const res = await shouldFirePush({
      kind: "new_comment",
      confessionId: "conf-1",
      commentId: "cmt-1",
      authorId: "user-a",
      recipientId: "user-b",
    });
    expect(res.fire).toBe(false);
    expect(res.reason).toBe("comment_deleted");
  });

  it("never pushes the user for their own action", async () => {
    const res = await shouldFirePush({
      kind: "new_comment",
      confessionId: "conf-1",
      commentId: "cmt-1",
      authorId: "user-a",
      recipientId: "user-a",
    });
    expect(res.fire).toBe(false);
    expect(res.reason).toBe("self_action");
  });

  it("fires for a reply when both parent and reply exist", async () => {
    const res = await shouldFirePush({
      kind: "new_reply",
      parentCommentId: "cmt-parent",
      commentId: "cmt-1",
      authorId: "user-a",
      recipientId: "user-b",
    });
    expect(res.fire).toBe(true);
  });

  it("suppresses a reply push when the parent comment was deleted", async () => {
    existing.comments.delete("cmt-parent");
    const res = await shouldFirePush({
      kind: "new_reply",
      parentCommentId: "cmt-parent",
      commentId: "cmt-1",
      authorId: "user-a",
      recipientId: "user-b",
    });
    expect(res.fire).toBe(false);
    expect(res.reason).toBe("parent_deleted");
  });

  it("does not push trending below the threshold", async () => {
    const res = await shouldFirePush({
      kind: "trending",
      confessionId: "conf-1",
      reactionCount: TRENDING_THRESHOLD - 1,
      recipientId: "user-b",
    });
    expect(res.fire).toBe(false);
    expect(res.reason).toBe("below_threshold");
  });

  it("pushes trending once the threshold is hit", async () => {
    const res = await shouldFirePush({
      kind: "trending",
      confessionId: "conf-1",
      reactionCount: TRENDING_THRESHOLD,
      recipientId: "user-b",
    });
    expect(res.fire).toBe(true);
  });

  it("suppresses trending push after moderation deletes the confession", async () => {
    existing.confessions.delete("conf-1");
    const res = await shouldFirePush({
      kind: "trending",
      confessionId: "conf-1",
      reactionCount: TRENDING_THRESHOLD + 50,
      recipientId: "user-b",
    });
    expect(res.fire).toBe(false);
    expect(res.reason).toBe("confession_deleted");
  });
});

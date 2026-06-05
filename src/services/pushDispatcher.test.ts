import { describe, it, expect, vi, beforeEach } from "vitest";

const existing: Record<string, Set<string>> = {
  confessions: new Set(),
  comments: new Set(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: (_c: string) => ({
        eq: (_col: string, value: string) => ({
          maybeSingle: () => {
            if (table === "rooms") return Promise.resolve({ data: null, error: null });
            return Promise.resolve({
              data: existing[table]?.has(value) ? { id: value } : null,
              error: null,
            });
          },
        }),
      }),
    }),
  },
}));

import { dispatchPush, type PushProvider } from "./pushDispatcher";
import { __resetPushGateState, DEFAULT_TRENDING_THRESHOLD } from "./pushNotificationGate";

function makeProvider(): PushProvider & { sent: Array<{ to: string; title: string }> } {
  const sent: Array<{ to: string; title: string }> = [];
  return {
    sent,
    async send(to, payload) {
      sent.push({ to, title: payload.title });
    },
  };
}

beforeEach(() => {
  existing.confessions = new Set(["conf-1"]);
  existing.comments = new Set(["cmt-1", "cmt-parent"]);
  __resetPushGateState();
});

describe("dispatchPush — end-to-end via mock provider", () => {
  it("delivers a push for a new comment", async () => {
    const provider = makeProvider();
    const res = await dispatchPush({
      kind: "new_comment", confessionId: "conf-1", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    }, provider);
    expect(res.delivered).toBe(true);
    expect(provider.sent).toEqual([{ to: "b", title: "New comment" }]);
  });

  it("delivers a push for a new reply", async () => {
    const provider = makeProvider();
    const res = await dispatchPush({
      kind: "new_reply", parentCommentId: "cmt-parent", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    }, provider);
    expect(res.delivered).toBe(true);
    expect(provider.sent[0].title).toBe("New reply");
  });

  it("delivers a push when the trending threshold is reached", async () => {
    const provider = makeProvider();
    const res = await dispatchPush({
      kind: "trending", confessionId: "conf-1",
      reactionCount: DEFAULT_TRENDING_THRESHOLD, recipientId: "b",
    }, provider);
    expect(res.delivered).toBe(true);
    expect(provider.sent[0].title).toBe("Trending");
  });

  it("does NOT deliver a trending push below the threshold", async () => {
    const provider = makeProvider();
    const res = await dispatchPush({
      kind: "trending", confessionId: "conf-1",
      reactionCount: DEFAULT_TRENDING_THRESHOLD - 1, recipientId: "b",
    }, provider);
    expect(res.delivered).toBe(false);
    expect(provider.sent).toHaveLength(0);
  });
});

describe("dispatchPush — moderation suppression integration", () => {
  it("does NOT deliver a queued comment push after the confession is moderated away", async () => {
    const provider = makeProvider();
    // Candidate identified, then moderator deletes the confession before dispatch.
    existing.confessions.delete("conf-1");
    const res = await dispatchPush({
      kind: "new_comment", confessionId: "conf-1", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    }, provider);
    expect(res.delivered).toBe(false);
    expect(res.reason).toBe("confession_deleted");
    expect(provider.sent).toHaveLength(0);
  });

  it("does NOT deliver a reply push after the parent comment is moderated away", async () => {
    const provider = makeProvider();
    existing.comments.delete("cmt-parent");
    const res = await dispatchPush({
      kind: "new_reply", parentCommentId: "cmt-parent", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    }, provider);
    expect(res.delivered).toBe(false);
    expect(res.reason).toBe("parent_deleted");
    expect(provider.sent).toHaveLength(0);
  });

  it("does NOT deliver a trending push after the confession is moderated away", async () => {
    const provider = makeProvider();
    existing.confessions.delete("conf-1");
    const res = await dispatchPush({
      kind: "trending", confessionId: "conf-1",
      reactionCount: DEFAULT_TRENDING_THRESHOLD + 10, recipientId: "b",
    }, provider);
    expect(res.delivered).toBe(false);
    expect(provider.sent).toHaveLength(0);
  });
});

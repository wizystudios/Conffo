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

import {
  dispatchPush,
  __resetDispatcherState,
  buildIdempotencyKey,
  getDelivery,
  type PushProvider,
} from "./pushDispatcher";
import { __resetPushGateState, DEFAULT_TRENDING_THRESHOLD } from "./pushNotificationGate";

function provider(behaviour: ("ok" | "fail")[]): PushProvider & { calls: number } {
  let i = 0;
  return {
    calls: 0,
    async send() {
      this.calls++;
      const r = behaviour[Math.min(i, behaviour.length - 1)];
      i++;
      if (r === "fail") throw new Error("provider down");
    },
  };
}

const noSleep = () => Promise.resolve();

beforeEach(() => {
  existing.confessions = new Set(["conf-1"]);
  existing.comments = new Set(["cmt-1", "cmt-parent"]);
  __resetPushGateState();
  __resetDispatcherState();
});

describe("dispatchPush — delivery + status tracking", () => {
  it("delivers and records a delivered status with attempts=1", async () => {
    const p = provider(["ok"]);
    const evt = {
      kind: "new_comment" as const, confessionId: "conf-1", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    };
    const res = await dispatchPush(evt, p, { sleepFn: noSleep });
    expect(res.delivered).toBe(true);
    expect(res.status).toBe("delivered");
    expect(res.attempts).toBe(1);
    expect(getDelivery(res.idempotencyKey)?.status).toBe("delivered");
  });

  it("records suppressed status when the gate blocks", async () => {
    existing.confessions.delete("conf-1");
    const p = provider(["ok"]);
    const res = await dispatchPush({
      kind: "new_comment", confessionId: "conf-1", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    }, p, { sleepFn: noSleep });
    expect(res.status).toBe("suppressed");
    expect(p.calls).toBe(0);
  });
});

describe("dispatchPush — exponential backoff retries", () => {
  it("retries on transient failure and eventually delivers", async () => {
    const p = provider(["fail", "fail", "ok"]);
    const waits: number[] = [];
    const res = await dispatchPush(
      { kind: "new_comment", confessionId: "conf-1", commentId: "cmt-1", authorId: "a", recipientId: "b" },
      p,
      { sleepFn: (ms) => { waits.push(ms); return Promise.resolve(); } },
    );
    expect(res.status).toBe("delivered");
    expect(res.attempts).toBe(3);
    // exponential: base 200 → 200, 400
    expect(waits).toEqual([200, 400]);
  });

  it("marks dead after MAX_ATTEMPTS failures", async () => {
    const p = provider(["fail", "fail", "fail", "fail"]);
    const res = await dispatchPush(
      { kind: "new_comment", confessionId: "conf-1", commentId: "cmt-1", authorId: "a", recipientId: "b" },
      p,
      { sleepFn: noSleep },
    );
    expect(res.delivered).toBe(false);
    expect(res.status).toBe("dead");
    expect(res.attempts).toBe(4);
  });
});

describe("dispatchPush — idempotency keys", () => {
  it("generates a stable key per event", () => {
    const k1 = buildIdempotencyKey({ kind: "new_comment", confessionId: "c", commentId: "m", authorId: "a", recipientId: "b" });
    const k2 = buildIdempotencyKey({ kind: "new_comment", confessionId: "c", commentId: "m", authorId: "a", recipientId: "b" });
    expect(k1).toBe(k2);
  });

  it("never re-delivers when the same event is dispatched twice (webhook retry)", async () => {
    const p = provider(["ok", "ok"]);
    const evt = {
      kind: "new_comment" as const, confessionId: "conf-1", commentId: "cmt-1",
      authorId: "a", recipientId: "b",
    };
    const first = await dispatchPush(evt, p, { sleepFn: noSleep });
    const second = await dispatchPush(evt, p, { sleepFn: noSleep });
    expect(first.delivered).toBe(true);
    expect(second.delivered).toBe(false);
    expect(second.reason).toBe("already_delivered");
    expect(p.calls).toBe(1); // provider invoked exactly once across retries
  });

  it("does not retry after a dead delivery", async () => {
    const p = provider(["fail", "fail", "fail", "fail", "ok"]);
    const evt = {
      kind: "trending" as const, confessionId: "conf-1",
      reactionCount: DEFAULT_TRENDING_THRESHOLD, recipientId: "b",
    };
    await dispatchPush(evt, p, { sleepFn: noSleep });
    const replay = await dispatchPush(evt, p, { sleepFn: noSleep });
    expect(replay.reason).toBe("previously_dead");
    expect(p.calls).toBe(4); // not 5
  });
});

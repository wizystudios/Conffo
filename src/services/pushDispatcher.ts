// Wraps the gate + push provider with:
//   - idempotency keys so provider/webhook retries cannot duplicate a delivery
//   - exponential backoff retries on transient provider failures
//   - delivery status tracking via in-memory store (mirrors push_deliveries DB shape)
import { shouldFirePush, type PushEvent, type GateResult } from "./pushNotificationGate";

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
}

export interface PushProvider {
  /** Throw to signal a retryable failure. */
  send(recipientId: string, payload: PushPayload): Promise<void>;
}

export type DeliveryStatus = "pending" | "delivered" | "failed" | "dead" | "suppressed";

export interface DeliveryRecord {
  idempotencyKey: string;
  recipientId: string;
  kind: PushEvent["kind"];
  status: DeliveryStatus;
  attempts: number;
  lastError?: string;
  deliveredAt?: number;
}

export interface DispatchResult extends GateResult {
  delivered: boolean;
  idempotencyKey: string;
  attempts: number;
  status: DeliveryStatus;
}

export const MAX_ATTEMPTS = 4;
export const BASE_BACKOFF_MS = 200; // 200, 400, 800, 1600

const deliveries = new Map<string, DeliveryRecord>();

export function __resetDispatcherState() {
  deliveries.clear();
}

export function getDelivery(key: string): DeliveryRecord | undefined {
  return deliveries.get(key);
}

export function buildIdempotencyKey(event: PushEvent): string {
  switch (event.kind) {
    case "new_comment":
      return `cmt:${event.recipientId}:${event.confessionId}:${event.commentId}`;
    case "new_reply":
      return `rpl:${event.recipientId}:${event.parentCommentId}:${event.commentId}`;
    case "trending":
      return `trd:${event.recipientId}:${event.confessionId}`;
  }
}

function buildPayload(event: PushEvent): PushPayload {
  switch (event.kind) {
    case "new_comment":
      return { title: "New comment", body: "Someone commented on your confession", tag: `cmt-${event.confessionId}` };
    case "new_reply":
      return { title: "New reply", body: "Someone replied to your comment", tag: `rpl-${event.parentCommentId}` };
    case "trending":
      return { title: "Trending", body: "Your confession is trending", tag: `trd-${event.confessionId}` };
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface DispatchOptions {
  maxAttempts?: number;
  baseBackoffMs?: number;
  /** Inject a sleep impl in tests to avoid real delays. */
  sleepFn?: (ms: number) => Promise<void>;
}

export async function dispatchPush(
  event: PushEvent,
  provider: PushProvider,
  opts: DispatchOptions = {},
  now: number = Date.now(),
): Promise<DispatchResult> {
  const key = buildIdempotencyKey(event);

  // Idempotency: if we've already delivered (or marked dead), no-op.
  const existing = deliveries.get(key);
  if (existing && (existing.status === "delivered" || existing.status === "dead")) {
    return {
      fire: false,
      reason: existing.status === "delivered" ? "already_delivered" : "previously_dead",
      delivered: existing.status === "delivered",
      idempotencyKey: key,
      attempts: existing.attempts,
      status: existing.status,
    };
  }

  const gate = await shouldFirePush(event, now);
  if (!gate.fire) {
    const record: DeliveryRecord = {
      idempotencyKey: key,
      recipientId: event.recipientId,
      kind: event.kind,
      status: "suppressed",
      attempts: 0,
      lastError: gate.reason,
    };
    deliveries.set(key, record);
    return { ...gate, delivered: false, idempotencyKey: key, attempts: 0, status: "suppressed" };
  }

  const max = opts.maxAttempts ?? MAX_ATTEMPTS;
  const base = opts.baseBackoffMs ?? BASE_BACKOFF_MS;
  const wait = opts.sleepFn ?? sleep;

  const record: DeliveryRecord = {
    idempotencyKey: key,
    recipientId: event.recipientId,
    kind: event.kind,
    status: "pending",
    attempts: 0,
  };
  deliveries.set(key, record);

  let lastErr: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    record.attempts = attempt;
    try {
      await provider.send(event.recipientId, buildPayload(event));
      record.status = "delivered";
      record.deliveredAt = Date.now();
      record.lastError = undefined;
      return { ...gate, delivered: true, idempotencyKey: key, attempts: attempt, status: "delivered" };
    } catch (e) {
      lastErr = e;
      record.lastError = e instanceof Error ? e.message : String(e);
      record.status = attempt >= max ? "dead" : "failed";
      if (attempt >= max) break;
      await wait(base * 2 ** (attempt - 1));
    }
  }

  return {
    fire: true,
    reason: "exhausted",
    delivered: false,
    idempotencyKey: key,
    attempts: record.attempts,
    status: record.status,
  };
}

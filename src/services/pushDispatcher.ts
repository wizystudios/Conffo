// Thin wrapper around the gate + push provider. Tests inject a mock provider
// to assert that pushes are (or aren't) delivered for each event type.
import { shouldFirePush, type PushEvent, type GateResult } from "./pushNotificationGate";

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
}

export interface PushProvider {
  send(recipientId: string, payload: PushPayload): Promise<void>;
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

export interface DispatchResult extends GateResult {
  delivered: boolean;
}

export async function dispatchPush(
  event: PushEvent,
  provider: PushProvider,
  now: number = Date.now(),
): Promise<DispatchResult> {
  const gate = await shouldFirePush(event, now);
  if (!gate.fire) return { ...gate, delivered: false };
  await provider.send(event.recipientId, buildPayload(event));
  return { ...gate, delivered: true };
}

import { describe, it, expect } from "vitest";
import { DEFAULT_PREFS, isAllowedByPrefs } from "./notificationPreferences";

describe("isAllowedByPrefs", () => {
  it("allows everything by default", () => {
    expect(isAllowedByPrefs(DEFAULT_PREFS, "new_comment")).toBe(true);
    expect(isAllowedByPrefs(DEFAULT_PREFS, "new_reply")).toBe(true);
    expect(isAllowedByPrefs(DEFAULT_PREFS, "trending")).toBe(true);
  });

  it("respects per-kind toggles", () => {
    expect(isAllowedByPrefs({ ...DEFAULT_PREFS, comments_enabled: false }, "new_comment")).toBe(false);
    expect(isAllowedByPrefs({ ...DEFAULT_PREFS, replies_enabled: false }, "new_reply")).toBe(false);
    expect(isAllowedByPrefs({ ...DEFAULT_PREFS, trending_enabled: false }, "trending")).toBe(false);
  });

  it("respects per-room overrides", () => {
    const p = { ...DEFAULT_PREFS, room_overrides: { "r1": false } };
    expect(isAllowedByPrefs(p, "new_comment", { roomId: "r1" })).toBe(false);
    expect(isAllowedByPrefs(p, "new_comment", { roomId: "r2" })).toBe(true);
  });

  it("respects per-topic overrides", () => {
    const p = { ...DEFAULT_PREFS, topic_overrides: { "t1": false } };
    expect(isAllowedByPrefs(p, "trending", { topicId: "t1" })).toBe(false);
  });
});

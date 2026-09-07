import { describe, expect, it } from "vitest";
import { computeBacklogRoundIds, isRoundActionable } from "@/hooks/useDrawHistory";

describe("computeBacklogRoundIds", () => {
  it("returns nothing when there is no current round or only round 1 is open", () => {
    expect(computeBacklogRoundIds(undefined, 10)).toEqual([]);
    expect(computeBacklogRoundIds(1n, 10)).toEqual([]);
  });

  it("returns every completed round, most-recent-first, when fewer than `count`", () => {
    // currentRoundId = 4 means rounds 1, 2, 3 have completed.
    expect(computeBacklogRoundIds(4n, 10)).toEqual([3n, 2n, 1n]);
  });

  it("bounds the scan to `count` rounds even with a much longer history", () => {
    // 1000 completed rounds (currentRoundId = 1001), but only look back 20 — this is exactly
    // the fix for "only currentRoundId - 1 was ever inspected": the window is now configurable
    // and, critically, starts from the most recent completed round and looks *backward* rather
    // than only ever containing a single entry.
    const ids = computeBacklogRoundIds(1001n, 20);
    expect(ids.length).toBe(20);
    expect(ids[0]).toBe(1000n); // most recent completed round
    expect(ids[ids.length - 1]).toBe(981n); // oldest round still within the backlog window
  });
});

describe("isRoundActionable", () => {
  it("is actionable when awaiting randomness (state 1)", () => {
    expect(isRoundActionable({ state: 1, claimed: false })).toBe(true);
  });

  it("is actionable when awarded and unclaimed (state 2, not claimed)", () => {
    expect(isRoundActionable({ state: 2, claimed: false })).toBe(true);
  });

  it("is not actionable when awarded and already claimed", () => {
    expect(isRoundActionable({ state: 2, claimed: true })).toBe(false);
  });

  it("is not actionable when open, claimed, or expired (states 0, 3, 4)", () => {
    expect(isRoundActionable({ state: 0, claimed: false })).toBe(false);
    expect(isRoundActionable({ state: 3, claimed: true })).toBe(false);
    expect(isRoundActionable({ state: 4, claimed: false })).toBe(false);
  });
});

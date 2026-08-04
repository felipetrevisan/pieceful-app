import { describe, expect, test } from "bun:test";
import {
  STORE_REVIEW_COOLDOWN_MS,
  shouldRequestStoreReview,
  type StoreReviewHistory,
} from "./store-review-policy";

const now = new Date("2026-08-03T12:00:00.000Z");

function history(overrides: Partial<StoreReviewHistory> = {}): StoreReviewHistory {
  return {
    completedPuzzlesAtLastRequest: 3,
    lastRequestedAt: new Date(now.getTime() - STORE_REVIEW_COOLDOWN_MS).toISOString(),
    lastRequestedPuzzleId: "puzzle-3",
    ...overrides,
  };
}

describe("store review policy", () => {
  test("waits until three puzzles have been completed", () => {
    expect(
      shouldRequestStoreReview({ completedPuzzles: 2, history: null, now, puzzleId: "puzzle-2" }),
    ).toBe(false);
    expect(
      shouldRequestStoreReview({ completedPuzzles: 3, history: null, now, puzzleId: "puzzle-3" }),
    ).toBe(true);
  });

  test("does not request twice for the same completed puzzle", () => {
    expect(
      shouldRequestStoreReview({
        completedPuzzles: 8,
        history: history(),
        now,
        puzzleId: "puzzle-3",
      }),
    ).toBe(false);
  });

  test("requires five more completions and a ninety day cooldown", () => {
    expect(
      shouldRequestStoreReview({
        completedPuzzles: 7,
        history: history(),
        now,
        puzzleId: "puzzle-7",
      }),
    ).toBe(false);
    expect(
      shouldRequestStoreReview({
        completedPuzzles: 8,
        history: history({ lastRequestedAt: now.toISOString() }),
        now,
        puzzleId: "puzzle-8",
      }),
    ).toBe(false);
    expect(
      shouldRequestStoreReview({
        completedPuzzles: 8,
        history: history(),
        now,
        puzzleId: "puzzle-8",
      }),
    ).toBe(true);
  });
});

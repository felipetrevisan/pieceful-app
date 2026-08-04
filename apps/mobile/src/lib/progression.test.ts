import { describe, expect, test } from "bun:test";
import type { MobilePuzzle } from "@/state/app-provider";
import { getPlayerProgression, getPuzzleXp, xpToReachLevel } from "./progression";

function puzzle(
  overrides: {
    total?: number;
    placed?: number;
    completed?: boolean;
    rotation?: boolean;
    hints?: number;
  } = {},
) {
  const total = overrides.total ?? 12;
  const placed = overrides.placed ?? 0;
  return {
    configuration: {
      totalPieces: total,
      rows: 3,
      columns: Math.max(2, total / 3),
      rotationEnabled: overrides.rotation ?? false,
      hintsEnabled: true,
      referenceEnabled: true,
      timerEnabled: true,
    },
    session: {
      completedAt: overrides.completed ? "2026-08-01T00:00:00Z" : null,
      hintsUsed: overrides.hints ?? 0,
      pieces: Array.from({ length: total }, (_, index) => ({ isPlaced: index < placed })),
    },
  } as MobilePuzzle;
}

describe("mobile progression", () => {
  test("awards one XP per placed piece before completion", () => {
    expect(getPuzzleXp(puzzle({ placed: 7 }))).toBe(7);
  });

  test("awards completion, rotation, difficulty and no-hint bonuses", () => {
    expect(getPuzzleXp(puzzle({ total: 300, placed: 300, completed: true, rotation: true }))).toBe(
      1_063,
    );
  });

  test("does not award the no-hint bonus after using a hint", () => {
    expect(getPuzzleXp(puzzle({ placed: 12, completed: true, hints: 1 }))).toBe(512);
  });

  test("derives level and completion counts from puzzles", () => {
    const result = getPlayerProgression([
      puzzle({ placed: 12, completed: true }),
      puzzle({ placed: 5 }),
    ]);
    expect(result.totalXp).toBe(617);
    expect(result.level).toBe(2);
    expect(result.completedPuzzles).toBe(1);
    expect(result.placedPieces).toBe(17);
  });

  test("keeps the level curve stable", () => {
    expect(xpToReachLevel(10)).toBe(5_400);
    expect(xpToReachLevel(100)).toBe(170_775);
  });
});

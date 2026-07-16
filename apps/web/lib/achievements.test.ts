import { describe, expect, test } from "bun:test";
import { eligibleAchievements } from "./achievements";

describe("achievements", () => {
  test("unlocks milestones without repeating unlocked achievements", () => {
    const result = eligibleAchievements(
      { placedPieces: 12, totalPieces: 48, hintsUsed: 0, elapsedTime: 60, completed: false },
      new Set(["first-fit"]),
    );
    expect(result.map(({ id }) => id)).toEqual(["momentum"]);
  });

  test("unlocks completion achievements according to the challenge", () => {
    const result = eligibleAchievements(
      { placedPieces: 1000, totalPieces: 1000, hintsUsed: 0, elapsedTime: 590, completed: true },
      new Set(["first-fit", "momentum", "halfway-there"]),
    );
    expect(result.map(({ id }) => id)).toEqual([
      "pure-instinct",
      "against-the-clock",
      "century",
      "puzzle-master",
      "pieceful-legend",
    ]);
  });
});

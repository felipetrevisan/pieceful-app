import { describe, expect, test } from "bun:test";
import { orientPuzzleGrid, resolvePuzzleOrientation, validateConfiguration } from "./index";

describe("shared puzzle contracts", () => {
  test("detects portrait photos and orients the grid", () => {
    expect(resolvePuzzleOrientation("automatic", 900, 1600)).toBe("portrait");
    expect(orientPuzzleGrid(6, 8, "portrait")).toEqual({ rows: 8, columns: 6 });
  });

  test("normalizes a valid configuration", () => {
    expect(validateConfiguration({ rows: 4, columns: 6, rotationEnabled: true })).toEqual({
      rows: 4,
      columns: 6,
      totalPieces: 24,
      rotationEnabled: true,
      hintsEnabled: true,
      referenceEnabled: true,
      timerEnabled: true,
      magnetismEnabled: true,
    });
  });

  test("rejects grids outside the supported range", () => {
    expect(() => validateConfiguration({ rows: 1, columns: 2 })).toThrow();
    expect(() => validateConfiguration({ rows: 50, columns: 50 })).toThrow();
  });
});

import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import { describe, expect, test } from "bun:test";
import { applyPieceTransition } from "./puzzle-piece-transitions";

const flatShape = { top: "flat", right: "flat", bottom: "flat", left: "flat" } as const;

function piece(overrides: Partial<PuzzlePiece> & Pick<PuzzlePiece, "id" | "row" | "column">): PuzzlePiece {
  return {
    shape: flatShape,
    correctPosition: { x: overrides.column, y: overrides.row, rotation: 0 },
    currentPosition: { x: 0, y: 0, rotation: 0 },
    isPlaced: false,
    groupId: null,
    trayId: null,
    ...overrides,
  };
}

const context = { rows: 3, columns: 4, cell: 100, rotationEnabled: true, magnetismEnabled: true };

describe("applyPieceTransition", () => {
  test("returns null for an unknown piece id", () => {
    const result = applyPieceTransition(
      [piece({ id: "a", row: 0, column: 0 })],
      { id: "missing", x: 0, y: 0, rotation: 0, isPlaced: false, destination: "board" },
      context,
    );
    expect(result).toBeNull();
  });

  test("moves a piece to the drawer into the next open slot", () => {
    const pieces = [
      piece({ id: "a", row: 0, column: 0, currentPosition: { x: 1, y: 1, rotation: 0 } }),
      piece({ id: "b", row: 0, column: 1, trayId: "drawer" }),
    ];
    const result = applyPieceTransition(
      pieces,
      { id: "a", x: 9, y: 9, rotation: 0, isPlaced: false, destination: "drawer" },
      context,
    );
    const moved = result?.pieces.find((item) => item.id === "a");
    expect(result?.stored).toBe(true);
    expect(result?.connected).toBe(false);
    expect(moved?.trayId).toBe("drawer");
    expect(moved?.groupId).toBeNull();
    // One other piece already occupies a drawer slot, so this piece takes slot index 1.
    expect(moved?.currentPosition).toEqual({ x: 1 % context.columns, y: context.rows + 1.55, rotation: 0 });
  });

  test("translates a lone piece without snapping when no neighbor is close", () => {
    const pieces = [
      piece({ id: "a", row: 0, column: 0, currentPosition: { x: 2, y: 2, rotation: 0 } }),
      piece({ id: "b", row: 2, column: 3, currentPosition: { x: 20, y: 20, rotation: 0 } }),
    ];
    const result = applyPieceTransition(
      pieces,
      { id: "a", x: 5, y: 5, rotation: 0, isPlaced: false, destination: "board" },
      context,
    );
    const moved = result?.pieces.find((item) => item.id === "a");
    expect(result?.connected).toBe(false);
    expect(moved?.groupId).toBeNull();
    expect(moved?.currentPosition).toEqual({ x: 5, y: 5, rotation: 0 });
  });

  test("places a piece exactly at its correct position when dropped as placed", () => {
    const pieces = [piece({ id: "a", row: 0, column: 0, currentPosition: { x: 2, y: 2, rotation: 0 } })];
    const result = applyPieceTransition(
      pieces,
      { id: "a", x: 0.1, y: -0.2, rotation: 0, isPlaced: true, destination: "board" },
      context,
    );
    const moved = result?.pieces.find((item) => item.id === "a");
    expect(result?.connected).toBe(true);
    expect(result?.stored).toBe(false);
    expect(moved?.isPlaced).toBe(true);
    expect(moved?.groupId).toBe("tabuleiro");
    expect(moved?.currentPosition).toEqual({ x: 0, y: 0, rotation: 0 });
  });

  test("joins two adjacent loose pieces into a new group when dropped at the matching offset", () => {
    const pieces = [
      piece({ id: "a", row: 0, column: 0, currentPosition: { x: 10, y: 10, rotation: 0 } }),
      piece({ id: "b", row: 0, column: 1, currentPosition: { x: 5, y: 5, rotation: 0 } }),
    ];
    // b sits at (5,5); a's correct position is one column left of b's, so the
    // matching drop spot for a is exactly (4,5) with zero offset.
    const result = applyPieceTransition(
      pieces,
      { id: "a", x: 4, y: 5, rotation: 0, isPlaced: false, destination: "board" },
      context,
    );
    const movedA = result?.pieces.find((item) => item.id === "a");
    const movedB = result?.pieces.find((item) => item.id === "b");
    expect(result?.connected).toBe(true);
    expect(movedA?.groupId).toBe("grupo-b");
    expect(movedB?.groupId).toBe("grupo-b");
    expect(movedA?.currentPosition).toEqual({ x: 4, y: 5, rotation: 0 });
  });

  test("moves every member of an existing group by the same delta", () => {
    const pieces = [
      piece({
        id: "a",
        row: 0,
        column: 0,
        groupId: "g1",
        currentPosition: { x: 10, y: 10, rotation: 0 },
      }),
      piece({
        id: "c",
        row: 5,
        column: 5,
        groupId: "g1",
        currentPosition: { x: 20, y: 20, rotation: 0 },
      }),
    ];
    const result = applyPieceTransition(
      pieces,
      { id: "a", x: 13, y: 12, rotation: 0, isPlaced: false, destination: "board" },
      context,
    );
    const movedA = result?.pieces.find((item) => item.id === "a");
    const movedC = result?.pieces.find((item) => item.id === "c");
    // delta applied to "a" was (+3, +2); "c" must move by the same amount.
    expect(movedA?.currentPosition).toEqual({ x: 13, y: 12, rotation: 0 });
    expect(movedC?.currentPosition).toEqual({ x: 23, y: 22, rotation: 0 });
  });

  test("locks a grouped piece's rotation, ignoring the dragged rotation argument", () => {
    const pieces = [
      piece({
        id: "a",
        row: 0,
        column: 0,
        groupId: "g1",
        currentPosition: { x: 10, y: 10, rotation: 90 },
      }),
    ];
    const result = applyPieceTransition(
      pieces,
      { id: "a", x: 11, y: 11, rotation: 270, isPlaced: false, destination: "board" },
      context,
    );
    const movedA = result?.pieces.find((item) => item.id === "a");
    expect(movedA?.currentPosition.rotation).toBe(90);
  });

  test("does not form a new group when the moving piece is rotated, even at zero offset", () => {
    const pieces = [
      piece({ id: "a", row: 0, column: 0, currentPosition: { x: 10, y: 10, rotation: 0 } }),
      piece({ id: "b", row: 0, column: 1, currentPosition: { x: 5, y: 5, rotation: 0 } }),
    ];
    const result = applyPieceTransition(
      pieces,
      { id: "a", x: 4, y: 5, rotation: 90, isPlaced: false, destination: "board" },
      context,
    );
    const movedA = result?.pieces.find((item) => item.id === "a");
    expect(result?.connected).toBe(false);
    expect(movedA?.groupId).toBeNull();
  });

  test("does not join two adjacent pieces at an offset that would normally snap, when magnetism is disabled", () => {
    const pieces = [
      piece({ id: "a", row: 0, column: 0, currentPosition: { x: 10, y: 10, rotation: 0 } }),
      piece({ id: "b", row: 0, column: 1, currentPosition: { x: 5, y: 5, rotation: 0 } }),
    ];
    // The exact matching spot is (4,5); a 0.2 offset is well inside the default
    // tolerance (0.38) but outside the tight, magnetism-off tolerance (0.08).
    const withMagnetism = applyPieceTransition(
      pieces,
      { id: "a", x: 4.2, y: 5, rotation: 0, isPlaced: false, destination: "board" },
      context,
    );
    const withoutMagnetism = applyPieceTransition(
      pieces,
      { id: "a", x: 4.2, y: 5, rotation: 0, isPlaced: false, destination: "board" },
      { ...context, magnetismEnabled: false },
    );
    expect(withMagnetism?.connected).toBe(true);
    expect(withoutMagnetism?.connected).toBe(false);
    expect(withoutMagnetism?.pieces.find((item) => item.id === "a")?.groupId).toBeNull();
  });

  test("still clicks two adjacent pieces together at a near-exact offset when magnetism is disabled", () => {
    const pieces = [
      piece({ id: "a", row: 0, column: 0, currentPosition: { x: 10, y: 10, rotation: 0 } }),
      piece({ id: "b", row: 0, column: 1, currentPosition: { x: 5, y: 5, rotation: 0 } }),
    ];
    const result = applyPieceTransition(
      pieces,
      { id: "a", x: 4.02, y: 5, rotation: 0, isPlaced: false, destination: "board" },
      { ...context, magnetismEnabled: false },
    );
    expect(result?.connected).toBe(true);
    expect(result?.pieces.find((item) => item.id === "a")?.groupId).toBe("grupo-b");
  });

  test("brings the touched piece to the foreground of the returned order", () => {
    const pieces = [
      piece({ id: "a", row: 0, column: 0, currentPosition: { x: 10, y: 10, rotation: 0 } }),
      piece({ id: "untouched", row: 2, column: 3, currentPosition: { x: 30, y: 30, rotation: 0 } }),
    ];
    const result = applyPieceTransition(
      pieces,
      { id: "a", x: 11, y: 11, rotation: 0, isPlaced: false, destination: "board" },
      context,
    );
    expect(result?.pieces.at(-1)?.id).toBe("a");
  });
});

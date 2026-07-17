import { describe, expect, test } from "bun:test";
import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import { orderPiecesForDisplay } from "./puzzle-layer";

function piece(id: string, isPlaced: boolean, groupId: string | null = null): PuzzlePiece {
  return {
    id,
    row: 0,
    column: 0,
    shape: { top: "flat", right: "flat", bottom: "flat", left: "flat" },
    correctPosition: { x: 0, y: 0, rotation: 0 },
    currentPosition: { x: 0, y: 0, rotation: 0 },
    isPlaced,
    groupId,
    trayId: null,
  };
}

describe("camadas do tabuleiro", () => {
  test("desenha peças soltas depois da montagem pronta", () => {
    const loose = piece("loose", false);
    const placed = piece("placed", true, "board");
    expect(orderPiecesForDisplay([loose, placed], null, []).map(({ id }) => id)).toEqual([
      "placed",
      "loose",
    ]);
  });

  test("mantém todo o grupo selecionado na camada superior", () => {
    const first = piece("first", false, "group-1");
    const second = piece("second", false, "group-1");
    const loose = piece("loose", false);
    expect(orderPiecesForDisplay([first, second, loose], "first", []).map(({ id }) => id)).toEqual([
      "loose",
      "first",
      "second",
    ]);
  });
});

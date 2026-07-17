import { describe, expect, test } from "bun:test";
import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import type { SavedPuzzle } from "./puzzle-db";
import { recoverSavedPuzzle } from "./puzzle-db";

function savedPuzzle(rotationEnabled: boolean, rotation: number): SavedPuzzle {
  const piece: PuzzlePiece = {
    id: "piece-1",
    row: 0,
    column: 0,
    shape: { top: "flat", right: "flat", bottom: "flat", left: "flat" },
    correctPosition: { x: 0, y: 0, rotation: 0 },
    currentPosition: { x: 1, y: 1, rotation },
    isPlaced: false,
    groupId: null,
    trayId: null,
  };
  return {
    id: "puzzle-1",
    name: "Puzzle antigo",
    difficulty: "beginner",
    configuration: {
      rows: 2,
      columns: 3,
      totalPieces: 6,
      rotationEnabled,
      hintsEnabled: true,
      referenceEnabled: true,
      timerEnabled: true,
    },
    session: {
      puzzleId: "puzzle-1",
      seed: 1,
      pieces: [piece],
      elapsedTime: 0,
      hintsUsed: 0,
      camera: { x: 0, y: 0, zoom: 1 },
      activeRegion: null,
      completedAt: null,
    },
    image: new Blob(),
    updatedAt: "2026-07-17T12:00:00.000Z",
  };
}

describe("recuperação de partidas antigas", () => {
  test("reativa a rotação quando uma peça salva ainda precisa ser girada", () => {
    const recovered = recoverSavedPuzzle(savedPuzzle(false, 90));
    expect(recovered.configuration.rotationEnabled).toBe(true);
  });

  test("mantém a rotação desligada quando todas as peças já estão orientadas", () => {
    const recovered = recoverSavedPuzzle(savedPuzzle(false, 360));
    expect(recovered.configuration.rotationEnabled).toBe(false);
  });
});

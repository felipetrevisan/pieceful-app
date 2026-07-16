import type { PuzzleEdge, PuzzlePiece } from "./types";

const opposite = (edge: PuzzleEdge): PuzzleEdge => {
  if (edge === "tab") return "blank";
  if (edge === "blank") return "tab";
  return "flat";
};

function randomFromSeed(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePieces(rows: number, columns: number, seed: number): PuzzlePiece[] {
  const random = randomFromSeed(seed);
  const pieces: PuzzlePiece[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const above = row > 0 ? pieces[(row - 1) * columns + column] : undefined;
      const left = column > 0 ? pieces[row * columns + column - 1] : undefined;
      const top = above ? opposite(above.shape.bottom) : "flat";
      const leftEdge = left ? opposite(left.shape.right) : "flat";
      const right: PuzzleEdge = column === columns - 1 ? "flat" : random() > 0.5 ? "tab" : "blank";
      const bottom: PuzzleEdge = row === rows - 1 ? "flat" : random() > 0.5 ? "tab" : "blank";
      const index = row * columns + column;
      const angle = Math.floor(random() * 4) * 90;
      pieces.push({
        id: `peca-${index}`,
        row,
        column,
        shape: { top, right, bottom, left: leftEdge },
        correctPosition: { x: column, y: row, rotation: 0 },
        currentPosition: {
          x: -1.8 + random() * (columns + 3.6),
          y: -1.5 + random() * (rows + 3),
          rotation: angle,
        },
        isPlaced: false,
        groupId: null,
        trayId: index < 2 * (rows + columns - 2) ? "bordas" : "centro",
      });
    }
  }
  return pieces;
}

import type { PuzzlePiece } from "@puzzled/puzzle-engine";

export function orderPiecesForDisplay(
  pieces: PuzzlePiece[],
  selectedId: string | null,
  draggingIds: readonly string[],
): PuzzlePiece[] {
  const selected = pieces.find((piece) => piece.id === selectedId && !piece.isPlaced);
  const activeIds = new Set(draggingIds);
  if (selected) {
    activeIds.add(selected.id);
    if (selected.groupId) {
      for (const piece of pieces) {
        if (!piece.isPlaced && piece.groupId === selected.groupId) activeIds.add(piece.id);
      }
    }
  }

  const layer = (piece: PuzzlePiece) => {
    if (activeIds.has(piece.id)) return 2;
    return piece.isPlaced ? 0 : 1;
  };

  return pieces
    .map((piece, index) => ({ piece, index }))
    .sort((left, right) => layer(left.piece) - layer(right.piece) || left.index - right.index)
    .map(({ piece }) => piece);
}

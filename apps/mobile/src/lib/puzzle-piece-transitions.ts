import { neighborSnapOffset, normalizeQuarterTurn, type PuzzlePiece } from "@puzzled/puzzle-engine";

export interface PieceTransitionInput {
  id: string;
  x: number;
  y: number;
  rotation: number;
  isPlaced: boolean;
  destination: "board" | "drawer";
}

export interface PieceTransitionContext {
  rows: number;
  columns: number;
  cell: number;
  rotationEnabled: boolean;
  magnetismEnabled: boolean;
}

export interface PieceTransitionResult {
  pieces: PuzzlePiece[];
  stored: boolean;
  connected: boolean;
}

export function applyPieceTransition(
  pieces: PuzzlePiece[],
  input: PieceTransitionInput,
  context: PieceTransitionContext,
): PieceTransitionResult | null {
  const { id, x, y, rotation, isPlaced, destination } = input;
  const { rows, columns, cell, rotationEnabled, magnetismEnabled } = context;
  const movingPiece = pieces.find((piece) => piece.id === id);
  if (!movingPiece) return null;
  const effectiveRotation = rotationEnabled
    ? movingPiece.groupId
      ? normalizeQuarterTurn(movingPiece.currentPosition.rotation)
      : normalizeQuarterTurn(rotation)
    : 0;
  const storedSlot = pieces.filter(
    (piece) => piece.id !== id && !piece.isPlaced && piece.trayId !== null,
  ).length;
  if (destination === "drawer") {
    const next = pieces.map((piece) =>
      piece.id === id
        ? {
            ...piece,
            isPlaced: false,
            groupId: null,
            trayId: "drawer",
            currentPosition: {
              x: storedSlot % columns,
              y: rows + 1.55 + Math.floor(storedSlot / columns) * 1.18,
              rotation: effectiveRotation,
            },
          }
        : piece,
    );
    return { pieces: next, stored: true, connected: false };
  }

  const memberIds = new Set(
    movingPiece.groupId && movingPiece.groupId !== "tabuleiro"
      ? pieces.filter((piece) => piece.groupId === movingPiece.groupId).map((piece) => piece.id)
      : [id],
  );
  const deltaX = x - movingPiece.currentPosition.x;
  const deltaY = y - movingPiece.currentPosition.y;
  let next = pieces.map((piece) =>
    memberIds.has(piece.id)
      ? {
          ...piece,
          trayId: null,
          currentPosition: {
            x: piece.currentPosition.x + deltaX,
            y: piece.currentPosition.y + deltaY,
            rotation: normalizeQuarterTurn(
              piece.id === id ? effectiveRotation : piece.currentPosition.rotation,
            ),
          },
        }
      : piece,
  );

  let connected = false;
  if (isPlaced) {
    next = next.map((piece) =>
      memberIds.has(piece.id)
        ? {
            ...piece,
            isPlaced: true,
            groupId: "tabuleiro",
            currentPosition: { ...piece.correctPosition },
          }
        : piece,
    );
    connected = true;
  } else {
    let match: { offsetX: number; offsetY: number; stationary: PuzzlePiece } | null = null;
    const movingMembers = next.filter((piece) => memberIds.has(piece.id));
    for (const moving of movingMembers) {
      // Connected groups are locked against rotation. Only correctly oriented
      // loose pieces may create a new group, avoiding an unsolvable rotated set.
      if (normalizeQuarterTurn(moving.currentPosition.rotation) !== 0) continue;
      for (const stationary of next) {
        if (memberIds.has(stationary.id) || stationary.trayId !== null) continue;
        if (normalizeQuarterTurn(stationary.currentPosition.rotation) !== 0) continue;
        // With magnetism off, neighbors only connect when dropped almost exactly
        // adjacent instead of the generous default forgiveness radius.
        const neighborTolerance = magnetismEnabled
          ? Math.min(0.68, Math.max(0.38, 10 / Math.max(1, cell)))
          : Math.min(0.15, Math.max(0.08, 4 / Math.max(1, cell)));
        const offset = neighborSnapOffset(moving, stationary, neighborTolerance);
        if (offset) {
          match = { offsetX: offset.x, offsetY: offset.y, stationary };
          break;
        }
      }
      if (match) break;
    }

    if (match) {
      const connectedIds = new Set(
        match.stationary.groupId
          ? next.filter((piece) => piece.groupId === match?.stationary.groupId).map((piece) => piece.id)
          : [match.stationary.id],
      );
      const groupId = match.stationary.isPlaced
        ? "tabuleiro"
        : (match.stationary.groupId ?? movingPiece.groupId ?? `grupo-${match.stationary.id}`);
      next = next.map((piece) => {
        if (memberIds.has(piece.id)) {
          return {
            ...piece,
            groupId,
            isPlaced: groupId === "tabuleiro",
            currentPosition: {
              ...piece.currentPosition,
              x: piece.currentPosition.x + match.offsetX,
              y: piece.currentPosition.y + match.offsetY,
            },
          };
        }
        return connectedIds.has(piece.id)
          ? { ...piece, groupId, isPlaced: groupId === "tabuleiro" }
          : piece;
      });
      connected = true;
    }
  }

  // Loose pieces and movable groups that were just touched stay above other
  // loose pieces. Placed pieces keep their lower board layer.
  const resolvedMovingPiece = next.find((piece) => piece.id === id);
  if (resolvedMovingPiece && !resolvedMovingPiece.isPlaced) {
    const foregroundIds = new Set(
      resolvedMovingPiece.groupId && resolvedMovingPiece.groupId !== "tabuleiro"
        ? next.filter((piece) => piece.groupId === resolvedMovingPiece.groupId).map((piece) => piece.id)
        : memberIds,
    );
    next = [
      ...next.filter((piece) => !foregroundIds.has(piece.id)),
      ...next.filter((piece) => foregroundIds.has(piece.id)),
    ];
  }

  return { pieces: next, stored: false, connected };
}

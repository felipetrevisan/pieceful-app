export type PuzzleEdge = "flat" | "tab" | "blank";

export interface PuzzlePieceShape {
  top: PuzzleEdge;
  right: PuzzleEdge;
  bottom: PuzzleEdge;
  left: PuzzleEdge;
}

export interface PuzzlePiecePosition {
  x: number;
  y: number;
  rotation: number;
}

export interface PuzzlePiece {
  id: string;
  row: number;
  column: number;
  shape: PuzzlePieceShape;
  correctPosition: PuzzlePiecePosition;
  currentPosition: PuzzlePiecePosition;
  isPlaced: boolean;
  groupId: string | null;
  trayId: string | null;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface PuzzleSession {
  puzzleId: string;
  seed: number;
  pieces: PuzzlePiece[];
  elapsedTime: number;
  hintsUsed: number;
  camera: Camera;
  activeRegion: string | null;
  completedAt: string | null;
}

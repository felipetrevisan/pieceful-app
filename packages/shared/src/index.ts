export type PuzzleDifficulty =
  | "beginner"
  | "easy"
  | "normal"
  | "medium"
  | "hard"
  | "advanced"
  | "master"
  | "legendary"
  | "custom";

export interface DifficultyPreset {
  id: PuzzleDifficulty;
  label: string;
  rows: number;
  columns: number;
  pieces: number;
}

export const DIFFICULTIES: readonly DifficultyPreset[] = [
  { id: "beginner", label: "Iniciante", rows: 3, columns: 4, pieces: 12 },
  { id: "easy", label: "Fácil", rows: 4, columns: 6, pieces: 24 },
  { id: "normal", label: "Normal", rows: 6, columns: 8, pieces: 48 },
  { id: "medium", label: "Médio", rows: 8, columns: 12, pieces: 96 },
  { id: "hard", label: "Difícil", rows: 10, columns: 15, pieces: 150 },
  { id: "advanced", label: "Avançado", rows: 15, columns: 20, pieces: 300 },
  { id: "master", label: "Mestre", rows: 20, columns: 25, pieces: 500 },
  { id: "legendary", label: "Lendário", rows: 25, columns: 40, pieces: 1000 },
] as const;

export interface PuzzleConfiguration {
  rows: number;
  columns: number;
  totalPieces: number;
  rotationEnabled: boolean;
  hintsEnabled: boolean;
  referenceEnabled: boolean;
  timerEnabled: boolean;
}

export interface StoredPuzzleSummary {
  id: string;
  name: string;
  image: Blob;
  difficulty: PuzzleDifficulty;
  configuration: PuzzleConfiguration;
  progress: number;
  updatedAt: string;
}

export function validateConfiguration(value: unknown): PuzzleConfiguration {
  if (!value || typeof value !== "object") throw new Error("Configuração ausente.");
  const candidate = value as Record<string, unknown>;
  const rows = Number(candidate.rows);
  const columns = Number(candidate.columns);
  const totalPieces = rows * columns;
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(columns) ||
    totalPieces < 6 ||
    totalPieces > 1000
  ) {
    throw new Error("A grade deve ter entre 6 e 1.000 peças.");
  }
  return {
    rows,
    columns,
    totalPieces,
    rotationEnabled: candidate.rotationEnabled === true,
    hintsEnabled: candidate.hintsEnabled !== false,
    referenceEnabled: candidate.referenceEnabled !== false,
    timerEnabled: candidate.timerEnabled !== false,
  };
}

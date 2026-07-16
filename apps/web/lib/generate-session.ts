import type { PuzzlePiece, PuzzleSession } from "@puzzled/puzzle-engine";

interface WorkerResponse {
  ok: boolean;
  pieces?: PuzzlePiece[];
  message?: string;
}

export function generateSession(
  puzzleId: string,
  rows: number,
  columns: number,
  seed: number,
): Promise<PuzzleSession> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/puzzle.worker.ts", import.meta.url));
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("A geração demorou mais que o esperado. Tente novamente."));
    }, 20_000);
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      window.clearTimeout(timeout);
      worker.terminate();
      if (!event.data.ok || !event.data.pieces) {
        reject(new Error(event.data.message ?? "Falha ao gerar as peças."));
        return;
      }
      const large = event.data.pieces.length > 150;
      const pieces = event.data.pieces.map((piece, index) => ({
        ...piece,
        trayId: large && index >= 24 ? piece.trayId : null,
      }));
      resolve({
        puzzleId,
        seed,
        pieces,
        elapsedTime: 0,
        hintsUsed: 0,
        camera: { x: 0, y: 0, zoom: 1 },
        activeRegion: "centro",
        completedAt: null,
        timelapse: {
          initial: pieces.map((piece) => ({
            id: piece.id,
            x: piece.currentPosition.x,
            y: piece.currentPosition.y,
            rotation: piece.currentPosition.rotation,
            isPlaced: piece.isPlaced,
            visible: piece.trayId === null,
          })),
          frames: [],
        },
      });
    };
    worker.onerror = () => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(new Error("O gerador de peças encontrou um problema."));
    };
    worker.postMessage({ rows, columns, seed });
  });
}

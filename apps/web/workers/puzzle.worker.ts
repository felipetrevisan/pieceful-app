/// <reference lib="webworker" />
import { generatePieces } from "@puzzled/puzzle-engine";

interface GenerateMessage {
  rows: number;
  columns: number;
  seed: number;
}

self.onmessage = (event: MessageEvent<GenerateMessage>) => {
  const { rows, columns, seed } = event.data;
  try {
    self.postMessage({ ok: true, pieces: generatePieces(rows, columns, seed) });
  } catch (error) {
    self.postMessage({
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao gerar as peças.",
    });
  }
};

import type { PuzzleSession } from "@puzzled/puzzle-engine";
import type { PuzzleConfiguration, PuzzleDifficulty } from "@puzzled/shared";
import type { PhotoCredit } from "./unsplash";

const DB_NAME = "meu-quebra-cabeca";
const STORE = "partidas";
const VERSION = 2;

export interface SavedPuzzle {
  id: string;
  name: string;
  difficulty: PuzzleDifficulty;
  configuration: PuzzleConfiguration;
  session: PuzzleSession;
  image: Blob;
  photoCredit?: PhotoCredit | null | undefined;
  updatedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE))
        database.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Não foi possível abrir o armazenamento local."));
  });
}

export async function savePuzzle(puzzle: SavedPuzzle): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(puzzle);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Não foi possível salvar o progresso."));
  });
  database.close();
}

export async function listPuzzles(): Promise<SavedPuzzle[]> {
  const database = await openDatabase();
  const result = await new Promise<SavedPuzzle[]>((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as SavedPuzzle[]);
    request.onerror = () => reject(new Error("Não foi possível carregar suas partidas."));
  });
  database.close();
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPuzzle(id: string): Promise<SavedPuzzle | null> {
  const database = await openDatabase();
  const result = await new Promise<SavedPuzzle | undefined>((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as SavedPuzzle | undefined);
    request.onerror = () => reject(new Error("Não foi possível restaurar esta partida."));
  });
  database.close();
  return result ?? null;
}

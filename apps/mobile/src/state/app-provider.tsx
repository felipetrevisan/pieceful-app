import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  generatePieces,
  type Camera,
  type PuzzlePiece,
  type PuzzleSession,
} from "@puzzled/puzzle-engine";
import type { PuzzleConfiguration, PuzzleDifficulty } from "@puzzled/shared";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppLanguage = "pt-BR" | "en";
export type MobileTheme = "cosmic" | "candy" | "cyberpunk";

export interface MobilePuzzle {
  id: string;
  name: string;
  imageUri: string;
  difficulty: PuzzleDifficulty;
  configuration: PuzzleConfiguration;
  session: PuzzleSession;
  createdAt: string;
  updatedAt: string;
}

interface CreatePuzzleInput {
  name: string;
  imageUri: string;
  difficulty: PuzzleDifficulty;
  configuration: PuzzleConfiguration;
}

interface AppState {
  ready: boolean;
  language: AppLanguage;
  theme: MobileTheme;
  puzzles: MobilePuzzle[];
  setLanguage: (language: AppLanguage) => void;
  setTheme: (theme: MobileTheme) => void;
  createPuzzle: (input: CreatePuzzleInput) => MobilePuzzle;
  updatePuzzlePieces: (id: string, pieces: PuzzlePiece[]) => void;
  updatePuzzleCamera: (id: string, camera: Camera) => void;
  deletePuzzle: (id: string) => void;
  t: (portuguese: string, english: string) => string;
}

const STORAGE_KEY = "pieceful-mobile-state-v1";

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<AppLanguage>("pt-BR");
  const [theme, setThemeState] = useState<MobileTheme>("cosmic");
  const [puzzles, setPuzzles] = useState<MobilePuzzle[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as Partial<{
          language: AppLanguage;
          theme: MobileTheme;
          puzzles: MobilePuzzle[];
        }>;
        if (parsed.language === "en" || parsed.language === "pt-BR") {
          setLanguageState(parsed.language);
        }
        if (["cosmic", "candy", "cyberpunk"].includes(parsed.theme ?? "")) {
          setThemeState(parsed.theme as MobileTheme);
        }
        if (Array.isArray(parsed.puzzles)) setPuzzles(parsed.puzzles);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ language, theme, puzzles }));
  }, [language, puzzles, ready, theme]);

  const setLanguage = useCallback((next: AppLanguage) => setLanguageState(next), []);
  const setTheme = useCallback((next: MobileTheme) => setThemeState(next), []);

  const createPuzzle = useCallback((input: CreatePuzzleInput) => {
    const id = `puzzle-${Date.now()}-${Math.round(Math.random() * 100_000)}`;
    const seed = Math.floor(Math.random() * 0xffffffff);
    const generated = generatePieces(
      input.configuration.rows,
      input.configuration.columns,
      seed,
    );
    const pieces = generated.map((piece, index) => ({
      ...piece,
      currentPosition: {
        x: index % input.configuration.columns,
        y:
          input.configuration.rows +
          1 +
          Math.floor(index / input.configuration.columns) * 1.18,
        rotation: input.configuration.rotationEnabled ? piece.currentPosition.rotation : 0,
      },
      trayId: null,
    }));
    const now = new Date().toISOString();
    const puzzle: MobilePuzzle = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
      session: {
        puzzleId: id,
        seed,
        pieces,
        elapsedTime: 0,
        hintsUsed: 0,
        camera: { x: 0, y: 0, zoom: 1 },
        activeRegion: null,
        completedAt: null,
        timelapse: {
          initial: pieces.map((piece) => ({
            id: piece.id,
            x: piece.currentPosition.x,
            y: piece.currentPosition.y,
            rotation: piece.currentPosition.rotation,
            isPlaced: false,
            visible: piece.trayId === null,
          })),
          frames: [],
        },
      },
    };
    setPuzzles((current) => [puzzle, ...current]);
    return puzzle;
  }, []);

  const updatePuzzlePieces = useCallback((id: string, pieces: PuzzlePiece[]) => {
    setPuzzles((current) =>
      current.map((puzzle) => {
        if (puzzle.id !== id) return puzzle;
        const completed = pieces.every((piece) => piece.isPlaced);
        return {
          ...puzzle,
          updatedAt: new Date().toISOString(),
          session: {
            ...puzzle.session,
            pieces,
            completedAt: completed ? new Date().toISOString() : null,
          },
        };
      }),
    );
  }, []);

  const updatePuzzleCamera = useCallback((id: string, camera: Camera) => {
    setPuzzles((current) =>
      current.map((puzzle) =>
        puzzle.id === id
          ? {
              ...puzzle,
              updatedAt: new Date().toISOString(),
              session: { ...puzzle.session, camera },
            }
          : puzzle,
      ),
    );
  }, []);

  const deletePuzzle = useCallback((id: string) => {
    setPuzzles((current) => current.filter((puzzle) => puzzle.id !== id));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      language,
      theme,
      puzzles,
      setLanguage,
      setTheme,
      createPuzzle,
      updatePuzzlePieces,
      updatePuzzleCamera,
      deletePuzzle,
      t: (portuguese, english) => (language === "en" ? english : portuguese),
    }),
    [
      createPuzzle,
      deletePuzzle,
      language,
      puzzles,
      ready,
      setLanguage,
      setTheme,
      theme,
      updatePuzzlePieces,
      updatePuzzleCamera,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

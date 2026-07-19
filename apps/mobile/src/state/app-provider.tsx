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
export type MobileTheme = "cosmic" | "candy" | "jungle" | "rainbow" | "ocean" | "arcade" | "castle" | "storybook" | "cyberpunk" | "hologram" | "space";
export interface MobilePreferences { sound: boolean; haptics: boolean; highContrast: boolean; reducedMotion: boolean }

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
  drawerOpen: boolean;
  language: AppLanguage;
  theme: MobileTheme;
  preferences: MobilePreferences;
  puzzles: MobilePuzzle[];
  setLanguage: (language: AppLanguage) => void;
  setTheme: (theme: MobileTheme) => void;
  setDrawerOpen: (open: boolean) => void;
  updatePreference: (key: keyof MobilePreferences, value: boolean) => void;
  createPuzzle: (input: CreatePuzzleInput) => MobilePuzzle;
  updatePuzzlePieces: (id: string, pieces: PuzzlePiece[]) => void;
  updatePuzzleCamera: (id: string, camera: Camera) => void;
  deletePuzzle: (id: string) => void;
  t: (portuguese: string, english: string) => string;
}

const STORAGE_KEY = "pieceful-mobile-state-v1";
const defaultPreferences: MobilePreferences = { sound: true, haptics: true, highContrast: false, reducedMotion: false };

const AppContext = createContext<AppState | null>(null);

function shuffledTraySlots(length: number, seed: number) {
  const slots = Array.from({ length }, (_, index) => index);
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = slots.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [slots[index], slots[target]] = [slots[target], slots[index]];
  }
  return slots;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [language, setLanguageState] = useState<AppLanguage>("pt-BR");
  const [theme, setThemeState] = useState<MobileTheme>("cosmic");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [puzzles, setPuzzles] = useState<MobilePuzzle[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as Partial<{
          language: AppLanguage;
          theme: MobileTheme;
          puzzles: MobilePuzzle[];
          preferences: MobilePreferences;
        }>;
        if (parsed.language === "en" || parsed.language === "pt-BR") {
          setLanguageState(parsed.language);
        }
        if (["cosmic", "candy", "jungle", "rainbow", "ocean", "arcade", "castle", "storybook", "cyberpunk", "hologram", "space"].includes(parsed.theme ?? "")) {
          setThemeState(parsed.theme as MobileTheme);
        }
        if (Array.isArray(parsed.puzzles)) setPuzzles(parsed.puzzles);
        if (parsed.preferences) setPreferences({ ...defaultPreferences, ...parsed.preferences });
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ language, theme, puzzles, preferences }));
  }, [language, preferences, puzzles, ready, theme]);

  const setLanguage = useCallback((next: AppLanguage) => setLanguageState(next), []);
  const setTheme = useCallback((next: MobileTheme) => setThemeState(next), []);
  const updatePreference = useCallback((key: keyof MobilePreferences, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const createPuzzle = useCallback((input: CreatePuzzleInput) => {
    const id = `puzzle-${Date.now()}-${Math.round(Math.random() * 100_000)}`;
    const seed = Math.floor(Math.random() * 0xffffffff);
    const generated = generatePieces(
      input.configuration.rows,
      input.configuration.columns,
      seed,
    );
    const shuffledSlots = shuffledTraySlots(generated.length, seed ^ 0x51f15e);
    const pieces = generated.map((piece, index) => ({
      ...piece,
      currentPosition: {
        x: (shuffledSlots[index] ?? index) % input.configuration.columns,
        y:
          input.configuration.rows +
          2.05 +
          Math.floor((shuffledSlots[index] ?? index) / input.configuration.columns) * 1.18,
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
      drawerOpen,
      language,
      theme,
      preferences,
      puzzles,
      setLanguage,
      setTheme,
      setDrawerOpen,
      updatePreference,
      createPuzzle,
      updatePuzzlePieces,
      updatePuzzleCamera,
      deletePuzzle,
      t: (portuguese, english) => (language === "en" ? english : portuguese),
    }),
    [
      createPuzzle,
      deletePuzzle,
      drawerOpen,
      language,
      puzzles,
      preferences,
      ready,
      setLanguage,
      setTheme,
      theme,
      updatePuzzlePieces,
      updatePuzzleCamera,
      updatePreference,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

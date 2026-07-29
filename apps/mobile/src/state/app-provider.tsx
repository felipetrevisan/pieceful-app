import {
  type Camera,
  generatePieces,
  type PuzzlePiece,
  type PuzzleSession,
  type PuzzleTimelapseFrame,
  type PuzzleTimelapsePiece,
} from "@puzzled/puzzle-engine";
import type { PuzzleConfiguration, PuzzleDifficulty } from "@puzzled/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getLevelRewards, getPlayerProgression } from "@/lib/progression";

export type AppLanguage = "pt-BR" | "en";
export type AgeGroup = "child" | "teen" | "adult";
export type MobileTheme =
  | "cosmic"
  | "candy"
  | "jungle"
  | "rainbow"
  | "ocean"
  | "arcade"
  | "castle"
  | "storybook"
  | "cyberpunk"
  | "hologram"
  | "space"
  | "sunset"
  | "enchanted"
  | "sakura";
export interface MobilePreferences {
  sound: boolean;
  haptics: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

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
  tourOpen: boolean;
  tourCompleted: boolean;
  language: AppLanguage;
  ageGroup: AgeGroup | null;
  ageGateCompleted: boolean;
  theme: MobileTheme;
  preferences: MobilePreferences;
  puzzles: MobilePuzzle[];
  deletedPuzzleIds: string[];
  notificationCount: number;
  hintCredits: number;
  claimedRewardIds: string[];
  selectedAvatarRewardId: string | null;
  selectedFrameRewardId: string | null;
  setLanguage: (language: AppLanguage) => void;
  setAgeGroup: (ageGroup: AgeGroup) => void;
  resetAgeGroup: () => void;
  setTheme: (theme: MobileTheme) => void;
  setDrawerOpen: (open: boolean) => void;
  startTour: () => void;
  completeTour: () => void;
  markNotificationsRead: () => void;
  claimLevelReward: (rewardId: string) => boolean;
  consumeHintCredit: () => boolean;
  equipReward: (kind: "avatar" | "frame", rewardId: string | null) => boolean;
  updatePreference: (key: keyof MobilePreferences, value: boolean) => void;
  createPuzzle: (input: CreatePuzzleInput) => MobilePuzzle;
  updatePuzzlePieces: (id: string, pieces: PuzzlePiece[], elapsedTime?: number) => void;
  updatePuzzleCamera: (id: string, camera: Camera) => void;
  updatePuzzleElapsedTime: (id: string, elapsedTime: number) => void;
  incrementPuzzleHints: (id: string) => void;
  renamePuzzle: (id: string, name: string) => void;
  deletePuzzle: (id: string) => void;
  deleteLocalPuzzles: () => void;
  acknowledgeDeletedPuzzles: (ids: string[]) => void;
  mergeRemotePuzzles: (puzzles: MobilePuzzle[]) => void;
  t: (portuguese: string, english: string) => string;
}

const STORAGE_KEY = "pieceful-mobile-state-v1";
const defaultPreferences: MobilePreferences = {
  sound: true,
  haptics: true,
  highContrast: false,
  reducedMotion: false,
};

const AppContext = createContext<AppState | null>(null);

function timelapseState(piece: PuzzlePiece): PuzzleTimelapsePiece {
  return {
    id: piece.id,
    x: piece.currentPosition.x,
    y: piece.currentPosition.y,
    rotation: piece.currentPosition.rotation,
    isPlaced: piece.isPlaced,
    visible: piece.trayId === null,
  };
}

function changedTimelapsePieces(previous: PuzzlePiece[], next: PuzzlePiece[]) {
  const previousById = new Map(previous.map((piece) => [piece.id, piece]));
  return next.flatMap((piece) => {
    const before = previousById.get(piece.id);
    if (
      before &&
      before.currentPosition.x === piece.currentPosition.x &&
      before.currentPosition.y === piece.currentPosition.y &&
      before.currentPosition.rotation === piece.currentPosition.rotation &&
      before.isPlaced === piece.isPlaced &&
      (before.trayId === null) === (piece.trayId === null)
    )
      return [];
    return [timelapseState(piece)];
  });
}

function appendTimelapseFrame(
  frames: PuzzleTimelapseFrame[],
  elapsedTime: number,
  changes: PuzzleTimelapsePiece[],
) {
  if (changes.length === 0) return frames;
  const last = frames.at(-1);
  const at = Math.max(elapsedTime, (last?.at ?? 0) + 0.12);
  const next = [...frames, { at, changes }];
  // Keeps long sessions reasonably small without losing the final assembly state.
  return next.length <= 1800
    ? next
    : next.filter((_, index) => index % 2 === 0 || index === next.length - 1);
}

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
  const [tourOpen, setTourOpen] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [language, setLanguageState] = useState<AppLanguage>("pt-BR");
  const [ageGroup, setAgeGroupState] = useState<AgeGroup | null>(null);
  const [theme, setThemeState] = useState<MobileTheme>("cosmic");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [puzzles, setPuzzles] = useState<MobilePuzzle[]>([]);
  const [deletedPuzzleIds, setDeletedPuzzleIds] = useState<string[]>([]);
  const [hintCredits, setHintCredits] = useState(0);
  const [claimedRewardIds, setClaimedRewardIds] = useState<string[]>([]);
  const [selectedAvatarRewardId, setSelectedAvatarRewardId] = useState<string | null>(null);
  const [selectedFrameRewardId, setSelectedFrameRewardId] = useState<string | null>(null);
  const [lastNotificationsReadAt, setLastNotificationsReadAt] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) {
          setTourOpen(true);
          return;
        }
        const parsed = JSON.parse(stored) as Partial<{
          language: AppLanguage;
          ageGroup: AgeGroup;
          theme: MobileTheme;
          puzzles: MobilePuzzle[];
          deletedPuzzleIds: string[];
          preferences: MobilePreferences;
          tourCompleted: boolean;
          lastNotificationsReadAt: string;
          hintCredits: number;
          claimedRewardIds: string[];
          selectedAvatarRewardId: string;
          selectedFrameRewardId: string;
        }>;
        if (parsed.language === "en" || parsed.language === "pt-BR") {
          setLanguageState(parsed.language);
        }
        if (["child", "teen", "adult"].includes(parsed.ageGroup ?? ""))
          setAgeGroupState(parsed.ageGroup as AgeGroup);
        if (
          [
            "cosmic",
            "candy",
            "jungle",
            "rainbow",
            "ocean",
            "arcade",
            "castle",
            "storybook",
            "cyberpunk",
            "hologram",
            "space",
            "sunset",
            "enchanted",
            "sakura",
          ].includes(parsed.theme ?? "")
        ) {
          setThemeState(parsed.theme as MobileTheme);
        }
        if (Array.isArray(parsed.puzzles)) setPuzzles(parsed.puzzles);
        if (Array.isArray(parsed.deletedPuzzleIds)) {
          setDeletedPuzzleIds(
            parsed.deletedPuzzleIds.filter((id): id is string => typeof id === "string"),
          );
        }
        if (Number.isFinite(parsed.hintCredits)) setHintCredits(Math.max(0, parsed.hintCredits ?? 0));
        if (Array.isArray(parsed.claimedRewardIds)) {
          setClaimedRewardIds(
            parsed.claimedRewardIds.filter((id): id is string => typeof id === "string"),
          );
        }
        if (typeof parsed.selectedAvatarRewardId === "string") setSelectedAvatarRewardId(parsed.selectedAvatarRewardId);
        if (typeof parsed.selectedFrameRewardId === "string") setSelectedFrameRewardId(parsed.selectedFrameRewardId);
        if (parsed.preferences) setPreferences({ ...defaultPreferences, ...parsed.preferences });
        const completed = parsed.tourCompleted === true;
        if (typeof parsed.lastNotificationsReadAt === "string") {
          setLastNotificationsReadAt(parsed.lastNotificationsReadAt);
        }
        setTourCompleted(completed);
        setTourOpen(!completed);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ageGroup,
        language,
        theme,
        puzzles,
        deletedPuzzleIds,
        preferences,
        tourCompleted,
        lastNotificationsReadAt,
        hintCredits,
        claimedRewardIds,
        selectedAvatarRewardId,
        selectedFrameRewardId,
      }),
    );
  }, [
    ageGroup,
    language,
    lastNotificationsReadAt,
    preferences,
    puzzles,
    deletedPuzzleIds,
    hintCredits,
    claimedRewardIds,
    selectedAvatarRewardId,
    selectedFrameRewardId,
    ready,
    theme,
    tourCompleted,
  ]);

  const setLanguage = useCallback((next: AppLanguage) => setLanguageState(next), []);
  const setAgeGroup = useCallback((next: AgeGroup) => {
    setAgeGroupState(next);
    if (next === "child") setThemeState("candy");
  }, []);
  const resetAgeGroup = useCallback(() => setAgeGroupState(null), []);
  const setTheme = useCallback((next: MobileTheme) => setThemeState(next), []);
  const startTour = useCallback(() => setTourOpen(true), []);
  const completeTour = useCallback(() => {
    setTourCompleted(true);
    setTourOpen(false);
  }, []);
  const markNotificationsRead = useCallback(
    () => setLastNotificationsReadAt(new Date().toISOString()),
    [],
  );
  const updatePreference = useCallback((key: keyof MobilePreferences, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const claimLevelReward = useCallback(
    (rewardId: string) => {
      if (claimedRewardIds.includes(rewardId)) return false;
      const reward = getLevelRewards(ageGroup).find((item) => item.id === rewardId);
      if (!reward || reward.level > getPlayerProgression(puzzles).level) return false;
      setClaimedRewardIds((current) =>
        current.includes(rewardId) ? current : [...current, rewardId],
      );
      if (reward.kind === "hints") setHintCredits((current) => current + (reward.amount ?? 1));
      if (reward.kind === "avatar") setSelectedAvatarRewardId(rewardId);
      if (reward.kind === "frame") setSelectedFrameRewardId(rewardId);
      return true;
    },
    [ageGroup, claimedRewardIds, puzzles],
  );

  const consumeHintCredit = useCallback(() => {
    if (hintCredits <= 0) return false;
    setHintCredits((current) => Math.max(0, current - 1));
    return true;
  }, [hintCredits]);

  const equipReward = useCallback((kind: "avatar" | "frame", rewardId: string | null) => {
    if (rewardId === null) {
      if (kind === "avatar") setSelectedAvatarRewardId(null);
      else setSelectedFrameRewardId(null);
      return true;
    }
    if (!claimedRewardIds.includes(rewardId)) return false;
    const reward = getLevelRewards(ageGroup).find((item) => item.id === rewardId && item.kind === kind);
    if (!reward) return false;
    if (kind === "avatar") setSelectedAvatarRewardId(rewardId);
    else setSelectedFrameRewardId(rewardId);
    return true;
  }, [ageGroup, claimedRewardIds]);

  const createPuzzle = useCallback((input: CreatePuzzleInput) => {
    const id = `puzzle-${Date.now()}-${Math.round(Math.random() * 100_000)}`;
    const seed = Math.floor(Math.random() * 0xffffffff);
    const generated = generatePieces(input.configuration.rows, input.configuration.columns, seed);
    const shuffledSlots = shuffledTraySlots(generated.length, seed ^ 0x51f15e);
    const pieces = generated.map((piece, index) => ({
      ...piece,
      currentPosition: {
        x: (shuffledSlots[index] ?? index) % input.configuration.columns,
        y:
          input.configuration.rows +
          1.55 +
          Math.floor((shuffledSlots[index] ?? index) / input.configuration.columns) * 1.18,
        rotation: input.configuration.rotationEnabled ? piece.currentPosition.rotation : 0,
      },
      trayId: "drawer",
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
          initial: pieces.map(timelapseState),
          frames: [],
        },
      },
    };
    setPuzzles((current) => [puzzle, ...current]);
    return puzzle;
  }, []);

  const updatePuzzlePieces = useCallback((id: string, pieces: PuzzlePiece[], elapsedTime?: number) => {
    setPuzzles((current) =>
      current.map((puzzle) => {
        if (puzzle.id !== id) return puzzle;
        const completed = pieces.every((piece) => piece.isPlaced);
        const changes = changedTimelapsePieces(puzzle.session.pieces, pieces);
        const currentTimelapse = puzzle.session.timelapse ?? {
          initial: puzzle.session.pieces.map(timelapseState),
          frames: [],
        };
        return {
          ...puzzle,
          updatedAt: new Date().toISOString(),
          session: {
            ...puzzle.session,
            pieces,
            elapsedTime: elapsedTime ?? puzzle.session.elapsedTime,
            completedAt: completed ? new Date().toISOString() : null,
            timelapse: {
              ...currentTimelapse,
              frames: appendTimelapseFrame(
                currentTimelapse.frames,
                elapsedTime ?? puzzle.session.elapsedTime,
                changes,
              ),
            },
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

  const updatePuzzleElapsedTime = useCallback((id: string, elapsedTime: number) => {
    setPuzzles((current) =>
      current.map((puzzle) =>
        puzzle.id === id
          ? {
              ...puzzle,
              session: { ...puzzle.session, elapsedTime },
            }
          : puzzle,
      ),
    );
  }, []);

  const incrementPuzzleHints = useCallback((id: string) => {
    setPuzzles((current) =>
      current.map((puzzle) =>
        puzzle.id === id
          ? { ...puzzle, session: { ...puzzle.session, hintsUsed: puzzle.session.hintsUsed + 1 } }
          : puzzle,
      ),
    );
  }, []);

  const deletePuzzle = useCallback((id: string) => {
    setPuzzles((current) => current.filter((puzzle) => puzzle.id !== id));
    setDeletedPuzzleIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const deleteLocalPuzzles = useCallback(() => {
    const ids = puzzles.map((puzzle) => puzzle.id);
    setDeletedPuzzleIds((deleted) => [...new Set([...deleted, ...ids])]);
    setPuzzles([]);
  }, [puzzles]);

  const acknowledgeDeletedPuzzles = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const acknowledged = new Set(ids);
    setDeletedPuzzleIds((current) => current.filter((id) => !acknowledged.has(id)));
  }, []);

  const renamePuzzle = useCallback((id: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setPuzzles((current) =>
      current.map((puzzle) =>
        puzzle.id === id
          ? { ...puzzle, name: trimmedName, updatedAt: new Date().toISOString() }
          : puzzle,
      ),
    );
  }, []);

  const mergeRemotePuzzles = useCallback((remotePuzzles: MobilePuzzle[]) => {
    setPuzzles((current) => {
      const merged = new Map(current.map((puzzle) => [puzzle.id, puzzle]));
      for (const remote of remotePuzzles) {
        if (deletedPuzzleIds.includes(remote.id)) continue;
        const local = merged.get(remote.id);
        if (!local || new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
          merged.set(remote.id, remote);
        }
      }
      return [...merged.values()].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
    });
  }, [deletedPuzzleIds]);

  const readAt = lastNotificationsReadAt ? new Date(lastNotificationsReadAt).getTime() : 0;
  const todayStartedAt = new Date();
  todayStartedAt.setHours(0, 0, 0, 0);
  const dailyChallengeUnread = readAt < todayStartedAt.getTime();
  const activePuzzleUnread = puzzles.some(
    (puzzle) => !puzzle.session.completedAt && new Date(puzzle.updatedAt).getTime() > readAt,
  );
  const notificationCount = Number(dailyChallengeUnread) + Number(activePuzzleUnread);

  const value = useMemo<AppState>(
    () => ({
      ready,
      drawerOpen,
      tourOpen,
      tourCompleted,
      language,
      ageGroup,
      ageGateCompleted: ageGroup !== null,
      theme,
      preferences,
      puzzles,
      deletedPuzzleIds,
      notificationCount,
      hintCredits,
      claimedRewardIds,
      selectedAvatarRewardId,
      selectedFrameRewardId,
      setLanguage,
      setAgeGroup,
      resetAgeGroup,
      setTheme,
      setDrawerOpen,
      startTour,
      completeTour,
      markNotificationsRead,
      claimLevelReward,
      consumeHintCredit,
      equipReward,
      updatePreference,
      createPuzzle,
      updatePuzzlePieces,
      updatePuzzleCamera,
      updatePuzzleElapsedTime,
      incrementPuzzleHints,
      renamePuzzle,
      deletePuzzle,
      deleteLocalPuzzles,
      acknowledgeDeletedPuzzles,
      mergeRemotePuzzles,
      t: (portuguese, english) => (language === "en" ? english : portuguese),
    }),
    [
      createPuzzle,
      completeTour,
      deletePuzzle,
      deleteLocalPuzzles,
      acknowledgeDeletedPuzzles,
      claimedRewardIds,
      claimLevelReward,
      consumeHintCredit,
      equipReward,
      deletedPuzzleIds,
      mergeRemotePuzzles,
      markNotificationsRead,
      renamePuzzle,
      drawerOpen,
      language,
      ageGroup,
      hintCredits,
      selectedAvatarRewardId,
      selectedFrameRewardId,
      puzzles,
      notificationCount,
      preferences,
      ready,
      setLanguage,
      setAgeGroup,
      resetAgeGroup,
      setTheme,
      theme,
      tourCompleted,
      tourOpen,
      startTour,
      updatePuzzlePieces,
      updatePuzzleCamera,
      updatePuzzleElapsedTime,
      incrementPuzzleHints,
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

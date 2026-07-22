import { Platform } from "react-native";
import PiecefulGameServices from "../../modules/my-module/src/PiecefulGameServicesModule";

export type PiecefulAchievementKey = "first_puzzle" | "no_hints" | "pieces_250" | "puzzles_10";

const iosIds: Record<PiecefulAchievementKey, string> = {
  first_puzzle: process.env.EXPO_PUBLIC_GAME_CENTER_FIRST_PUZZLE ?? "app.perazzo.pieceful.first_puzzle",
  no_hints: process.env.EXPO_PUBLIC_GAME_CENTER_NO_HINTS ?? "app.perazzo.pieceful.no_hints",
  pieces_250: process.env.EXPO_PUBLIC_GAME_CENTER_PIECES_250 ?? "app.perazzo.pieceful.pieces_250",
  puzzles_10: process.env.EXPO_PUBLIC_GAME_CENTER_PUZZLES_10 ?? "app.perazzo.pieceful.puzzles_10",
};

const androidIds: Record<PiecefulAchievementKey, string | undefined> = {
  first_puzzle: process.env.EXPO_PUBLIC_PLAY_GAMES_FIRST_PUZZLE,
  no_hints: process.env.EXPO_PUBLIC_PLAY_GAMES_NO_HINTS,
  pieces_250: process.env.EXPO_PUBLIC_PLAY_GAMES_PIECES_250,
  puzzles_10: process.env.EXPO_PUBLIC_PLAY_GAMES_PUZZLES_10,
};

export const gamePlatformAvailable = Boolean(PiecefulGameServices);
let authenticationRequest: ReturnType<NonNullable<typeof PiecefulGameServices>["authenticate"]> | null = null;

export async function authenticateGamePlatform() {
  if (!PiecefulGameServices) return { authenticated: false, unavailable: true };
  try {
    authenticationRequest ??= PiecefulGameServices.authenticate();
    return await authenticationRequest;
  } catch {
    authenticationRequest = null;
    return { authenticated: false };
  }
}

export async function reportPlatformAchievement(key: PiecefulAchievementKey, percent: number) {
  if (!PiecefulGameServices || percent <= 0) return;
  const identifier = Platform.OS === "ios" ? iosIds[key] : androidIds[key];
  if (!identifier) return;
  await PiecefulGameServices.reportAchievement(identifier, Math.min(100, Math.max(0, percent)));
}

export async function showPlatformAchievements() {
  if (!PiecefulGameServices) throw new Error("Native game services require a development build");
  await PiecefulGameServices.showAchievements();
}

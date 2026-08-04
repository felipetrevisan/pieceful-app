import { NativeModule, requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export interface PlatformPlayer {
  authenticated: boolean;
  playerId?: string;
  playerName?: string;
}

type PiecefulGameServicesEvents = {
  onTimelapseProgress: (event: { progress: number }) => void;
};

export interface TimelapseJob {
  jobId: string;
  puzzleId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  fileUri?: string | null;
  galleryUri?: string | null;
  error?: string | null;
}

export interface AppUpdateAvailability {
  available: boolean;
  inProgress: boolean;
  versionCode?: number;
}

declare class PiecefulGameServicesModule extends NativeModule<PiecefulGameServicesEvents> {
  authenticate(): Promise<PlatformPlayer>;
  reportAchievement(identifier: string, percent: number): Promise<void>;
  showAchievements(): Promise<void>;
  checkForAppUpdate?(): Promise<AppUpdateAvailability>;
  startAppUpdate?(): Promise<boolean>;
  createTimelapse(payload: string): Promise<string>;
  enqueueTimelapse?(
    payload: string,
    puzzleId: string,
    puzzleName: string,
    language: string,
  ): Promise<string>;
  getTimelapseJob?(puzzleId: string): Promise<TimelapseJob | null>;
  saveVideoToGallery(uri: string): Promise<string>;
}

// Expo Router also evaluates this module while statically rendering web pages.
// Looking up a native module in that Node process initializes the React Native
// bridge and crashes because no native bridge exists there.
export default Platform.OS === "web"
  ? null
  : requireOptionalNativeModule<PiecefulGameServicesModule>("PiecefulGameServices");

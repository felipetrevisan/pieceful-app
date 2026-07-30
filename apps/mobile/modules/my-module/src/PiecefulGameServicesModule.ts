import { NativeModule, requireOptionalNativeModule } from "expo";

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

export default requireOptionalNativeModule<PiecefulGameServicesModule>("PiecefulGameServices");

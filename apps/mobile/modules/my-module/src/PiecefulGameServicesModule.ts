import { NativeModule, requireOptionalNativeModule } from "expo";

export interface PlatformPlayer {
  authenticated: boolean;
  playerId?: string;
  playerName?: string;
}

type PiecefulGameServicesEvents = {
  onTimelapseProgress: (event: { progress: number }) => void;
};

declare class PiecefulGameServicesModule extends NativeModule<PiecefulGameServicesEvents> {
  authenticate(): Promise<PlatformPlayer>;
  reportAchievement(identifier: string, percent: number): Promise<void>;
  showAchievements(): Promise<void>;
  createTimelapse(payload: string): Promise<string>;
}

export default requireOptionalNativeModule<PiecefulGameServicesModule>("PiecefulGameServices");

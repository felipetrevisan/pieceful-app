import { NativeModule, requireOptionalNativeModule } from "expo";

export interface PlatformPlayer {
  authenticated: boolean;
  playerId?: string;
  playerName?: string;
}

declare class PiecefulGameServicesModule extends NativeModule {
  authenticate(): Promise<PlatformPlayer>;
  reportAchievement(identifier: string, percent: number): Promise<void>;
  showAchievements(): Promise<void>;
}

export default requireOptionalNativeModule<PiecefulGameServicesModule>("PiecefulGameServices");

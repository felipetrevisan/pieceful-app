export const PREFERENCES_KEY = "puzzled-preferences";
export const themeIds = [
  "classic",
  "candy",
  "jungle",
  "rainbow",
  "ocean",
  "arcade",
  "castle",
  "storybook",
] as const;
export type ThemeId = (typeof themeIds)[number];

export interface Preferences {
  sound: boolean;
  music: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  snapStrength: number;
  theme: ThemeId;
}

export const defaultPreferences: Preferences = {
  sound: true,
  music: false,
  highContrast: false,
  reducedMotion: false,
  snapStrength: 38,
  theme: "classic",
};

export function readPreferences(storage: Pick<Storage, "getItem" | "removeItem">): Preferences {
  const stored = storage.getItem(PREFERENCES_KEY);
  if (!stored) return defaultPreferences;
  try {
    const parsed = JSON.parse(stored) as Partial<Preferences>;
    return {
      ...defaultPreferences,
      ...parsed,
      theme: themeIds.includes(parsed.theme as ThemeId) ? (parsed.theme as ThemeId) : "classic",
    };
  } catch {
    storage.removeItem(PREFERENCES_KEY);
    return defaultPreferences;
  }
}

export function applyPreferences(preferences: Preferences, root = document.documentElement) {
  root.dataset.theme = preferences.theme;
  root.classList.toggle("high-contrast", preferences.highContrast);
  root.classList.toggle("reduced-motion", preferences.reducedMotion);
}

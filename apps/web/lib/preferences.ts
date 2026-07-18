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
  "cyberpunk",
  "hologram",
  "space",
] as const;
export type ThemeId = (typeof themeIds)[number];
export type Language = "pt-BR" | "en";

export interface Preferences {
  sound: boolean;
  music: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  snapStrength: number;
  theme: ThemeId;
  language: Language;
}

export const defaultPreferences: Preferences = {
  sound: true,
  music: false,
  highContrast: false,
  reducedMotion: false,
  snapStrength: 38,
  theme: "classic",
  language: "pt-BR",
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
      language: parsed.language === "en" ? "en" : "pt-BR",
    };
  } catch {
    storage.removeItem(PREFERENCES_KEY);
    return defaultPreferences;
  }
}

export function applyPreferences(preferences: Preferences, root = document.documentElement) {
  root.dataset.theme = preferences.theme;
  root.dataset.language = preferences.language;
  root.lang = preferences.language;
  root.classList.toggle("high-contrast", preferences.highContrast);
  root.classList.toggle("reduced-motion", preferences.reducedMotion);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("pieceful:language-changed"));
}

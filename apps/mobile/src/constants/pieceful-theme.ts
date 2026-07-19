import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { MobileTheme } from "@/state/app-provider";

export interface MobileThemeTokens {
  background: string;
  panel: string;
  panelAlt: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  danger: string;
  gradient: readonly [string, string];
  radius: number;
}

export const mobileThemes: Record<MobileTheme, MobileThemeTokens> = {
  cosmic: { background: "#0a0e1a", panel: "#171b28", panelAlt: "#262a37", text: "#dfe2f3", muted: "#b9cacb", primary: "#edb1ff", accent: "#00f2ff", danger: "#ffb4ab", gradient: ["#00dbe7", "#d6baff"], radius: 24 },
  candy: { background: "#fff6fb", panel: "#ffffff", panelAlt: "#ffe6f2", text: "#51243d", muted: "#8f617a", primary: "#ff72ae", accent: "#55cdeb", danger: "#d53868", gradient: ["#ff83ba", "#7adcf2"], radius: 30 },
  jungle: { background: "#102d20", panel: "#204c31", panelAlt: "#326840", text: "#fff4cf", muted: "#c5d8a5", primary: "#f3b93f", accent: "#82e35a", danger: "#ff8b72", gradient: ["#79db55", "#f4bd43"], radius: 18 },
  rainbow: { background: "#eaf7ff", panel: "#ffffff", panelAlt: "#d8efff", text: "#403258", muted: "#766b8c", primary: "#ff62b0", accent: "#5c9dff", danger: "#d63f70", gradient: ["#5c9dff", "#ff62b0"], radius: 32 },
  ocean: { background: "#052f46", panel: "#0b536c", panelAlt: "#16718a", text: "#e9fcff", muted: "#a8dbe4", primary: "#58e6c2", accent: "#55cfff", danger: "#ff8fa3", gradient: ["#55cfff", "#58e6c2"], radius: 26 },
  arcade: { background: "#100821", panel: "#21113d", panelAlt: "#34205c", text: "#fff5dc", muted: "#c3add7", primary: "#ff3aa7", accent: "#45ff59", danger: "#ff4f64", gradient: ["#45ff59", "#ff3aa7"], radius: 5 },
  castle: { background: "#1d1740", panel: "#31275b", panelAlt: "#493d75", text: "#fff6d7", muted: "#d6c7e7", primary: "#ffd35a", accent: "#ba9cff", danger: "#ff8d9e", gradient: ["#ba9cff", "#ffd35a"], radius: 13 },
  storybook: { background: "#f5ead4", panel: "#fffaf0", panelAlt: "#ead8b8", text: "#4b3524", muted: "#826d58", primary: "#c66345", accent: "#477d67", danger: "#b83d3d", gradient: ["#477d67", "#d98a5f"], radius: 9 },
  cyberpunk: { background: "#0b0811", panel: "#17121d", panelAlt: "#24162d", text: "#fff8ff", muted: "#bea9c9", primary: "#ff2b91", accent: "#00f0ff", danger: "#ff5470", gradient: ["#ff2b91", "#00f0ff"], radius: 3 },
  hologram: { background: "#031a27", panel: "#0a3042", panelAlt: "#10465b", text: "#eaffff", muted: "#9ed4df", primary: "#a77dff", accent: "#54fff1", danger: "#ff80a8", gradient: ["#54fff1", "#a77dff"], radius: 14 },
  space: { background: "#05080f", panel: "#171d27", panelAlt: "#29313d", text: "#eef4ff", muted: "#aab6c6", primary: "#ff9f43", accent: "#75a7ff", danger: "#ff6f79", gradient: ["#75a7ff", "#ff9f43"], radius: 8 },
};

export const mobileThemeCatalog: { id: MobileTheme; name: string; description: [string, string]; icon: ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "cosmic", name: "Cosmic Night", description: ["Nebulosa e vidro", "Nebula and glass"], icon: "planet-outline" },
  { id: "candy", name: "Candy Pop", description: ["Doce e arredondado", "Sweet and rounded"], icon: "color-palette-outline" },
  { id: "jungle", name: "Jungle Party", description: ["Selva e aventura", "Jungle adventure"], icon: "leaf-outline" },
  { id: "rainbow", name: "Rainbow Sky", description: ["Céu e cores", "Sky and colors"], icon: "rainy-outline" },
  { id: "ocean", name: "Ocean Splash", description: ["Mergulho submarino", "Underwater dive"], icon: "water-outline" },
  { id: "arcade", name: "Pixel Arcade", description: ["Neon retrô", "Retro neon"], icon: "game-controller-outline" },
  { id: "castle", name: "Magic Castle", description: ["Fantasia real", "Royal fantasy"], icon: "sparkles-outline" },
  { id: "storybook", name: "Storybook", description: ["Papel e tinta", "Paper and ink"], icon: "book-outline" },
  { id: "cyberpunk", name: "Cyberpunk City", description: ["Cidade digital", "Digital city"], icon: "flash-outline" },
  { id: "hologram", name: "Holographic UI", description: ["Scanner translúcido", "Translucent scanner"], icon: "scan-outline" },
  { id: "space", name: "Space Station", description: ["Interface orbital", "Orbital interface"], icon: "rocket-outline" },
];

export function isLightMobileTheme(theme: MobileTheme) {
  return theme === "candy" || theme === "rainbow" || theme === "storybook";
}

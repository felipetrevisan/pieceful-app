import type { MobileTheme } from "@/state/app-provider";

export const mobileThemes = {
  cosmic: {
    background: "#0a0e1a",
    panel: "#171b28",
    panelAlt: "#262a37",
    text: "#dfe2f3",
    muted: "#b9cacb",
    primary: "#edb1ff",
    accent: "#00f2ff",
    danger: "#ffb4ab",
    gradient: ["#00dbe7", "#d6baff"] as const,
  },
  candy: {
    background: "#fff6fb",
    panel: "#ffffff",
    panelAlt: "#ffe6f2",
    text: "#51243d",
    muted: "#8f617a",
    primary: "#ff72ae",
    accent: "#55cdeb",
    danger: "#d53868",
    gradient: ["#ff83ba", "#7adcf2"] as const,
  },
  cyberpunk: {
    background: "#0b0811",
    panel: "#17121d",
    panelAlt: "#24162d",
    text: "#fff8ff",
    muted: "#bea9c9",
    primary: "#ff2b91",
    accent: "#00f0ff",
    danger: "#ff5470",
    gradient: ["#ff2b91", "#00f0ff"] as const,
  },
} satisfies Record<MobileTheme, object>;

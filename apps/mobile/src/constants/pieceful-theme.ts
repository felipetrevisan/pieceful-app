import type { MobileTheme } from "@/state/app-provider";

export const mobileThemes = {
  cosmic: {
    background: "#071126",
    panel: "#111c36",
    panelAlt: "#182441",
    text: "#f6f7ff",
    muted: "#aeb8d3",
    primary: "#a879ff",
    accent: "#4cd7f6",
    danger: "#ff839c",
    gradient: ["#a879ff", "#4cd7f6"] as const,
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

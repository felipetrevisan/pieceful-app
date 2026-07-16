interface IconProps {
  name:
    | "puzzle"
    | "upload"
    | "sparkle"
    | "grid"
    | "play"
    | "settings"
    | "folder"
    | "pause"
    | "volume";
  size?: number;
}

const paths: Record<IconProps["name"], string> = {
  puzzle:
    "M19 13.5V19a2 2 0 0 1-2 2h-5.5a2.5 2.5 0 1 0-5 0H3a2 2 0 0 1-2-2v-3.5a2.5 2.5 0 1 0 0-5V3a2 2 0 0 1 2-2h5.5a2.5 2.5 0 1 0 5 0H19a2 2 0 0 1 2 2v5.5a2.5 2.5 0 1 0 0 5Z",
  upload: "M12 16V3m0 0L7 8m5-5 5 5M5 13v6h14v-6",
  sparkle:
    "m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  play: "m8 5 11 7-11 7V5Z",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.5 4a8 8 0 0 0-.2-1.8l2-1.5-2-3.4-2.4 1a9 9 0 0 0-3.1-1.8L14.5 2h-5l-.4 2.5A9 9 0 0 0 6 6.3l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 0 3.6l-2 1.5 2 3.4 2.4-1a9 9 0 0 0 3.1 1.8l.4 2.5h5l.4-2.5a9 9 0 0 0 3.1-1.8l2.4 1 2-3.4-2-1.5c.1-.6.2-1.2.2-1.8Z",
  folder: "M3 6h7l2 2h9v11H3V6Z",
  pause: "M8 5v14m8-14v14",
  volume: "M4 10v4h4l5 4V6l-5 4H4Zm12-1a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12",
};

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === "grid" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

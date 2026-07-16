export type GamepadCommand =
  | "next"
  | "previous"
  | "rotate"
  | "reset"
  | "zoom-in"
  | "zoom-out"
  | "pause";

export function gamepadButtonCommand(index: number): GamepadCommand | null {
  const commands: Partial<Record<number, GamepadCommand>> = {
    0: "next",
    1: "rotate",
    3: "reset",
    4: "previous",
    5: "next",
    6: "zoom-out",
    7: "zoom-in",
    9: "pause",
  };
  return commands[index] ?? null;
}

export function gamepadDirections(axes: readonly number[], pressed: readonly boolean[]) {
  const horizontal = axes[0] ?? 0;
  const vertical = axes[1] ?? 0;
  return {
    left: horizontal < -0.34 || pressed[14] === true,
    right: horizontal > 0.34 || pressed[15] === true,
    up: vertical < -0.34 || pressed[12] === true,
    down: vertical > 0.34 || pressed[13] === true,
  };
}

export function controllerLabel(id: string): string {
  const normalized = id.toLowerCase();
  if (normalized.includes("playstation") || normalized.includes("dualshock"))
    return "Controle PlayStation";
  if (normalized.includes("xbox") || normalized.includes("xinput")) return "Controle Xbox";
  return "Controle compatível";
}

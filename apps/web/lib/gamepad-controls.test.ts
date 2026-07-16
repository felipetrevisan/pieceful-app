import { describe, expect, test } from "bun:test";
import { controllerLabel, gamepadButtonCommand, gamepadDirections } from "./gamepad-controls";

describe("controles", () => {
  test("mapeia o padrão compartilhado por Xbox e PlayStation", () => {
    expect(gamepadButtonCommand(0)).toBe("next");
    expect(gamepadButtonCommand(1)).toBe("rotate");
    expect(gamepadButtonCommand(4)).toBe("previous");
    expect(gamepadButtonCommand(7)).toBe("zoom-in");
    expect(gamepadButtonCommand(9)).toBe("pause");
  });

  test("aceita analógico e direcional digital", () => {
    expect(gamepadDirections([-0.8, 0.6], [])).toEqual({
      left: true,
      right: false,
      up: false,
      down: true,
    });
    const buttons = Array.from({ length: 16 }, () => false);
    buttons[12] = true;
    buttons[15] = true;
    expect(gamepadDirections([0, 0], buttons)).toEqual({
      left: false,
      right: true,
      up: true,
      down: false,
    });
  });

  test("identifica as famílias de controles", () => {
    expect(controllerLabel("Xbox Wireless Controller")).toBe("Controle Xbox");
    expect(controllerLabel("DUALSHOCK 4 Wireless Controller")).toBe("Controle PlayStation");
  });
});

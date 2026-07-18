import { describe, expect, test } from "bun:test";
import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import {
  completedTimelapseStates,
  interpolateRotation,
  MIN_TIMELAPSE_DURATION_SECONDS,
  TIMELAPSE_FRAMES_PER_SECOND,
  timelapseDuration,
  timelapseFramePlan,
} from "./create-timelapse";

function piece(id: string, row: number, column: number): PuzzlePiece {
  return {
    id,
    row,
    column,
    shape: { top: "flat", right: "flat", bottom: "flat", left: "flat" },
    correctPosition: { x: column, y: row, rotation: 0 },
    currentPosition: { x: -2, y: 4, rotation: 270 },
    isPlaced: false,
    groupId: null,
    trayId: "center",
  };
}

describe("timelapse da montagem", () => {
  test("gera pelo menos dez segundos de vídeo", () => {
    expect(timelapseDuration(0)).toBe(MIN_TIMELAPSE_DURATION_SECONDS);
    expect(timelapseDuration(20)).toBe(MIN_TIMELAPSE_DURATION_SECONDS);
    const plan = timelapseFramePlan(0);
    expect(plan.totalFrames).toBe(240);
    expect(plan.totalFrames * plan.frameDuration).toBe(MIN_TIMELAPSE_DURATION_SECONDS);
    expect(plan.finalHoldFrames / TIMELAPSE_FRAMES_PER_SECOND).toBe(1.5);
  });

  test("força todas as peças para a posição final no encerramento", () => {
    const pieces = [piece("one", 0, 0), piece("two", 2, 3)];
    const completed = completedTimelapseStates(pieces);
    expect([...completed.values()]).toEqual([
      { id: "one", x: 0, y: 0, rotation: 0, isPlaced: true, visible: true },
      { id: "two", x: 3, y: 2, rotation: 0, isPlaced: true, visible: true },
    ]);
  });

  test("interpola rotações pelo caminho mais curto", () => {
    expect(interpolateRotation(270, 0, 0.5)).toBe(315);
    expect(interpolateRotation(0, 270, 0.5)).toBe(-45);
  });
});

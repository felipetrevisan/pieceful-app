import { describe, expect, test } from "bun:test";
import { orientPuzzleGrid, resolvePuzzleOrientation } from "@puzzled/shared";

describe("orientação do quebra-cabeça", () => {
  test("detecta fotos verticais e mantém a quantidade de peças", () => {
    const orientation = resolvePuzzleOrientation("automatic", 1080, 1920);
    const grid = orientPuzzleGrid(6, 8, orientation);

    expect(orientation).toBe("portrait");
    expect(grid).toEqual({ rows: 8, columns: 6 });
    expect(grid.rows * grid.columns).toBe(48);
  });

  test("permite substituir manualmente a orientação detectada", () => {
    const orientation = resolvePuzzleOrientation("landscape", 1080, 1920);
    expect(orientPuzzleGrid(8, 6, orientation)).toEqual({ rows: 6, columns: 8 });
  });
});

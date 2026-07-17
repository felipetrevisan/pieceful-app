import { describe, expect, test } from "bun:test";
import { defaultPreferences, PREFERENCES_KEY, readPreferences } from "./preferences";

function storageWith(value: string | null) {
  let removed = false;
  return {
    storage: {
      getItem: (key: string) => (key === PREFERENCES_KEY ? value : null),
      removeItem: () => {
        removed = true;
      },
    },
    wasRemoved: () => removed,
  };
}

describe("preferências visuais", () => {
  test("mantém um tema infantil salvo", () => {
    const { storage } = storageWith(JSON.stringify({ theme: "candy", sound: false }));
    expect(readPreferences(storage)).toEqual({
      ...defaultPreferences,
      theme: "candy",
      sound: false,
    });
  });

  test("reconhece os novos estilos completos", () => {
    for (const theme of [
      "ocean",
      "arcade",
      "castle",
      "storybook",
      "cyberpunk",
      "hologram",
      "space",
    ] as const) {
      const { storage } = storageWith(JSON.stringify({ theme }));
      expect(readPreferences(storage).theme).toBe(theme);
    }
  });

  test("volta ao tema clássico quando o valor é desconhecido", () => {
    const { storage } = storageWith(JSON.stringify({ theme: "unknown" }));
    expect(readPreferences(storage).theme).toBe("classic");
  });

  test("remove preferências corrompidas", () => {
    const mock = storageWith("{invalid");
    expect(readPreferences(mock.storage)).toEqual(defaultPreferences);
    expect(mock.wasRemoved()).toBe(true);
  });
});

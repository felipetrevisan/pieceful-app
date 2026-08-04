import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../app", import.meta.url));

const expectedRoutes = [
  "(tabs)/_layout.tsx",
  "(tabs)/account.tsx",
  "(tabs)/achievements.tsx",
  "(tabs)/create.tsx",
  "(tabs)/friends.tsx",
  "(tabs)/index.tsx",
  "(tabs)/profile.tsx",
  "(tabs)/puzzles.tsx",
  "(tabs)/settings.tsx",
  "_layout.tsx",
  "auth/callback.tsx",
  "create/difficulty.tsx",
  "create/options.tsx",
  "help/controller.tsx",
  "help/touch.tsx",
  "notifications.tsx",
  "puzzle/[id].tsx",
  "result/[id].tsx",
  "settings/accessibility.tsx",
];

async function listFiles(directory: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (!entry.isDirectory()) return [relativePath];
      return listFiles(`${directory}/${entry.name}`, relativePath);
    }),
  );
  return files.flat().sort();
}

test("Expo Router app directory contains only intentional routes", async () => {
  expect(await listFiles(appRoot)).toEqual(expectedRoutes);
});

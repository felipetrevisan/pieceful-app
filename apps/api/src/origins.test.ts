import { describe, expect, test } from "bun:test";
import { configuredWebOrigins, isAllowedWebOrigin, normalizeOrigin } from "./origins";

describe("CORS origins", () => {
  test("normalizes paths and trailing slashes to the URL origin", () => {
    expect(normalizeOrigin(" https://pieceful.perazzo.app/admin/ ")).toBe(
      "https://pieceful.perazzo.app",
    );
  });

  test("accepts comma-separated frontend origins", () => {
    const origins = configuredWebOrigins(
      "https://pieceful.perazzo.app/, https://pieceful-preview.vercel.app/admin",
    );

    expect(origins).toEqual([
      "https://pieceful.perazzo.app",
      "https://pieceful-preview.vercel.app",
    ]);
    expect(isAllowedWebOrigin("https://pieceful.perazzo.app", origins)).toBe(true);
  });

  test("accepts local development origins and rejects unrelated sites", () => {
    expect(isAllowedWebOrigin("http://192.168.1.20:3000", [])).toBe(true);
    expect(isAllowedWebOrigin("https://unrelated.example", [])).toBe(false);
  });
});

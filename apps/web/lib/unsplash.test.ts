import { describe, expect, test } from "bun:test";
import { resolveApiUrl } from "./unsplash";

describe("Unsplash API address", () => {
  test("keeps localhost while the web app is local", () => {
    expect(
      resolveApiUrl("http://localhost:3001", {
        hostname: "localhost",
        protocol: "http:",
      }),
    ).toBe("http://localhost:3001");
  });

  test("uses the computer host when opened from another device", () => {
    expect(
      resolveApiUrl("http://localhost:3001", {
        hostname: "192.168.3.104",
        protocol: "http:",
      }),
    ).toBe("http://192.168.3.104:3001");
  });

  test("preserves an explicitly configured remote API", () => {
    expect(
      resolveApiUrl("https://api.pieceful.example", {
        hostname: "pieceful.example",
        protocol: "https:",
      }),
    ).toBe("https://api.pieceful.example");
  });

  test("rejects mixed content on an HTTPS page", () => {
    expect(() =>
      resolveApiUrl("http://api.pieceful.example", {
        hostname: "pieceful.example",
        protocol: "https:",
      }),
    ).toThrow("também precisa usar HTTPS");
  });
});

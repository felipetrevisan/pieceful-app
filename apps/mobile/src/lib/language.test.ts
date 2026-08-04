import { describe, expect, test } from "bun:test";
import { resolveDeviceLanguage } from "./language";

describe("resolveDeviceLanguage", () => {
  test("uses Portuguese for Portuguese devices", () => {
    expect(resolveDeviceLanguage("pt")).toBe("pt-BR");
    expect(resolveDeviceLanguage("PT")).toBe("pt-BR");
    expect(resolveDeviceLanguage("pt-BR")).toBe("pt-BR");
    expect(resolveDeviceLanguage("pt-PT")).toBe("pt-BR");
  });

  test("uses English for English devices", () => {
    expect(resolveDeviceLanguage("en")).toBe("en");
  });

  test("falls back to English for every other language", () => {
    expect(resolveDeviceLanguage("es")).toBe("en");
    expect(resolveDeviceLanguage("de")).toBe("en");
    expect(resolveDeviceLanguage(null)).toBe("en");
    expect(resolveDeviceLanguage(undefined)).toBe("en");
  });
});

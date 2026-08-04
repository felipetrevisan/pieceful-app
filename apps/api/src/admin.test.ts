import { describe, expect, test } from "bun:test";
import { loginFingerprint, tokenHash } from "./admin";

describe("admin authentication primitives", () => {
  test("stores only a deterministic SHA-256 token hash", () => {
    expect(tokenHash("session-secret")).toHaveLength(64);
    expect(tokenHash("session-secret")).toBe(tokenHash("session-secret"));
    expect(tokenHash("another-session")).not.toBe(tokenHash("session-secret"));
  });

  test("binds the fingerprint to the normalized admin identity", () => {
    const fingerprint = loginFingerprint({ "user-agent": "Pieceful Test" }, "ADMIN@example.com");
    expect(fingerprint).toHaveLength(64);
    expect(fingerprint).not.toContain("admin@example.com");
    expect(fingerprint).toBe(
      loginFingerprint({ "user-agent": "Another Agent" }, "admin@example.com"),
    );
    expect(fingerprint).not.toBe(loginFingerprint({}, "other@example.com"));
  });
});

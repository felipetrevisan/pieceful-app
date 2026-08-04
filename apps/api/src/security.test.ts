import { describe, expect, test } from "bun:test";
import { CircuitBreaker, requestFingerprint, requestId, TtlCache } from "./security";

describe("API security helpers", () => {
  test("accepts only bounded request identifiers", () => {
    expect(requestId({ "x-request-id": "request_123456" })).toBe("request_123456");
    expect(requestId({ "x-request-id": "bad id" })).not.toBe("bad id");
  });

  test("does not expose raw request identity", () => {
    const fingerprint = requestFingerprint({}, "player@example.com");
    expect(fingerprint).toHaveLength(64);
    expect(fingerprint).not.toContain("player@example.com");
  });

  test("expires cached values", async () => {
    const cache = new TtlCache<string>(1);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
    await Bun.sleep(5);
    expect(cache.get("key")).toBeNull();
  });

  test("opens after repeated dependency failures and recovers after cooldown", async () => {
    let now = 1_000;
    const breaker = new CircuitBreaker(2, 100, () => now);
    const failing = () => Promise.reject(new Error("upstream_failed"));
    await expect(breaker.run(failing)).rejects.toThrow("upstream_failed");
    await expect(breaker.run(failing)).rejects.toThrow("upstream_failed");
    await expect(breaker.run(() => Promise.resolve("unreachable"))).rejects.toThrow(
      "dependency_circuit_open",
    );
    now += 101;
    await expect(breaker.run(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });
});

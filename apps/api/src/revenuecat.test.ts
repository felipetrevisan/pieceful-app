import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { verifyRevenueCatSignature } from "./revenuecat";

describe("RevenueCat webhook signatures", () => {
  test("accepts a current valid HMAC and rejects modified bodies", () => {
    const body = JSON.stringify({ event: { id: "event-1" } });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "secret").update(`${timestamp}.${body}`).digest("hex");
    const header = `t=${timestamp},v1=${signature}`;
    expect(verifyRevenueCatSignature(body, header, "secret")).toBe(true);
    expect(verifyRevenueCatSignature(`${body} `, header, "secret")).toBe(false);
  });
});

import { describe, expect, test } from "bun:test";
import { safePathname } from "./observability";

describe("safePathname", () => {
  test("never logs query parameters containing private data", () => {
    expect(safePathname("https://pieceful.app/api/search?email=private@example.com")).toBe(
      "/api/search",
    );
  });

  test("handles malformed URLs", () => {
    expect(safePathname("not a url")).toBe("/invalid-url");
  });
});

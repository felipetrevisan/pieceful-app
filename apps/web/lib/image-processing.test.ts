import { describe, expect, test } from "bun:test";
import { retainImageFile, validateImage } from "./image-processing";

describe("mobile image access", () => {
  test("retains an independent copy of a selected image", async () => {
    const source = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "memory.jpg", {
      type: "image/jpeg",
    });
    const retained = await retainImageFile(source);

    expect(retained).not.toBe(source);
    expect(retained.name).toBe("memory.jpg");
    expect(await retained.arrayBuffer()).toEqual(await source.arrayBuffer());
    await expect(validateImage(retained)).resolves.toBeUndefined();
  });
});

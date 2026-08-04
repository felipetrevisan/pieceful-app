import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { processImage } from "./images";

describe("server-side image normalization", () => {
  test("reencodes valid input as bounded metadata-free WebP variants", async () => {
    const input = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#336699" },
    })
      .png()
      .toBuffer();
    const result = await processImage(new File([input], "photo.png", { type: "image/png" }), {
      minimumDimension: 300,
      maximumDimension: 640,
      thumbnailDimension: 160,
    });
    expect((await sharp(result.image.bytes).metadata()).format).toBe("webp");
    expect(result.image.width).toBe(640);
    expect(result.thumbnail.width).toBe(160);
  });

  test("rejects files whose declared MIME type hides invalid bytes", async () => {
    await expect(
      processImage(new File(["not an image"], "photo.png", { type: "image/png" }), {
        minimumDimension: 300,
        maximumDimension: 640,
        thumbnailDimension: 160,
      }),
    ).rejects.toThrow();
  });
});

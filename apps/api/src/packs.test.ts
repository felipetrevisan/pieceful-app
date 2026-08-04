import { describe, expect, test } from "bun:test";
import {
  absoluteSignedStorageUrl,
  imagePackStoragePath,
  isVersionAtLeast,
  revenueCatOwnsProduct,
  xpToReachLevel,
} from "./packs";

describe("image pack authorization", () => {
  test("extracts only managed image-pack object paths", () => {
    expect(
      imagePackStoragePath(
        "https://example.supabase.co/storage/v1/object/public/image-packs/pack/images/photo.jpg",
      ),
    ).toBe("pack/images/photo.jpg");
    expect(imagePackStoragePath("https://images.example.com/photo.jpg")).toBeNull();
  });

  test("normalizes relative signed storage URLs returned by Supabase", () => {
    expect(
      absoluteSignedStorageUrl(
        "https://example.supabase.co",
        "/object/sign/image-packs/pack/images/photo.webp?token=secret",
      ),
    ).toBe(
      "https://example.supabase.co/storage/v1/object/sign/image-packs/pack/images/photo.webp?token=secret",
    );
    expect(
      absoluteSignedStorageUrl(
        "https://example.supabase.co",
        "https://cdn.example.com/photo.webp?token=secret",
      ),
    ).toBe("https://cdn.example.com/photo.webp?token=secret");
  });

  test("uses the same level curve as the mobile app", () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(500);
    expect(xpToReachLevel(10)).toBe(5_400);
    expect(xpToReachLevel(100)).toBe(170_775);
  });

  test("accepts verified one-time purchases", () => {
    expect(
      revenueCatOwnsProduct(
        { subscriber: { non_subscriptions: { "pieceful.pack.ocean": [{}] } } },
        "pieceful.pack.ocean",
      ),
    ).toBe(true);
    expect(revenueCatOwnsProduct({ subscriber: { non_subscriptions: {} } }, "missing")).toBe(false);
  });

  test("rejects expired entitlements", () => {
    expect(
      revenueCatOwnsProduct(
        {
          subscriber: {
            entitlements: {
              pack: {
                product_identifier: "pieceful.pack.ocean",
                expires_date: "2020-01-01T00:00:00Z",
              },
            },
          },
        },
        "pieceful.pack.ocean",
      ),
    ).toBe(false);
  });

  test("enforces minimum app versions without accepting malformed versions", () => {
    expect(isVersionAtLeast("1.4.0", "1.3.9")).toBe(true);
    expect(isVersionAtLeast("1.3.9", "1.4.0")).toBe(false);
    expect(isVersionAtLeast(undefined, "1.4.0")).toBe(false);
    expect(isVersionAtLeast("latest", "1.4.0")).toBe(false);
    expect(isVersionAtLeast("1.0.0", null)).toBe(true);
  });
});

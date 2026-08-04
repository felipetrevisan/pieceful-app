import { Elysia, t } from "elysia";
import { CircuitBreaker, consumeRateLimit, fetchWithTimeout } from "./security";

const schema = "pieceful";
const bucket = "image-packs";
const signedUrlSeconds = 15 * 60;
const revenueCatBreaker = new CircuitBreaker(3, 30_000);

interface PackImageRow {
  id: string;
  title_pt: string;
  title_en: string;
  image_url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  bytes: number;
  content_sha256: string | null;
  sort_order: number;
  is_published: boolean;
}

interface PackRow {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  cover_url: string;
  audience: "child" | "teen" | "adult" | "all";
  is_free: boolean;
  store_product_id: string | null;
  is_published: boolean;
  sort_order: number;
  total_bytes: number;
  available_from: string | null;
  minimum_app_version: string | null;
  reward_level: number | null;
  image_count?: number;
  pack_images?: PackImageRow[];
}

interface RevenueCatSubscriber {
  subscriber?: {
    non_subscriptions?: Record<string, unknown[]>;
    entitlements?: Record<string, { product_identifier?: string; expires_date?: string | null }>;
  };
}

function configuration() {
  const url = Bun.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase catalog access is not configured.");
  return { url, key };
}

async function database<T>(path: string, init: RequestInit = {}) {
  const { url, key } = configuration();
  const response = await fetchWithTimeout(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Accept-Profile": schema,
      "Content-Profile": schema,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error((await response.text()) || "Catalog query failed.");
  return (await response.json()) as T;
}

export function imagePackStoragePath(url: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const path = url.split(marker)[1]?.split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

export function absoluteSignedStorageUrl(supabaseUrl: string, signedUrl: string) {
  if (signedUrl.startsWith("http")) return signedUrl;
  const path = signedUrl.startsWith("/") ? signedUrl : `/${signedUrl}`;
  return `${supabaseUrl}/storage/v1${path}`;
}

async function signedStorageUrl(sourceUrl: string) {
  const path = imagePackStoragePath(sourceUrl);
  if (!path) throw new Error("Image pack contains an unmanaged storage URL.");
  const config = configuration();
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetchWithTimeout(
    `${config.url}/storage/v1/object/sign/${bucket}/${encodedPath}`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: signedUrlSeconds }),
    },
  );
  if (!response.ok) throw new Error((await response.text()) || "Could not sign pack image.");
  const data = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const signed = data.signedURL ?? data.signedUrl;
  if (!signed) throw new Error("Storage did not return a signed URL.");
  return absoluteSignedStorageUrl(config.url, signed);
}

async function authenticatedUserId(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) return null;
  const config = configuration();
  const response = await fetchWithTimeout(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.key, Authorization: authorization },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string };
  return user.id ?? null;
}

export function xpToReachLevel(level: number) {
  const bounded = Math.max(1, Math.min(100, Math.floor(level)));
  const steps = bounded - 1;
  return steps * 500 + (steps * (steps - 1) * 25) / 2;
}

export function isVersionAtLeast(current: string | undefined, minimum: string | null) {
  if (!minimum) return true;
  if (!current) return false;
  const parse = (value: string): readonly [number, number, number] | null => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim());
    return match ? ([Number(match[1]), Number(match[2]), Number(match[3])] as const) : null;
  };
  const left = parse(current);
  const right = parse(minimum);
  if (!left || !right) return false;
  if (left[0] !== right[0]) return left[0] > right[0];
  if (left[1] !== right[1]) return left[1] > right[1];
  if (left[2] !== right[2]) return left[2] > right[2];
  return true;
}

async function hasRewardLevel(userId: string, level: number) {
  const profiles = await database<{ xp: number }[]>(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=xp&limit=1`,
  );
  return Number(profiles[0]?.xp ?? 0) >= xpToReachLevel(level);
}

export function revenueCatOwnsProduct(payload: RevenueCatSubscriber, productId: string) {
  if ((payload.subscriber?.non_subscriptions?.[productId]?.length ?? 0) > 0) return true;
  const now = Date.now();
  return Object.values(payload.subscriber?.entitlements ?? {}).some((entitlement) => {
    if (entitlement.product_identifier !== productId) return false;
    return !entitlement.expires_date || Date.parse(entitlement.expires_date) > now;
  });
}

async function hasPurchasedProduct(userId: string, productId: string) {
  const ledger = await database<
    { is_active: boolean; expires_at: string | null; updated_at: string }[]
  >(
    `purchase_entitlements?user_id=eq.${encodeURIComponent(userId)}&product_id=eq.${encodeURIComponent(productId)}&select=is_active,expires_at,updated_at&limit=1`,
  );
  const entitlement = ledger[0];
  if (
    entitlement?.is_active &&
    Date.parse(entitlement.updated_at) > Date.now() - 6 * 60 * 60 * 1000 &&
    (!entitlement.expires_at || Date.parse(entitlement.expires_at) > Date.now())
  )
    return true;

  const secret = Bun.env.REVENUECAT_SECRET_API_KEY;
  if (!secret) throw new Error("RevenueCat server verification is not configured.");
  const response = await revenueCatBreaker.run(() =>
    fetchWithTimeout(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
    }),
  );
  if (!response.ok) return false;
  const owns = revenueCatOwnsProduct((await response.json()) as RevenueCatSubscriber, productId);
  await database("purchase_entitlements?on_conflict=user_id,product_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      user_id: userId,
      product_id: productId,
      is_active: owns,
      source: "reconciliation",
      updated_at: new Date().toISOString(),
      last_event_at: new Date().toISOString(),
    }),
  });
  return owns;
}

async function canAccess(pack: PackRow, userId: string | null) {
  if (pack.reward_level)
    return Boolean(userId && (await hasRewardLevel(userId, pack.reward_level)));
  if (pack.is_free) return true;
  return Boolean(
    userId && pack.store_product_id && (await hasPurchasedProduct(userId, pack.store_product_id)),
  );
}

async function catalog(audience: string, appVersion?: string) {
  const now = encodeURIComponent(new Date().toISOString());
  const rows = await database<PackRow[]>(
    `image_packs?select=*,pack_images(id,title_pt,title_en,width,height,bytes,sort_order,is_published)&is_published=eq.true&audience=in.(${audience},all)&or=(available_from.is.null,available_from.lte.${now})&order=sort_order.asc&limit=100`,
  );
  return Promise.all(
    rows
      .filter((pack) => isVersionAtLeast(appVersion, pack.minimum_app_version))
      .map(async (pack) => {
        const images = (pack.pack_images ?? [])
          .filter((image) => image.is_published)
          .sort((left, right) => left.sort_order - right.sort_order);
        return {
          ...pack,
          image_count: images.length,
          cover_url: pack.cover_url ? await signedStorageUrl(pack.cover_url) : "",
          // Catalog entries contain enough metadata for existing app builds to show the
          // real count, while download URLs and integrity hashes remain access-gated.
          pack_images: images.map((image) => ({
            ...image,
            image_url: "",
            thumbnail_url: "",
            content_sha256: null,
          })),
        };
      }),
  );
}

async function downloadablePack(packId: string, authorization?: string, appVersion?: string) {
  const rows = await database<PackRow[]>(
    `image_packs?id=eq.${encodeURIComponent(packId)}&is_published=eq.true&select=*,pack_images(*)&limit=1`,
  );
  const pack = rows[0];
  if (!pack) return { status: 404, body: { ok: false, message: "Pack not found." } };
  if (!isVersionAtLeast(appVersion, pack.minimum_app_version)) {
    return { status: 426, body: { ok: false, message: "App update required." } };
  }
  const userId = await authenticatedUserId(authorization);
  if (!(await canAccess(pack, userId))) {
    return { status: userId ? 403 : 401, body: { ok: false, message: "Pack access denied." } };
  }
  const images = (pack.pack_images ?? [])
    .filter((image) => image.is_published)
    .sort((left, right) => left.sort_order - right.sort_order);
  const signedImages = await Promise.all(
    images.map(async (image) => ({
      ...image,
      image_url: await signedStorageUrl(image.image_url),
      thumbnail_url: await signedStorageUrl(image.thumbnail_url),
    })),
  );
  return {
    status: 200,
    body: {
      ok: true,
      pack: {
        ...pack,
        cover_url: pack.cover_url ? await signedStorageUrl(pack.cover_url) : "",
        pack_images: signedImages,
      },
    },
  };
}

export const packRoutes = new Elysia({ prefix: "/api/packs" })
  .get(
    "/",
    async ({ query, headers, set }) => {
      if (!(await consumeRateLimit(headers, "packs.catalog", 120))) {
        set.status = 429;
        return { ok: false, message: "Muitas consultas ao catálogo." };
      }
      return { ok: true, packs: await catalog(query.audience, headers["x-app-version"]) };
    },
    {
      query: t.Object({
        audience: t.Union([t.Literal("child"), t.Literal("teen"), t.Literal("adult")]),
      }),
    },
  )
  .post("/:id/access", async ({ params, headers, set }) => {
    if (!(await consumeRateLimit(headers, "packs.access", 30))) {
      set.status = 429;
      return { ok: false, message: "Muitas solicitações de download." };
    }
    const result = await downloadablePack(
      params.id,
      headers.authorization,
      headers["x-app-version"],
    );
    set.status = result.status;
    return result.body;
  });

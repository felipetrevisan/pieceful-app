import { randomUUID } from "node:crypto";
import { Elysia, t } from "elysia";
import { type ProcessedImagePair, processImage } from "./images";
import { consumeRateLimit, fetchWithTimeout } from "./security";

interface StorageObject {
  name: string;
  metadata?: { size?: number };
}

function configuration() {
  const url = Bun.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase upload access is not configured.");
  return { url, key };
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

async function listObjects(bucket: string, prefix: string) {
  const config = configuration();
  const response = await fetchWithTimeout(`${config.url}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }),
  });
  if (!response.ok) throw new Error("Could not inspect storage quota.");
  return (await response.json()) as StorageObject[];
}

async function uploadObject(bucket: string, path: string, bytes: Uint8Array) {
  const config = configuration();
  const payload = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const response = await fetchWithTimeout(`${config.url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "image/webp",
      "x-upsert": "true",
    },
    body: payload,
  });
  if (!response.ok) throw new Error("Could not store the validated image.");
}

async function removeObjects(bucket: string, prefixes: string[]) {
  if (!prefixes.length) return;
  const config = configuration();
  const response = await fetchWithTimeout(`${config.url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes }),
  });
  if (!response.ok) throw new Error("Could not remove superseded images.");
}

async function callUserRpc(authorization: string, name: string, body: unknown) {
  const config = configuration();
  const response = await fetchWithTimeout(`${config.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: authorization,
      "Content-Type": "application/json",
      "Content-Profile": "pieceful",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Could not complete the authenticated deletion.");
}

const unauthorized = (set: { status?: number | string }) => {
  set.status = 401;
  return { ok: false, message: "Authentication required." };
};

export const uploadRoutes = new Elysia({ prefix: "/api/uploads" })
  .post(
    "/avatar",
    async ({ body, headers, set }) => {
      const { file } = body as { file: File };
      const userId = await authenticatedUserId(headers.authorization);
      if (!userId) return unauthorized(set);
      if (!(await consumeRateLimit(headers, "uploads.avatar", 10, 3600, userId))) {
        set.status = 429;
        return { ok: false, message: "Avatar upload limit reached." };
      }
      let processed: ProcessedImagePair;
      try {
        processed = await processImage(file, {
          minimumDimension: 64,
          maximumDimension: 1024,
          thumbnailDimension: 256,
        });
      } catch {
        set.status = 400;
        return { ok: false, message: "Invalid avatar image." };
      }
      if (processed.image.bytes.byteLength > 5 * 1024 * 1024) {
        set.status = 400;
        return { ok: false, message: "Processed avatar is too large." };
      }
      const existing = await listObjects("avatars", userId);
      const path = `${userId}/avatar-${randomUUID()}.webp`;
      await uploadObject("avatars", path, processed.image.bytes);
      await removeObjects(
        "avatars",
        existing.map((object) => `${userId}/${object.name}`).filter((name) => name !== path),
      );
      const config = configuration();
      return { ok: true, url: `${config.url}/storage/v1/object/public/avatars/${path}` };
    },
    { body: t.Object({ file: t.File({ maxSize: "15m" }) }) },
  )
  .post(
    "/puzzles/:id",
    async ({ body, params, headers, set }) => {
      const { file } = body as { file: File };
      const userId = await authenticatedUserId(headers.authorization);
      if (!userId) return unauthorized(set);
      if (!(await consumeRateLimit(headers, "uploads.puzzle", 60, 3600, userId))) {
        set.status = 429;
        return { ok: false, message: "Puzzle image upload limit reached." };
      }
      let processed: ProcessedImagePair;
      try {
        processed = await processImage(file, {
          minimumDimension: 300,
          maximumDimension: 4096,
          thumbnailDimension: 640,
        });
      } catch {
        set.status = 400;
        return { ok: false, message: "Invalid puzzle image." };
      }
      const existing = await listObjects("puzzle-images", userId);
      const currentBytes = existing.reduce(
        (total, object) => total + Number(object.metadata?.size ?? 0),
        0,
      );
      const path = `${userId}/${params.id}.webp`;
      const previous = existing.find((object) => `${userId}/${object.name}` === path);
      const projected =
        currentBytes - Number(previous?.metadata?.size ?? 0) + processed.image.bytes.byteLength;
      if (existing.length >= 250 && !previous) {
        set.status = 409;
        return { ok: false, message: "Puzzle image count quota reached." };
      }
      if (projected > 500 * 1024 * 1024) {
        set.status = 409;
        return { ok: false, message: "Puzzle image storage quota reached." };
      }
      await uploadObject("puzzle-images", path, processed.image.bytes);
      return { ok: true, path };
    },
    {
      params: t.Object({
        id: t.String({ minLength: 8, maxLength: 120, pattern: "^[A-Za-z0-9][A-Za-z0-9._-]+$" }),
      }),
      body: t.Object({ file: t.File({ maxSize: "15m" }) }),
    },
  )
  .delete(
    "/puzzles",
    async ({ body, headers, set }) => {
      const { ids } = body as { ids: string[] };
      const authorization = headers.authorization;
      const userId = await authenticatedUserId(authorization);
      if (!userId || !authorization) return unauthorized(set);
      if (!(await consumeRateLimit(headers, "uploads.puzzle_delete", 30, 60, userId))) {
        set.status = 429;
        return { ok: false, message: "Puzzle deletion limit reached." };
      }
      await callUserRpc(authorization, "delete_my_puzzles", { puzzle_ids: ids });
      await removeObjects(
        "puzzle-images",
        ids.map((id) => `${userId}/${id}.webp`),
      );
      return { ok: true };
    },
    {
      body: t.Object({
        ids: t.Array(
          t.String({ minLength: 8, maxLength: 120, pattern: "^[A-Za-z0-9][A-Za-z0-9._-]+$" }),
          { minItems: 1, maxItems: 50, uniqueItems: true },
        ),
      }),
    },
  )
  .delete("/account", async ({ headers, set }) => {
    const authorization = headers.authorization;
    const userId = await authenticatedUserId(authorization);
    if (!userId || !authorization) return unauthorized(set);
    if (!(await consumeRateLimit(headers, "uploads.account_delete", 3, 3600, userId))) {
      set.status = 429;
      return { ok: false, message: "Account deletion limit reached." };
    }
    const [avatars, puzzles] = await Promise.all([
      listObjects("avatars", userId),
      listObjects("puzzle-images", userId),
    ]);
    await Promise.all([
      removeObjects(
        "avatars",
        avatars.map((object) => `${userId}/${object.name}`),
      ),
      removeObjects(
        "puzzle-images",
        puzzles.map((object) => `${userId}/${object.name}`),
      ),
    ]);
    await callUserRpc(authorization, "delete_my_account", {});
    return { ok: true };
  });

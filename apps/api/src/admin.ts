import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Elysia, t } from "elysia";

const schema = "pieceful";
const bucket = "image-packs";
const sessionSeconds = 60 * 60 * 12;

interface PackImage {
  id: string;
  pack_id: string;
  title_pt: string;
  title_en: string;
  image_url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  bytes: number;
  sort_order: number;
  is_published: boolean;
}

interface ImagePack {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  cover_url: string;
  audience: "child" | "teen" | "adult" | "all";
  is_free: boolean;
  is_published: boolean;
  sort_order: number;
  total_bytes: number;
  available_from: string | null;
  minimum_app_version: string | null;
  pack_images: PackImage[];
}

interface SessionRequest {
  password: string;
}

interface CreatePackRequest {
  slug: string;
  title_pt: string;
  title_en: string;
}

interface UploadImageRequest {
  file: File;
  title_pt: string;
  title_en: string;
  width: number;
  height: number;
  sort_order: number;
  is_published: boolean;
  make_cover: boolean;
}

function configuration() {
  const url = Bun.env.SUPABASE_URL;
  const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase administrativo não configurado.");
  return { url: url.replace(/\/$/, ""), key };
}

function configured() {
  return Boolean(
    (Bun.env.PIECEFUL_ADMIN_PASSWORD?.length ?? 0) >= 12 &&
      (Bun.env.PIECEFUL_ADMIN_SESSION_SECRET?.length ?? 0) >= 32 &&
      Bun.env.SUPABASE_URL &&
      Bun.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(expiresAt: string) {
  return createHmac("sha256", Bun.env.PIECEFUL_ADMIN_SESSION_SECRET ?? "")
    .update(expiresAt)
    .digest("hex");
}

function createToken() {
  const expiresAt = String(Math.floor(Date.now() / 1000) + sessionSeconds);
  return `${expiresAt}.${signature(expiresAt)}`;
}

function authorized(header?: string) {
  if (!configured() || !header?.startsWith("Bearer ")) return false;
  const [expiresAt, tokenSignature] = header.slice(7).split(".");
  if (!expiresAt || !tokenSignature || Number(expiresAt) <= Date.now() / 1000) return false;
  return equal(tokenSignature, signature(expiresAt));
}

async function database<T>(path: string, init: RequestInit = {}) {
  const { url, key } = configuration();
  const response = await fetch(`${url}/rest/v1/${path}`, {
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
  if (!response.ok) throw new Error((await response.text()) || "Falha ao acessar o catálogo.");
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

async function packs() {
  const [packRows, images] = await Promise.all([
    database<Omit<ImagePack, "pack_images">[]>(
      "image_packs?select=*&order=sort_order.asc,created_at.desc",
    ),
    database<PackImage[]>("pack_images?select=*&order=sort_order.asc,created_at.asc"),
  ]);
  return packRows.map((pack) => ({
    ...pack,
    pack_images: images.filter((image) => image.pack_id === pack.id),
  }));
}

async function updatePack(id: string, values: Record<string, unknown>) {
  const rows = await database<Omit<ImagePack, "pack_images">[]>(
    `image_packs?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }),
    },
  );
  return rows[0];
}

async function upload(path: string, file: File) {
  const { url, key } = configuration();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file,
  });
  if (!response.ok) throw new Error((await response.text()) || "Falha ao enviar a imagem.");
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

async function removeStorageUrls(urls: string[]) {
  const config = configuration();
  const marker = `/storage/v1/object/public/${bucket}/`;
  const prefixes = urls.map((url) => url.split(marker)[1]).filter(Boolean);
  if (!prefixes.length) return;
  await fetch(`${config.url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes }),
  });
}

async function refreshTotal(packId: string) {
  const images = await database<Pick<PackImage, "bytes">[]>(
    `pack_images?pack_id=eq.${encodeURIComponent(packId)}&select=bytes`,
  );
  await updatePack(packId, {
    total_bytes: images.reduce((total, image) => total + Number(image.bytes), 0),
  });
}

const unauthorized = (set: { status?: number | string }) => {
  set.status = 401;
  return { ok: false, message: "Não autorizado." };
};

export const adminRoutes = new Elysia({ prefix: "/api/admin" })
  .post(
    "/session",
    async ({ body, set }) => {
      const request = body as SessionRequest;
      if (!configured()) {
        set.status = 503;
        return { ok: false, message: "Configure as variáveis administrativas." };
      }
      if (!equal(request.password, Bun.env.PIECEFUL_ADMIN_PASSWORD ?? "")) {
        await Bun.sleep(600);
        set.status = 401;
        return { ok: false, message: "Senha incorreta." };
      }
      return { ok: true, token: createToken() };
    },
    { body: t.Object({ password: t.String({ minLength: 12, maxLength: 256 }) }) },
  )
  .get("/packs", async ({ headers, set }) => {
    if (!authorized(headers.authorization)) return unauthorized(set);
    return { ok: true, packs: await packs() };
  })
  .post(
    "/packs",
    async ({ headers, body, set }) => {
      const request = body as CreatePackRequest;
      if (!authorized(headers.authorization)) return unauthorized(set);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.slug)) {
        set.status = 400;
        return { ok: false, message: "Slug inválido." };
      }
      const rows = await database<Omit<ImagePack, "pack_images">[]>("image_packs", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          ...request,
          cover_url: "",
          is_published: false,
          is_free: true,
          audience: "child",
          sort_order: 0,
        }),
      });
      set.status = 201;
      return { ok: true, pack: rows[0] };
    },
    { body: t.Object({ slug: t.String(), title_pt: t.String(), title_en: t.String() }) },
  )
  .patch(
    "/packs/:id",
    async ({ headers, params, body, set }) => {
      const request = body as Record<string, unknown>;
      if (!authorized(headers.authorization)) return unauthorized(set);
      const allowed = [
        "slug",
        "title_pt",
        "title_en",
        "description_pt",
        "description_en",
        "cover_url",
        "audience",
        "is_free",
        "is_published",
        "sort_order",
        "available_from",
        "minimum_app_version",
      ];
      const values = Object.fromEntries(
        Object.entries(request).filter(([key]) => allowed.includes(key)),
      );
      return { ok: true, pack: await updatePack(params.id, values) };
    },
    { body: t.Record(t.String(), t.Unknown()) },
  )
  .delete("/packs/:id", async ({ headers, params, set }) => {
    if (!authorized(headers.authorization)) return unauthorized(set);
    const images = await database<Pick<PackImage, "image_url">[]>(
      `pack_images?pack_id=eq.${encodeURIComponent(params.id)}&select=image_url`,
    );
    await removeStorageUrls(images.map((image) => image.image_url));
    await database(`image_packs?id=eq.${encodeURIComponent(params.id)}`, { method: "DELETE" });
    return { ok: true };
  })
  .post(
    "/packs/:id/images",
    async ({ headers, params, body, set }) => {
      const request = body as UploadImageRequest;
      if (!authorized(headers.authorization)) return unauthorized(set);
      const file = request.file;
      const accepted = ["image/jpeg", "image/png", "image/webp"];
      if (
        !accepted.includes(file.type) ||
        file.size > 15 * 1024 * 1024 ||
        request.width < 300 ||
        request.height < 300
      ) {
        set.status = 400;
        return {
          ok: false,
          message: "Envie JPG, PNG ou WebP com até 15 MB e no mínimo 300 × 300.",
        };
      }
      const extension =
        file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const imageUrl = await upload(`${params.id}/images/${randomUUID()}.${extension}`, file);
      try {
        const rows = await database<PackImage[]>("pack_images", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            pack_id: params.id,
            title_pt: request.title_pt,
            title_en: request.title_en,
            image_url: imageUrl,
            thumbnail_url: imageUrl,
            width: request.width,
            height: request.height,
            bytes: file.size,
            sort_order: request.sort_order,
            is_published: request.is_published,
          }),
        });
        if (request.make_cover) await updatePack(params.id, { cover_url: imageUrl });
        await refreshTotal(params.id);
        set.status = 201;
        return { ok: true, image: rows[0] };
      } catch (error) {
        await removeStorageUrls([imageUrl]);
        throw error;
      }
    },
    {
      body: t.Object({
        file: t.File(),
        title_pt: t.String(),
        title_en: t.String(),
        width: t.Numeric(),
        height: t.Numeric(),
        sort_order: t.Numeric(),
        is_published: t.BooleanString(),
        make_cover: t.BooleanString(),
      }),
    },
  )
  .patch(
    "/images/:id",
    async ({ headers, params, body, set }) => {
      const request = body as Record<string, unknown>;
      if (!authorized(headers.authorization)) return unauthorized(set);
      const allowed = ["title_pt", "title_en", "sort_order", "is_published"];
      const values = Object.fromEntries(
        Object.entries(request).filter(([key]) => allowed.includes(key)),
      );
      const rows = await database<PackImage[]>(
        `pack_images?id=eq.${encodeURIComponent(params.id)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(values),
        },
      );
      return { ok: true, image: rows[0] };
    },
    { body: t.Record(t.String(), t.Unknown()) },
  )
  .delete(
    "/images/:id",
    async ({ headers, params, query, set }) => {
      if (!authorized(headers.authorization)) return unauthorized(set);
      await database(`pack_images?id=eq.${encodeURIComponent(params.id)}`, { method: "DELETE" });
      if (query.imageUrl) await removeStorageUrls([query.imageUrl]);
      await refreshTotal(query.packId);
      return { ok: true };
    },
    { query: t.Object({ packId: t.String(), imageUrl: t.Optional(t.String()) }) },
  );

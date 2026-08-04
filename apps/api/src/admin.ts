import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient, type User } from "@supabase/supabase-js";
import { Elysia, t } from "elysia";
import { type ProcessedImagePair, processImage } from "./images";
import { configuredWebOrigins, isAllowedWebOrigin } from "./origins";
import { consumeRateLimit, fetchWithTimeout } from "./security";

const schema = "pieceful";
const bucket = "image-packs";
const sessionSeconds = 60 * 60 * 8;
const idleSessionSeconds = 60 * 60;
const loginWindowSeconds = 15 * 60;
const maxLoginAttempts = 5;
const adminCookieName =
  Bun.env.NODE_ENV === "production" ? "__Host-pieceful_admin" : "pieceful_admin";
const adminOrigins = configuredWebOrigins(Bun.env.WEB_ORIGIN);

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
  content_sha256: string | null;
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
  store_product_id: string | null;
  is_published: boolean;
  sort_order: number;
  total_bytes: number;
  available_from: string | null;
  minimum_app_version: string | null;
  reward_level: number | null;
  pack_images: PackImage[];
}

interface SessionRequest {
  email: string;
  password: string;
  totp?: string;
}

interface AdminIdentity {
  sessionId: string;
  userId: string;
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
  sort_order: number;
  is_published: boolean;
  make_cover: boolean;
}

const packPatchBody = t.Partial(
  t.Object(
    {
      slug: t.String({ minLength: 1, maxLength: 100, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
      title_pt: t.String({ minLength: 1, maxLength: 120 }),
      title_en: t.String({ minLength: 1, maxLength: 120 }),
      description_pt: t.String({ maxLength: 1000 }),
      description_en: t.String({ maxLength: 1000 }),
      cover_url: t.String({ maxLength: 2000 }),
      audience: t.Union([
        t.Literal("child"),
        t.Literal("teen"),
        t.Literal("adult"),
        t.Literal("all"),
      ]),
      is_free: t.Boolean(),
      store_product_id: t.Union([t.String({ minLength: 1, maxLength: 200 }), t.Null()]),
      is_published: t.Boolean(),
      sort_order: t.Integer({ minimum: -10_000, maximum: 10_000 }),
      available_from: t.Union([t.String({ maxLength: 40 }), t.Null()]),
      minimum_app_version: t.Union([
        t.String({ maxLength: 40, pattern: "^(?:|[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+].*)?)$" }),
        t.Null(),
      ]),
      reward_level: t.Union([t.Integer({ minimum: 2, maximum: 100 }), t.Null()]),
    },
    { additionalProperties: false },
  ),
);

const imagePatchBody = t.Partial(
  t.Object(
    {
      title_pt: t.String({ minLength: 1, maxLength: 120 }),
      title_en: t.String({ minLength: 1, maxLength: 120 }),
      sort_order: t.Integer({ minimum: -10_000, maximum: 10_000 }),
      is_published: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

function configuration() {
  const url = Bun.env.SUPABASE_URL;
  const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase administrativo não configurado.");
  return { url: url.replace(/\/$/, ""), key };
}

function publishableConfiguration() {
  const url = Bun.env.SUPABASE_URL;
  const key = Bun.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase Auth administrativo não configurado.");
  return { url, key };
}

function configured() {
  return Boolean(
    (Bun.env.PIECEFUL_ADMIN_SESSION_SECRET?.length ?? 0) >= 32 &&
      Bun.env.SUPABASE_URL &&
      Bun.env.SUPABASE_PUBLISHABLE_KEY &&
      Bun.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function trustedAddress(headers: Record<string, string | undefined>) {
  const configuredHeader = Bun.env.TRUSTED_PROXY_IP_HEADER?.toLowerCase();
  const platformHeader = Bun.env.VERCEL
    ? "x-vercel-forwarded-for"
    : Bun.env.CLOUDFLARE
      ? "cf-connecting-ip"
      : configuredHeader;
  if (!platformHeader) return "unknown";
  return headers[platformHeader]?.split(",")[0]?.trim() || "unknown";
}

export function loginFingerprint(headers: Record<string, string | undefined>, email = "unknown") {
  const address = trustedAddress(headers);
  return createHash("sha256")
    .update(
      `${Bun.env.PIECEFUL_ADMIN_SESSION_SECRET ?? ""}:${address}:${email.trim().toLowerCase()}`,
    )
    .digest("hex");
}

function sourceFingerprint(headers: Record<string, string | undefined>) {
  return loginFingerprint(headers, headers["user-agent"] ?? "unknown");
}

function userAgentHash(headers: Record<string, string | undefined>) {
  return createHash("sha256")
    .update(headers["user-agent"] ?? "unknown")
    .digest("hex");
}

function cookieToken(headers: Record<string, string | undefined>) {
  const cookies = headers.cookie?.split(";") ?? [];
  for (const item of cookies) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === adminCookieName) {
      return decodeURIComponent(item.slice(separator + 1).trim());
    }
  }
  return null;
}

function sessionCookie(token?: string) {
  const secure = Bun.env.NODE_ENV === "production" ? "; Secure" : "";
  if (!token) return `${adminCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
  return `${adminCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionSeconds}${secure}`;
}

function assertMutationOrigin(headers: Record<string, string | undefined>) {
  const origin = headers.origin ?? "";
  if (!origin || !isAllowedWebOrigin(origin, adminOrigins)) throw new Error("invalid_admin_origin");
}

function adminAuthClient() {
  const { url, key } = publishableConfiguration();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function authenticateAdmin(request: SessionRequest) {
  const client = adminAuthClient();
  const signedIn = await client.auth.signInWithPassword({
    email: request.email.trim().toLowerCase(),
    password: request.password,
  });
  if (signedIn.error || !signedIn.data.user) throw new Error("invalid_admin_credentials");

  const factors = await client.auth.mfa.listFactors();
  const totp = factors.data?.totp.find((factor) => factor.status === "verified");
  const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  const requireMfa = Bun.env.PIECEFUL_ADMIN_REQUIRE_MFA !== "false";
  if (requireMfa && !totp) throw new Error("admin_mfa_not_enrolled");
  if (requireMfa && assurance.data?.currentLevel !== "aal2") {
    if (!request.totp) throw new Error("admin_mfa_required");
    if (!totp) throw new Error("admin_mfa_not_enrolled");
    const verified = await client.auth.mfa.challengeAndVerify({
      factorId: totp.id,
      code: request.totp,
    });
    if (verified.error) throw new Error("invalid_admin_credentials");
  }

  const current = await client.auth.getUser();
  const user = current.data.user ?? signedIn.data.user;
  if (user.app_metadata?.role !== "admin") throw new Error("admin_role_required");
  return user;
}

async function stillAdmin(userId: string) {
  const { url, key } = configuration();
  const response = await fetchWithTimeout(
    `${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  if (!response.ok) return false;
  const user = (await response.json()) as User;
  return user.app_metadata?.role === "admin";
}

async function createSession(adminUserId: string, agentHash: string) {
  const token = randomBytes(32).toString("base64url");
  await database("admin_sessions", {
    method: "POST",
    body: JSON.stringify({
      token_hash: tokenHash(token),
      admin_user_id: adminUserId,
      expires_at: new Date(Date.now() + sessionSeconds * 1000).toISOString(),
      idle_expires_at: new Date(Date.now() + idleSessionSeconds * 1000).toISOString(),
      last_seen_at: new Date().toISOString(),
      user_agent_hash: agentHash,
    }),
  });
  return token;
}

async function authorized(headers: Record<string, string | undefined>) {
  if (!configured()) return null;
  const token = cookieToken(headers);
  if (!token) return null;
  if (token.length < 32 || token.length > 128) return null;
  const rows = await database<
    { id: string; admin_user_id: string; user_agent_hash: string | null; last_seen_at: string }[]
  >(
    `admin_sessions?token_hash=eq.${tokenHash(token)}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&idle_expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,admin_user_id,user_agent_hash,last_seen_at&limit=1`,
  );
  const session = rows[0];
  if (!session || session.user_agent_hash !== userAgentHash(headers)) return null;
  if (!(await stillAdmin(session.admin_user_id))) {
    await database(`admin_sessions?id=eq.${session.id}`, {
      method: "PATCH",
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    });
    return null;
  }
  if (Date.parse(session.last_seen_at) < Date.now() - 5 * 60 * 1000) {
    await database(`admin_sessions?id=eq.${session.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        last_seen_at: new Date().toISOString(),
        idle_expires_at: new Date(Date.now() + idleSessionSeconds * 1000).toISOString(),
      }),
    });
  }
  return { sessionId: session.id, userId: session.admin_user_id } satisfies AdminIdentity;
}

async function revokeSession(headers: Record<string, string | undefined>) {
  const token = cookieToken(headers);
  if (!token) return;
  await database(`admin_sessions?token_hash=eq.${tokenHash(token)}`, {
    method: "PATCH",
    body: JSON.stringify({ revoked_at: new Date().toISOString() }),
  });
}

async function audit(
  identity: AdminIdentity,
  headers: Record<string, string | undefined>,
  action: string,
  resourceType: string,
  resourceId?: string,
  details: Record<string, unknown> = {},
) {
  await database("admin_audit_log", {
    method: "POST",
    body: JSON.stringify({
      admin_user_id: identity.userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      request_id: headers["x-request-id"] ?? randomUUID(),
      source_fingerprint: sourceFingerprint(headers),
      details,
    }),
  });
}

async function loginBlocked(fingerprint: string) {
  const rows = await database<{ blocked_until: string | null }[]>(
    `admin_login_attempts?fingerprint=eq.${fingerprint}&select=blocked_until&limit=1`,
  );
  return Boolean(rows[0]?.blocked_until && Date.parse(rows[0].blocked_until) > Date.now());
}

async function recordFailedLogin(fingerprint: string) {
  const rows = await database<
    {
      attempts: number;
      window_started_at: string;
    }[]
  >(`admin_login_attempts?fingerprint=eq.${fingerprint}&select=attempts,window_started_at&limit=1`);
  const current = rows[0];
  const inWindow =
    current && Date.parse(current.window_started_at) > Date.now() - loginWindowSeconds * 1000;
  const attempts = inWindow ? current.attempts + 1 : 1;
  await database("admin_login_attempts?on_conflict=fingerprint", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      fingerprint,
      attempts,
      window_started_at: inWindow ? current.window_started_at : new Date().toISOString(),
      blocked_until:
        attempts >= maxLoginAttempts
          ? new Date(Date.now() + loginWindowSeconds * 1000).toISOString()
          : null,
    }),
  });
}

async function clearFailedLogins(fingerprint: string) {
  await database(`admin_login_attempts?fingerprint=eq.${fingerprint}`, { method: "DELETE" });
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
  return Promise.all(
    packRows.map(async (pack) => ({
      ...pack,
      display_cover_url: pack.cover_url ? await signAdminImage(pack.cover_url) : "",
      pack_images: await Promise.all(
        images
          .filter((image) => image.pack_id === pack.id)
          .map(async (image) => ({
            ...image,
            display_thumbnail_url: await signAdminImage(image.thumbnail_url),
          })),
      ),
    })),
  );
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

async function upload(path: string, body: Uint8Array) {
  const { url, key } = configuration();
  const payload = body.buffer.slice(
    body.byteOffset,
    body.byteOffset + body.byteLength,
  ) as ArrayBuffer;
  const response = await fetchWithTimeout(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "image/webp",
      "x-upsert": "true",
    },
    body: payload,
  });
  if (!response.ok) throw new Error((await response.text()) || "Falha ao enviar a imagem.");
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

function managedPackPath(url: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const path = url.split(marker)[1]?.split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

async function signAdminImage(sourceUrl: string) {
  const path = managedPackPath(sourceUrl);
  if (!path) return "";
  const config = configuration();
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetchWithTimeout(
    `${config.url}/storage/v1/object/sign/${bucket}/${encoded}`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 15 * 60 }),
    },
  );
  if (!response.ok) return "";
  const data = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const signed = data.signedURL ?? data.signedUrl;
  return signed ? (signed.startsWith("http") ? signed : `${config.url}${signed}`) : "";
}

async function removeStorageUrls(urls: string[]) {
  const config = configuration();
  const marker = `/storage/v1/object/public/${bucket}/`;
  const prefixes = urls.map((url) => url.split(marker)[1]).filter(Boolean);
  if (!prefixes.length) return;
  const response = await fetchWithTimeout(`${config.url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes }),
  });
  if (!response.ok) throw new Error("Falha ao remover objetos do catálogo.");
}

async function refreshTotal(packId: string) {
  const images = await database<Pick<PackImage, "bytes">[]>(
    `pack_images?pack_id=eq.${encodeURIComponent(packId)}&select=bytes`,
  );
  await updatePack(packId, {
    total_bytes: images.reduce((total, image) => total + Number(image.bytes), 0),
  });
}

async function assertPackImageQuota(packId: string) {
  const images = await database<Pick<PackImage, "bytes">[]>(
    `pack_images?pack_id=eq.${encodeURIComponent(packId)}&select=bytes&limit=101`,
  );
  if (images.length >= 100) throw new Error("pack_image_quota_exceeded");
  if (images.reduce((total, image) => total + Number(image.bytes), 0) >= 500 * 1024 * 1024) {
    throw new Error("pack_storage_quota_exceeded");
  }
}

const unauthorized = (set: { status?: number | string }) => {
  set.status = 401;
  return { ok: false, message: "Não autorizado." };
};

export const adminRoutes = new Elysia({ prefix: "/api/admin" })
  .post(
    "/session",
    async ({ body, headers, set }) => {
      const request = body as SessionRequest;
      set.headers["Cache-Control"] = "no-store";
      if (!configured()) {
        set.status = 503;
        return { ok: false, message: "Configure as variáveis administrativas." };
      }
      try {
        assertMutationOrigin(headers);
      } catch {
        set.status = 403;
        return { ok: false, message: "Origem administrativa inválida." };
      }
      const fingerprint = loginFingerprint(headers, request.email);
      if (
        !(await consumeRateLimit(
          headers,
          "admin.login",
          maxLoginAttempts,
          loginWindowSeconds,
          request.email,
        )) ||
        (await loginBlocked(fingerprint))
      ) {
        set.status = 429;
        return { ok: false, message: "Muitas tentativas. Aguarde 15 minutos." };
      }
      try {
        const user = await authenticateAdmin(request);
        await clearFailedLogins(fingerprint);
        const token = await createSession(user.id, userAgentHash(headers));
        set.headers["Set-Cookie"] = sessionCookie(token);
        const identity = { sessionId: tokenHash(token), userId: user.id };
        await audit(identity, headers, "admin.session.created", "admin_session");
        return { ok: true };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "invalid_admin_credentials";
        if (reason === "admin_mfa_required") {
          set.status = 401;
          return { ok: false, message: "Informe o código MFA para continuar." };
        }
        if (reason === "admin_mfa_not_enrolled") {
          set.status = 403;
          return { ok: false, message: "A conta administrativa precisa cadastrar MFA." };
        }
        await recordFailedLogin(fingerprint);
        set.status = 401;
        return { ok: false, message: "Credenciais administrativas inválidas." };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email", maxLength: 254 }),
        password: t.String({ minLength: 12, maxLength: 256 }),
        totp: t.Optional(t.String({ pattern: "^[0-9]{6,8}$" })),
      }),
    },
  )
  .delete("/session", async ({ headers, set }) => {
    try {
      assertMutationOrigin(headers);
    } catch {
      set.status = 403;
      return { ok: false, message: "Origem administrativa inválida." };
    }
    const identity = await authorized(headers);
    await revokeSession(headers);
    set.headers["Set-Cookie"] = sessionCookie();
    set.headers["Cache-Control"] = "no-store";
    if (identity) await audit(identity, headers, "admin.session.revoked", "admin_session");
    return { ok: true };
  })
  .get("/packs", async ({ headers, set }) => {
    if (!(await authorized(headers))) return unauthorized(set);
    set.headers["Cache-Control"] = "no-store";
    return { ok: true, packs: await packs() };
  })
  .post(
    "/packs",
    async ({ headers, body, set }) => {
      const request = body as CreatePackRequest;
      assertMutationOrigin(headers);
      const identity = await authorized(headers);
      if (!identity) return unauthorized(set);
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
      await audit(identity, headers, "catalog.pack.created", "image_pack", rows[0]?.id, {
        slug: request.slug,
      });
      set.status = 201;
      return { ok: true, pack: rows[0] };
    },
    {
      body: t.Object(
        {
          slug: t.String({ minLength: 1, maxLength: 100, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
          title_pt: t.String({ minLength: 1, maxLength: 120 }),
          title_en: t.String({ minLength: 1, maxLength: 120 }),
        },
        { additionalProperties: false },
      ),
    },
  )
  .patch(
    "/packs/:id",
    async ({ headers, params, body, set }) => {
      const request = body as Record<string, unknown>;
      assertMutationOrigin(headers);
      const identity = await authorized(headers);
      if (!identity) return unauthorized(set);
      const allowed = [
        "slug",
        "title_pt",
        "title_en",
        "description_pt",
        "description_en",
        "cover_url",
        "audience",
        "is_free",
        "store_product_id",
        "is_published",
        "sort_order",
        "available_from",
        "minimum_app_version",
        "reward_level",
      ];
      const values = Object.fromEntries(
        Object.entries(request).filter(([key]) => allowed.includes(key)),
      );
      if (values.minimum_app_version === "") values.minimum_app_version = null;
      if (values.available_from === "") values.available_from = null;
      if (typeof values.cover_url === "string") {
        const path = managedPackPath(values.cover_url);
        if (values.cover_url !== "" && !path?.startsWith(`${params.id}/images/`)) {
          set.status = 400;
          return { ok: false, message: "A capa precisa pertencer a este pacote." };
        }
      }
      const pack = await updatePack(params.id, values);
      await audit(identity, headers, "catalog.pack.updated", "image_pack", params.id, {
        fields: Object.keys(values),
      });
      return { ok: true, pack };
    },
    { body: packPatchBody },
  )
  .delete("/packs/:id", async ({ headers, params, set }) => {
    assertMutationOrigin(headers);
    const identity = await authorized(headers);
    if (!identity) return unauthorized(set);
    const images = await database<Pick<PackImage, "image_url" | "thumbnail_url">[]>(
      `pack_images?pack_id=eq.${encodeURIComponent(params.id)}&select=image_url,thumbnail_url`,
    );
    await removeStorageUrls(images.flatMap((image) => [image.image_url, image.thumbnail_url]));
    await database(`image_packs?id=eq.${encodeURIComponent(params.id)}`, { method: "DELETE" });
    await audit(identity, headers, "catalog.pack.deleted", "image_pack", params.id);
    return { ok: true };
  })
  .post(
    "/packs/:id/images",
    async ({ headers, params, body, set }) => {
      const request = body as UploadImageRequest;
      assertMutationOrigin(headers);
      const identity = await authorized(headers);
      if (!identity) return unauthorized(set);
      const file = request.file;
      if (file.size > 15 * 1024 * 1024) {
        set.status = 400;
        return {
          ok: false,
          message: "Envie JPG, PNG ou WebP com até 15 MB e no mínimo 300 × 300.",
        };
      }
      await assertPackImageQuota(params.id);
      let processed: ProcessedImagePair;
      try {
        processed = await processImage(file, {
          minimumDimension: 300,
          maximumDimension: 4096,
          thumbnailDimension: 640,
        });
      } catch {
        set.status = 400;
        return { ok: false, message: "O conteúdo do arquivo não é uma imagem válida." };
      }
      const objectId = randomUUID();
      const imageUrl = await upload(`${params.id}/images/${objectId}.webp`, processed.image.bytes);
      const thumbnailUrl = await upload(
        `${params.id}/thumbnails/${objectId}.webp`,
        processed.thumbnail.bytes,
      );
      try {
        const rows = await database<PackImage[]>("pack_images", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            pack_id: params.id,
            title_pt: request.title_pt,
            title_en: request.title_en,
            image_url: imageUrl,
            thumbnail_url: thumbnailUrl,
            width: processed.image.width,
            height: processed.image.height,
            bytes: processed.image.bytes.byteLength + processed.thumbnail.bytes.byteLength,
            content_sha256: createHash("sha256").update(processed.image.bytes).digest("hex"),
            sort_order: request.sort_order,
            is_published: request.is_published,
          }),
        });
        if (request.make_cover) await updatePack(params.id, { cover_url: imageUrl });
        await refreshTotal(params.id);
        await audit(identity, headers, "catalog.image.created", "pack_image", rows[0]?.id, {
          packId: params.id,
          bytes: file.size,
        });
        set.status = 201;
        return { ok: true, image: rows[0] };
      } catch (error) {
        await removeStorageUrls([imageUrl, thumbnailUrl]);
        throw error;
      }
    },
    {
      body: t.Object({
        file: t.File(),
        title_pt: t.String({ minLength: 1, maxLength: 120 }),
        title_en: t.String({ minLength: 1, maxLength: 120 }),
        sort_order: t.Numeric({ minimum: -10_000, maximum: 10_000 }),
        is_published: t.BooleanString(),
        make_cover: t.BooleanString(),
      }),
    },
  )
  .patch(
    "/images/:id",
    async ({ headers, params, body, set }) => {
      const request = body as Record<string, unknown>;
      assertMutationOrigin(headers);
      const identity = await authorized(headers);
      if (!identity) return unauthorized(set);
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
      await audit(identity, headers, "catalog.image.updated", "pack_image", params.id, {
        fields: Object.keys(values),
      });
      return { ok: true, image: rows[0] };
    },
    { body: imagePatchBody },
  )
  .delete("/images/:id", async ({ headers, params, set }) => {
    assertMutationOrigin(headers);
    const identity = await authorized(headers);
    if (!identity) return unauthorized(set);
    const images = await database<Pick<PackImage, "pack_id" | "image_url" | "thumbnail_url">[]>(
      `pack_images?id=eq.${encodeURIComponent(params.id)}&select=pack_id,image_url,thumbnail_url&limit=1`,
    );
    const image = images[0];
    if (!image) {
      set.status = 404;
      return { ok: false, message: "Imagem não encontrada." };
    }
    await database(`pack_images?id=eq.${encodeURIComponent(params.id)}`, { method: "DELETE" });
    await removeStorageUrls([image.image_url, image.thumbnail_url]);
    await refreshTotal(image.pack_id);
    await audit(identity, headers, "catalog.image.deleted", "pack_image", params.id, {
      packId: image.pack_id,
    });
    return { ok: true };
  });

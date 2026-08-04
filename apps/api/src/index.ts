import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { adminRoutes } from "./admin";
import { beginRequest, captureRequestError, logRequest } from "./observability";
import { configuredWebOrigins, isAllowedWebOrigin } from "./origins";
import { packRoutes } from "./packs";
import { revenueCatRoutes } from "./revenuecat";
import {
  CircuitBreaker,
  consumeRateLimit,
  fetchWithTimeout,
  requestId,
  TtlCache,
} from "./security";
import { uploadRoutes } from "./uploads";

interface UnsplashPhoto {
  id: string;
  alt_description: string | null;
  urls: { regular: string; small: string };
  links: { html: string };
  user: { name: string; links: { html: string } };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

const configuredOrigins = configuredWebOrigins(Bun.env.WEB_ORIGIN);
const photoSearchCache = new TtlCache<unknown>(5 * 60 * 1000, 200);
const unsplashBreaker = new CircuitBreaker(3, 30_000);

const unsplashHeaders = () => ({
  Authorization: `Client-ID ${Bun.env.UNSPLASH_ACCESS_KEY}`,
  "Accept-Version": "v1",
});

const app = new Elysia({ serve: { maxRequestBodySize: 16 * 1024 * 1024 } })
  .onRequest(({ request, set }) => {
    beginRequest(request);
    const id = requestId(Object.fromEntries(request.headers.entries()));
    set.headers["X-Request-Id"] = id;
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["Referrer-Policy"] = "no-referrer";
    set.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
  })
  .use(
    cors({
      origin: (request) =>
        isAllowedWebOrigin(request.headers.get("Origin") ?? "", configuredOrigins),
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-App-Version", "X-Request-Id"],
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .use(adminRoutes)
  .use(packRoutes)
  .use(uploadRoutes)
  .use(revenueCatRoutes)
  .onError(({ code, error, request, set }) => {
    const reason = error instanceof Error ? error.message : "";
    const status =
      reason === "invalid_admin_origin"
        ? 403
        : reason === "dependency_circuit_open"
          ? 503
          : code === "VALIDATION" || code === "PARSE"
            ? 400
            : code === "NOT_FOUND"
              ? 404
              : 500;
    set.status = status;
    const id = String(
      set.headers["X-Request-Id"] ?? requestId(Object.fromEntries(request.headers.entries())),
    );
    if (status >= 500) captureRequestError(error, request, id);
    return {
      ok: false,
      message:
        status === 400
          ? "Dados inválidos."
          : status === 403
            ? "Origem não autorizada."
            : status === 404
              ? "Recurso não encontrado."
              : "Serviço indisponível.",
    };
  })
  .onAfterResponse(({ request, set }) => {
    logRequest(request, set.status, String(set.headers["X-Request-Id"] ?? "unknown"));
  })
  .get("/health", () => ({ ok: true, service: "Pieceful" }))
  .get("/ready", async ({ set }) => {
    const url = Bun.env.SUPABASE_URL?.replace(/\/$/, "");
    const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY;
    const required = Boolean(
      url &&
        key &&
        apiSecretConfigured() &&
        Bun.env.REVENUECAT_WEBHOOK_SIGNING_SECRET &&
        Bun.env.REVENUECAT_WEBHOOK_AUTHORIZATION,
    );
    if (!required) {
      set.status = 503;
      return { ok: false, dependencies: { configuration: false, supabase: false } };
    }
    try {
      const response = await fetchWithTimeout(
        `${url}/auth/v1/health`,
        { headers: { apikey: key as string } },
        3000,
      );
      if (!response.ok) throw new Error("supabase_unavailable");
      return { ok: true, dependencies: { configuration: true, supabase: true } };
    } catch {
      set.status = 503;
      return { ok: false, dependencies: { configuration: true, supabase: false } };
    }
  })
  .get(
    "/api/photos/search",
    async ({ query, headers, set }) => {
      if (!(await consumeRateLimit(headers, "photos.search", 60))) {
        set.status = 429;
        return { ok: false, message: "Muitas buscas. Aguarde um minuto." };
      }
      if (!Bun.env.UNSPLASH_ACCESS_KEY) {
        set.status = 503;
        return { ok: false, message: "Unsplash is not configured." };
      }
      const parameters = new URLSearchParams({
        query: query.query,
        page: String(query.page ?? 1),
        per_page: "12",
        content_filter: "high",
      });
      const cacheKey = parameters.toString().toLowerCase();
      const cached = photoSearchCache.get(cacheKey);
      if (cached) return cached;
      const response = await unsplashBreaker.run(() =>
        fetchWithTimeout(`https://api.unsplash.com/search/photos?${parameters}`, {
          headers: unsplashHeaders(),
        }),
      );
      if (!response.ok) {
        set.status = response.status;
        return { ok: false, message: "Unsplash search is unavailable." };
      }
      const data = (await response.json()) as UnsplashSearchResponse;
      const result = {
        ok: true,
        total: data.total,
        totalPages: data.total_pages,
        photos: data.results.map((photo) => ({
          id: photo.id,
          description: photo.alt_description ?? "Foto do Unsplash",
          imageUrl: photo.urls.regular,
          thumbnailUrl: photo.urls.small,
          photographer: photo.user.name,
          photographerUrl: `${photo.user.links.html}?utm_source=pieceful&utm_medium=referral`,
          unsplashUrl: `${photo.links.html}?utm_source=pieceful&utm_medium=referral`,
        })),
      };
      photoSearchCache.set(cacheKey, result);
      return result;
    },
    {
      query: t.Object({
        query: t.String({ minLength: 2, maxLength: 80 }),
        page: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
    },
  )
  .post(
    "/api/photos/:id/download",
    async ({ params, headers, set }) => {
      if (!(await consumeRateLimit(headers, "photos.download", 30))) {
        set.status = 429;
        return { ok: false, message: "Muitos downloads. Aguarde um minuto." };
      }
      if (!Bun.env.UNSPLASH_ACCESS_KEY) {
        set.status = 503;
        return { ok: false, message: "Unsplash is not configured." };
      }
      const response = await unsplashBreaker.run(() =>
        fetchWithTimeout(`https://api.unsplash.com/photos/${params.id}/download`, {
          headers: unsplashHeaders(),
        }),
      );
      if (!response.ok) {
        set.status = response.status;
        return { ok: false, message: "Unsplash download could not be registered." };
      }
      return { ok: true };
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1, maxLength: 100, pattern: "^[A-Za-z0-9_-]+$" }),
      }),
    },
  );

// Vercel invokes the exported Elysia application as a serverless function.
// Starting a listener there crashes the invocation before CORS can respond.
if (!Bun.env.VERCEL) {
  app.listen(Number(Bun.env.PORT ?? 3001));
}

export default app;

export type Api = typeof app;

function apiSecretConfigured() {
  return Boolean(Bun.env.API_RATE_LIMIT_SECRET ?? Bun.env.PIECEFUL_ADMIN_SESSION_SECRET);
}

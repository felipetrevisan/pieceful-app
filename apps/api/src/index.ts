import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";

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

const unsplashHeaders = () => ({
  Authorization: `Client-ID ${Bun.env.UNSPLASH_ACCESS_KEY}`,
  "Accept-Version": "v1",
});

const app = new Elysia()
  .use(cors({ origin: Bun.env.WEB_ORIGIN ?? "http://localhost:3000" }))
  .onError(({ code, set }) => {
    set.status = code === "VALIDATION" ? 400 : 500;
    return {
      ok: false,
      message: code === "VALIDATION" ? "Dados inválidos." : "Serviço indisponível.",
    };
  })
  .get("/health", () => ({ ok: true, service: "Pieceful" }))
  .get(
    "/api/photos/search",
    async ({ query, set }) => {
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
      const response = await fetch(`https://api.unsplash.com/search/photos?${parameters}`, {
        headers: unsplashHeaders(),
      });
      if (!response.ok) {
        set.status = response.status;
        return { ok: false, message: "Unsplash search is unavailable." };
      }
      const data = (await response.json()) as UnsplashSearchResponse;
      return {
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
    },
    {
      query: t.Object({
        query: t.String({ minLength: 2, maxLength: 80 }),
        page: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
    },
  )
  .post("/api/photos/:id/download", async ({ params, set }) => {
    if (!Bun.env.UNSPLASH_ACCESS_KEY) {
      set.status = 503;
      return { ok: false, message: "Unsplash is not configured." };
    }
    const response = await fetch(`https://api.unsplash.com/photos/${params.id}/download`, {
      headers: unsplashHeaders(),
    });
    if (!response.ok) {
      set.status = response.status;
      return { ok: false, message: "Unsplash download could not be registered." };
    }
    return { ok: true };
  })
  .post("/api/achievements", ({ body }) => ({ ok: true, achievement: body }), {
    body: t.Object({
      puzzleId: t.String({ maxLength: 100 }),
      pieces: t.Integer({ minimum: 6, maximum: 1000 }),
      elapsedTime: t.Integer({ minimum: 0 }),
    }),
  })
  .listen(Number(Bun.env.PORT ?? 3001));

export type Api = typeof app;

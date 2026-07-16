import { Elysia, t } from "elysia";

const app = new Elysia()
  .onError(({ code, set }) => {
    set.status = code === "VALIDATION" ? 400 : 500;
    return {
      ok: false,
      message: code === "VALIDATION" ? "Dados inválidos." : "Serviço indisponível.",
    };
  })
  .get("/health", () => ({ ok: true, service: "Pieceful" }))
  .post("/api/achievements", ({ body }) => ({ ok: true, achievement: body }), {
    body: t.Object({
      puzzleId: t.String({ maxLength: 100 }),
      pieces: t.Integer({ minimum: 6, maximum: 1000 }),
      elapsedTime: t.Integer({ minimum: 0 }),
    }),
  })
  .listen(Number(Bun.env.PORT ?? 3001));

export type Api = typeof app;

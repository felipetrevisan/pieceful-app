import * as Sentry from "@sentry/bun";

const startedAt = new WeakMap<Request, number>();

Sentry.init({
  dsn: Bun.env.SENTRY_DSN,
  enabled: Boolean(Bun.env.SENTRY_DSN),
  environment: Bun.env.APP_ENV ?? Bun.env.NODE_ENV ?? "development",
  release: Bun.env.APP_RELEASE,
  sendDefaultPii: false,
  tracesSampleRate: Number(Bun.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),
});

export function beginRequest(request: Request) {
  startedAt.set(request, performance.now());
}

export function logRequest(
  request: Request,
  status: number | string | undefined,
  requestId: string,
) {
  const start = startedAt.get(request);
  startedAt.delete(request);
  const numericStatus = typeof status === "number" ? status : Number(status ?? 200);
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: numericStatus >= 500 ? "error" : "info",
      event: "http_request",
      requestId,
      method: request.method,
      path: safePathname(request.url),
      status: numericStatus,
      durationMs:
        start === undefined ? undefined : Math.round((performance.now() - start) * 10) / 10,
    }),
  );
}

export function captureRequestError(error: unknown, request: Request, requestId: string) {
  Sentry.withScope((scope) => {
    scope.setTag("request_id", requestId);
    scope.setTag("http.method", request.method);
    scope.setTag("http.path", safePathname(request.url));
    Sentry.captureException(error);
  });
}

export function safePathname(value: string) {
  try {
    return new URL(value).pathname;
  } catch {
    return "/invalid-url";
  }
}

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_APP_RELEASE,
  sendDefaultPii: false,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),
});

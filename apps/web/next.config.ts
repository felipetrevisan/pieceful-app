import { resolve } from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  transpilePackages: ["@puzzled/puzzle-engine", "@puzzled/shared"],
  turbopack: { root: resolve(process.cwd(), "../..") },
};

export default withSentryConfig(nextConfig, {
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  silent: !process.env.CI,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});

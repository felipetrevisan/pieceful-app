import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  transpilePackages: ["@puzzled/puzzle-engine", "@puzzled/shared"],
  turbopack: { root: resolve(process.cwd(), "../..") },
};

export default nextConfig;

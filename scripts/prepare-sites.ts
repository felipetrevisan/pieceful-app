import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const output = resolve(root, "dist");
const exportedSite = resolve(root, "apps/web/out");

if (!existsSync(exportedSite)) throw new Error("A exportação do Next.js não foi encontrada.");
rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, "server"), { recursive: true });
mkdirSync(resolve(output, "client"), { recursive: true });
cpSync(exportedSite, resolve(output, "client"), { recursive: true });
writeFileSync(
  resolve(output, "server/index.js"),
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    const fallback = new URL(url.origin);
    fallback.pathname = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname + ".html";
    fallback.search = url.search;
    response = await env.ASSETS.fetch(new Request(fallback, request));
    return response;
  },
};
`,
);
cpSync(resolve(root, ".openai"), resolve(output, ".openai"), { recursive: true });

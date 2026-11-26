import { resolve } from "node:path";

/**
 * TypeScript options for the `twoslash` code blocks in the docs.
 *
 * Samples import `zod-config` as users do, but it resolves to the library source in this repo
 * (`../src`), so a sample that no longer matches the API fails the docs build.
 *
 * Bare imports made by the library source itself (`zod`, `yaml`, `@aws-sdk/*`, ...) resolve to
 * `www/node_modules`, because only `www/` is installed when the docs are built (CI, Cloudflare).
 */
const wwwDir = resolve(import.meta.dirname, "..");
const srcDir = resolve(wwwDir, "..", "src");
const nodeModules = resolve(wwwDir, "node_modules");

export const twoslashCompilerOptions = {
  strict: true,
  target: "ESNext",
  module: "ESNext",
  moduleResolution: "Bundler",
  esModuleInterop: true,
  skipLibCheck: true,
  types: ["node"],
  paths: {
    "zod-config": [`${srcDir}/index.ts`],
    "zod-config/nextjs": [`${srcDir}/nextjs.ts`],
    "zod-config/nextjs/config": [`${srcDir}/nextjs-config.ts`],
    "zod-config/vite": [`${srcDir}/vite.ts`],
    "zod-config/*": [`${srcDir}/lib/adapters/*/index.ts`],
    "@/*": [`${srcDir}/*`],
    "*": [`${nodeModules}/*`, `${nodeModules}/@types/*`],
  },
};

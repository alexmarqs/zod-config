import { loadEnvConfigFile } from "./lib/env/find-env-config";
import { loadEnvConfigWithPrefix } from "./lib/env/load-env-config";
import type { ZodConfigEnvOptions } from "./nextjs";

export type { ZodConfigEnvOptions } from "./nextjs";

/**
 * Wraps the Next.js config to validate the environment when `next dev`, `next build` or
 * `next start` reads `next.config.ts`, before any page runs.
 *
 * Without `envConfig` it loads the definition from `env.config.ts` in `src/` or the project
 * root, with `jiti` (install it as a dependency: `next start` reads the config too). Or pass the
 * definition.
 *
 * Values are read from `process.env`, which Next.js has already filled from the `.env` files.
 * The config is returned unchanged.
 *
 * Node.js only: import it from `zod-config/nextjs/config`, in `next.config.ts`. It is kept out of
 * `zod-config/nextjs`, which is also bundled for the browser.
 */
export const withZodConfigEnv = <TNextConfig>(
  nextConfig: TNextConfig,
  envConfig?: ZodConfigEnvOptions,
): TNextConfig => {
  const options =
    envConfig ??
    loadEnvConfigFile(process.cwd(), {
      name: "withZodConfigEnv",
      call: "withZodConfigEnv(nextConfig, envConfig)",
      install: "npm i jiti",
    }).options;

  loadEnvConfigWithPrefix("NEXT_PUBLIC_", { ...options, runtimeEnv: process.env, isServer: true });

  return nextConfig;
};

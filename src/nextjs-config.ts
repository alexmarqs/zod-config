import { loadEnvFile } from "./lib/env/load-env-file";

/**
 * Options for `withZodConfigEnv`.
 */
export type ZodConfigEnvOptions = {
  /**
   * Path of the env file, from the project root. Defaults to `env.ts` (or `.js`, `.mjs`, …) in
   * `src/`, then in the project root.
   */
  file?: string;
};

/**
 * Wraps the Next.js config to validate the environment when `next dev`, `next build` or
 * `next start` reads the config, before any page runs.
 *
 * It finds the env file (the one that calls `loadEnvConfig`) and runs it with `jiti`, so it works
 * from `next.config.js` / `.mjs` and with path aliases in the env file. Install `jiti` as a
 * regular dependency: `next start` reads the config too. From a `next.config.ts`, importing the
 * env file (`import "./src/env"`) does the same without jiti.
 *
 * The config is returned unchanged.
 *
 * Node.js only: import it from `zod-config/nextjs/config`. It is kept out of `zod-config/nextjs`,
 * which is also bundled for the browser.
 */
export const withZodConfigEnv = <TNextConfig>(
  nextConfig: TNextConfig,
  options: ZodConfigEnvOptions = {},
): TNextConfig => {
  loadEnvFile(
    process.cwd(),
    {
      name: "withZodConfigEnv",
      withoutJiti:
        'Install it (npm i jiti), or import the env file in next.config.ts instead: import "./src/env"',
    },
    { file: options.file },
  );

  return nextConfig;
};

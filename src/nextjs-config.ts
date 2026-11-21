import { loadEnvFile } from "./lib/env/load-env-file";

export type ZodConfigEnvOptions = {
  /** Path of the env file, from the project root. Defaults to `env.ts` in `src/`, then the root. */
  file?: string;
};

/**
 * Validates the environment when Next.js reads its config (`next dev`, `next build`, `next start`),
 * by running the env file with jiti. Returns the config unchanged.
 *
 * The file is looked up from `process.cwd()`; for `next build apps/web`, pass an absolute `file`.
 * Node.js only, so it is kept out of `zod-config/nextjs`, which is bundled for the browser.
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
      aliasSources: 'the "paths" of tsconfig.json',
    },
    { file: options.file },
  );

  return nextConfig;
};

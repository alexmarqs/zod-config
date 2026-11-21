import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";

// Node.js only: used by `zod-config/vite` and `zod-config/nextjs/config`, never by an entry that
// is bundled for the browser.

const ENV_FILES = ["env.ts", "env.mts", "env.cts", "env.js", "env.mjs", "env.cjs"];

type CreateJiti = (base: string, options: Record<string, unknown>) => (file: string) => unknown;

/**
 * Who is loading the env file, for the error messages.
 */
type Caller = {
  /** e.g. `zodConfigEnv` */
  name: string;
  /** What to do without jiti, e.g. `Install it (npm i -D jiti)` */
  withoutJiti: string;
};

type LoadEnvFileOptions = {
  /** Path of the env file, from the root. Defaults to `env.*` in `src/`, then the root. */
  file?: string;
  /** Extra aliases, on top of the `tsconfig.json` paths. */
  alias?: Record<string, string>;
  /** Values to expose as `process.env` (and so `import.meta.env`) while the file runs. */
  env?: Record<string, unknown>;
};

const supportsTsconfigPaths = (requireFromRoot: (id: string) => unknown) => {
  try {
    const { version } = requireFromRoot("jiti/package.json") as { version: string };
    const [major, minor] = version.split(".").map(Number);

    return major > 2 || (major === 2 && minor >= 7);
  } catch {
    return true;
  }
};

/**
 * Finds the app's env file (the one that calls `loadEnvConfig`) and runs it with the app's own
 * `jiti` (an optional peer dependency), so an invalid environment throws here. Returns the path
 * of the file.
 *
 * `jiti` transpiles TypeScript itself, reads `tsconfig.json` paths, and turns `import.meta.env`
 * into `process.env`, on any Node.js version.
 *
 * Alternatives considered, dropped to keep one loader and one env file: a separate
 * `env.config.ts` definition shared with `loadEnvConfig`, Vite's `runnerImport` (Vite 6.1+), and
 * a plain `require` from `next.config.ts` (TypeScript config only, no path aliases).
 */
export const loadEnvFile = (
  root: string,
  caller: Caller,
  options: LoadEnvFileOptions = {},
): string => {
  const file = options.file
    ? [resolve(root, options.file)].find((candidate) => existsSync(candidate))
    : ["src", ""]
        .flatMap((dir) => ENV_FILES.map((name) => join(root, dir, name)))
        .find((candidate) => existsSync(candidate));

  if (!file) {
    throw new Error(
      options.file
        ? `${caller.name}: env file not found: ${options.file}`
        : `${caller.name}: no env file (env.ts, env.js, …) in src/ or the project root. Create src/env.ts with loadEnvConfig, or set the "file" option`,
    );
  }

  const name = relative(root, file);

  // Resolved from the app, where it is installed.
  const requireFromRoot = createRequire(join(root, "package.json"));
  let createJiti: CreateJiti | undefined;
  try {
    ({ createJiti } = requireFromRoot("jiti") as { createJiti?: CreateJiti });
  } catch {
    // Not installed.
  }

  // jiti 1.x, e.g. hoisted from another package, has no `createJiti`.
  if (typeof createJiti !== "function") {
    throw new Error(`${caller.name}: loading ${name} needs jiti 2 or later. ${caller.withoutJiti}`);
  }

  const processEnv = process.env;
  try {
    if (options.env) {
      process.env = options.env as NodeJS.ProcessEnv;
    }

    createJiti(join(root, "package.json"), {
      tsconfigPaths: true,
      alias: options.alias,
      interopDefault: false,
      // Run the file again on every call, e.g. when a dev server restarts.
      moduleCache: false,
      fsCache: false,
    })(file);
  } catch (error) {
    // Errors thrown by the env file, such as an invalid environment, are passed on as they are.
    if (!(error instanceof Error) || !error.message.startsWith("Cannot find module")) {
      throw error;
    }

    // jiti appends a require stack to the message. Paths under the root are made relative.
    let message = error.message.split("\nRequire stack:")[0];
    for (const prefix of [`${root}/`, `${root}\\`, `${root.replaceAll("\\", "/")}/`]) {
      message = message.replaceAll(prefix, "");
    }
    // jiti reads `tsconfig.json` paths from 2.7; older versions only know the `alias` option.
    if (!supportsTsconfigPaths(requireFromRoot)) {
      message += ". Path aliases from tsconfig.json need jiti 2.7 or later";
    }

    const loadError = new Error(`${caller.name}: could not load ${name}: ${message}`);
    (loadError as { cause?: unknown }).cause = error;
    throw loadError;
  } finally {
    process.env = processEnv;
  }

  return file;
};

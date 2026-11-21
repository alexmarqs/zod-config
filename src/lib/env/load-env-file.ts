import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const ENV_FILES = ["env.ts", "env.mts", "env.cts", "env.js", "env.mjs", "env.cjs"];

type CreateJiti = (base: string, options: Record<string, unknown>) => (file: string) => unknown;

// Caller-specific parts of the error messages.
type Caller = {
  name: string;
  withoutJiti: string;
  aliasSources: string;
};

type LoadEnvFileOptions = {
  file?: string;
  alias?: Record<string, string>;
  // Replaces `process.env` (and so `import.meta.env`) while the file runs.
  env?: Record<string, unknown>;
};

const packageDir = (file: string): string | undefined => {
  let dir = dirname(file);
  while (!existsSync(join(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }

  return dir;
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
 * Finds the env file (`env.*` in `src/`, then the root) and runs it with the app's jiti, so an
 * invalid environment throws here. Returns the file's path.
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
        ? `${caller.name}: env file not found: ${options.file} (looked in ${root})`
        : `${caller.name}: no env file (env.ts, env.js, …) in src/ or the root of ${root}. Create src/env.ts with loadEnvConfig, or set the "file" option`,
    );
  }

  const name = relative(root, file);

  // An absolute `file` may live in another package, e.g. `next build apps/web` from a monorepo.
  const project = (options.file && isAbsolute(options.file) && packageDir(file)) || root;
  const requireFromRoot = createRequire(join(project, "package.json"));
  let createJiti: CreateJiti | undefined;
  try {
    ({ createJiti } = requireFromRoot("jiti") as { createJiti?: CreateJiti });
  } catch {}

  // Missing, or jiti 1.x (no `createJiti`).
  if (typeof createJiti !== "function") {
    throw new Error(`${caller.name}: loading ${name} needs jiti 2 or later. ${caller.withoutJiti}`);
  }

  const processEnv = process.env;
  try {
    if (options.env) {
      process.env = options.env as NodeJS.ProcessEnv;
    }

    createJiti(join(project, "package.json"), {
      tsconfigPaths: true,
      alias: options.alias,
      interopDefault: false,
      // Run the file again when a dev server restarts.
      moduleCache: false,
      fsCache: false,
    })(file);
  } catch (error) {
    // Errors from the env file itself, such as an invalid environment, pass through.
    if (!(error instanceof Error) || !error.message.startsWith("Cannot find module")) {
      throw error;
    }

    // Drop jiti's require stack and make paths relative.
    let message = error.message.split("\nRequire stack:")[0];
    for (const prefix of [`${root}/`, `${root}\\`, `${root.replaceAll("\\", "/")}/`]) {
      message = message.replaceAll(prefix, "");
    }
    // jiti reads `tsconfig.json` paths from 2.7, and only from the root tsconfig.json.
    message += supportsTsconfigPaths(requireFromRoot)
      ? `. If it is a path alias, declare it in ${caller.aliasSources}`
      : ". Path aliases from tsconfig.json need jiti 2.7 or later";

    const loadError = new Error(`${caller.name}: could not load ${name}: ${message}`);
    (loadError as { cause?: unknown }).cause = error;
    throw loadError;
  } finally {
    process.env = processEnv;
  }

  return file;
};

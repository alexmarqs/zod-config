import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createProjectJiti, jitiSupportsTsconfigPaths } from "../utils/jiti";

const ENV_FILES = ["env.ts", "env.mts", "env.cts", "env.js", "env.mjs", "env.cjs"];

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
  const jiti = createProjectJiti(project, {
    tsconfigPaths: true,
    alias: options.alias,
    interopDefault: false,
    // Run the file again when a dev server restarts.
    moduleCache: false,
    fsCache: false,
  });

  // Missing, or jiti 1.x.
  if (!jiti) {
    throw new Error(`${caller.name}: loading ${name} needs jiti 2 or later. ${caller.withoutJiti}`);
  }

  const processEnv = process.env;
  try {
    if (options.env) {
      process.env = options.env as NodeJS.ProcessEnv;
    }

    jiti(file);
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
    message += jitiSupportsTsconfigPaths(project)
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

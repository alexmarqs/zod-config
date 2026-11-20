import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import type { EnvSchemaInput } from "./load-env-config";

// Node.js only: used by `zod-config/vite` and `zod-config/nextjs/config`, never by an entry that
// is bundled for the browser.

const ENV_CONFIG_FILES = [
  "env.config.ts",
  "env.config.mts",
  "env.config.cts",
  "env.config.js",
  "env.config.mjs",
  "env.config.cjs",
];

type CreateJiti = (base: string, options: Record<string, unknown>) => (file: string) => unknown;

/**
 * Who is loading `env.config.*`, for the error messages.
 */
type Caller = {
  /** e.g. `zodConfigEnv` */
  name: string;
  /** The form that takes the definition, e.g. `zodConfigEnv(envConfig)` */
  call: string;
  /** How to install jiti, e.g. `npm i -D jiti` */
  install: string;
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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Finds `env.config.*` in `src/`, then the project root, and loads it with the app's own `jiti`
 * (an optional peer dependency). `jiti` transpiles TypeScript itself and reads `tsconfig.json`
 * paths, on any Node.js version; `alias` adds more aliases.
 *
 * The definition is the file's default export, a named `envConfig` export, or the module itself
 * for CommonJS (`module.exports = defineEnvConfig()`).
 *
 * Alternatives considered, dropped to keep one loader: Vite's `runnerImport` (Vite 6.1+), a plain
 * `require` from `next.config.ts` (Next.js only transpiles it there, and resolves path aliases
 * from the project root only), and Node's type stripping (Node.js 22.18+, no aliases or enums).
 */
export const loadEnvConfigFile = (
  root: string,
  caller: Caller,
  alias?: Record<string, string>,
): { options: EnvSchemaInput; file: string } => {
  const file = ["src", ""]
    .flatMap((dir) => ENV_CONFIG_FILES.map((name) => join(root, dir, name)))
    .find((candidate) => existsSync(candidate));

  if (!file) {
    throw new Error(
      `${caller.name}: no env.config file (.ts, .js, .mjs, …) in src/ or the project root. Create one there, or import the definition and pass it: ${caller.call}`,
    );
  }

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
    throw new Error(
      `${caller.name}: finding the env.config file needs jiti 2 or later. Install it (${caller.install}), or import the definition and pass it: ${caller.call}`,
    );
  }

  const name = relative(root, file);
  let module: unknown;
  try {
    module = createJiti(join(root, "package.json"), {
      tsconfigPaths: true,
      alias,
      interopDefault: false,
      // Load the file again on every call, e.g. when a dev server restarts.
      moduleCache: false,
      fsCache: false,
    })(file);
  } catch (error) {
    // jiti appends a require stack to the message. Paths under the root are made relative.
    let message = (error instanceof Error ? error.message : String(error)).split(
      "\nRequire stack:",
    )[0];
    for (const prefix of [`${root}/`, `${root}\\`, `${root.replaceAll("\\", "/")}/`]) {
      message = message.replaceAll(prefix, "");
    }

    // jiti reads `tsconfig.json` paths from 2.7; older versions only know the `alias` option.
    if (message.startsWith("Cannot find module") && !supportsTsconfigPaths(requireFromRoot)) {
      message += ". Path aliases from tsconfig.json need jiti 2.7 or later";
    }

    const loadError = new Error(`${caller.name}: could not load ${name}: ${message}`);
    (loadError as { cause?: unknown }).cause = error;
    throw loadError;
  }

  const exports = isObject(module) ? module : {};
  const options =
    exports.default ??
    exports.envConfig ??
    ("server" in exports || "client" in exports ? exports : undefined);

  if (!isObject(options)) {
    throw new Error(
      `${caller.name}: ${name} must export the result of defineEnvConfig, as its default export or as "envConfig"`,
    );
  }

  return { options: options as EnvSchemaInput, file };
};

import { createRequire } from "node:module";
import { join } from "node:path";

// Not in the utils barrel: only Node-only code (env loader, script adapter) should pull this in.

export type Jiti = {
  (id: string): unknown;
  import: (id: string) => Promise<unknown>;
};

type CreateJiti = (base: string, options: Record<string, unknown>) => Jiti;

const requireFrom = (dir: string) => createRequire(join(dir, "package.json"));

/**
 * Creates a jiti instance from the project's own jiti (resolved from `dir`). Returns undefined when
 * jiti is missing, or is jiti 1.x (no `createJiti`).
 */
export const createProjectJiti = (
  dir: string,
  options: Record<string, unknown> = {},
): Jiti | undefined => {
  let createJiti: CreateJiti | undefined;
  try {
    ({ createJiti } = requireFrom(dir)("jiti") as { createJiti?: CreateJiti });
  } catch {}

  return typeof createJiti === "function"
    ? createJiti(join(dir, "package.json"), options)
    : undefined;
};

// jiti reads `tsconfig.json` paths from 2.7, and only from the root tsconfig.json.
export const jitiSupportsTsconfigPaths = (dir: string): boolean => {
  try {
    const { version } = requireFrom(dir)("jiti/package.json") as { version: string };
    const [major, minor] = version.split(".").map(Number);

    return major > 2 || (major === 2 && minor >= 7);
  } catch {
    return true;
  }
};

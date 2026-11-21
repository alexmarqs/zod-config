import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { withZodConfigEnv } from "@/nextjs-config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;
const source = path.resolve(__dirname, "../../src");

describe("withZodConfigEnv (zod-config/nextjs/config)", () => {
  let root: string;

  // The app's env file. It imports `loadEnvConfig` from the sources, and `@/` (used inside the
  // sources) is mapped in the app's tsconfig.json.
  const writeEnvFile = (file = "src/env.ts", extra = "") => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(
      path.join(root, file),
      `import { z } from "zod";
import { loadEnvConfig } from "${source}/nextjs";
${extra}
enum Level { Info = "info" }
const level: string = Level.Info;

export const env = loadEnvConfig({
  server: { DATABASE_URL: z.url(), LEVEL: z.string().default(level) },
  client: { NEXT_PUBLIC_APP_URL: z.url() },
  runtimeEnv: { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
});
`,
    );
  };

  beforeEach(() => {
    // Inside the repository, so jiti and zod resolve from the generated files.
    root = mkdtempSync(path.join(__dirname, ".tmp-"));
    writeFileSync(
      path.join(root, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { paths: { "@/*": [`${source}/*`], "~/*": ["./src/*"] } },
      }),
    );
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env = {};
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it("should return the Next.js config unchanged when the environment is valid", () => {
    writeEnvFile();
    process.env = { DATABASE_URL: "https://db.dev", NEXT_PUBLIC_APP_URL: "https://app.dev" };
    const nextConfig = { reactStrictMode: true };
    const configFunction = async () => nextConfig;

    expect(withZodConfigEnv(nextConfig)).toBe(nextConfig);
    expect(withZodConfigEnv(configFunction)).toBe(configFunction);
  });

  it("should throw listing each invalid variable when they are missing", () => {
    writeEnvFile();

    expect(() => withZodConfigEnv({})).toThrowError(
      /^Invalid environment variables:\n {2}DATABASE_URL: .*\n {2}NEXT_PUBLIC_APP_URL: /,
    );
  });

  it("should find env.ts in the root, and a file given with the file option", () => {
    writeEnvFile("env.ts");
    expect(() => withZodConfigEnv({})).toThrowError(/DATABASE_URL/);

    rmSync(path.join(root, "env.ts"));
    writeEnvFile("config/app-env.ts");
    expect(() => withZodConfigEnv({}, { file: "config/app-env.ts" })).toThrowError(/DATABASE_URL/);
    expect(() => withZodConfigEnv({}, { file: "missing.ts" })).toThrowError(
      "withZodConfigEnv: env file not found: missing.ts",
    );
  });

  it("should resolve tsconfig paths in the env file", () => {
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "src/a.ts"), "export const a = 1;\n");
    writeEnvFile("src/env.ts", 'import { a } from "~/a";\nvoid a;');

    expect(() => withZodConfigEnv({})).toThrowError(/^Invalid environment variables/);
  });

  it("should say which file could not be loaded when an import is not found", () => {
    writeEnvFile("src/env.ts", 'import { a } from "#missing/a";\nvoid a;');

    let thrown: Error | undefined;
    try {
      withZodConfigEnv({});
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown?.message).toBe(
      "withZodConfigEnv: could not load src/env.ts: Cannot find module '#missing/a'",
    );
    expect(thrown?.cause).toBeInstanceOf(Error);
  });

  it("should pass on other errors thrown by the env file as they are", () => {
    writeFileSync(path.join(root, "env.cjs"), 'throw new Error("boom");\n');

    expect(() => withZodConfigEnv({})).toThrowError(/^boom$/);
  });

  it("should throw when there is no env file", () => {
    expect(() => withZodConfigEnv({})).toThrowError(
      'withZodConfigEnv: no env file (env.ts, env.js, …) in src/ or the project root. Create src/env.ts with loadEnvConfig, or set the "file" option',
    );
  });

  describe("without jiti 2", () => {
    let outside: string;

    // Outside the repository, where jiti cannot be resolved.
    beforeEach(() => {
      outside = mkdtempSync(path.join(tmpdir(), "zod-config-no-jiti-"));
      writeFileSync(path.join(outside, "env.ts"), "export {};\n");
      vi.spyOn(process, "cwd").mockReturnValue(outside);
    });

    afterEach(() => {
      rmSync(outside, { recursive: true, force: true });
    });

    const message =
      'withZodConfigEnv: loading env.ts needs jiti 2 or later. Install it (npm i jiti), or import the env file in next.config.ts instead: import "./src/env"';

    it("should point at installing jiti or importing the env file when jiti is missing", () => {
      expect(() => withZodConfigEnv({})).toThrowError(message);
    });

    it("should point at jiti 2 when only jiti 1.x is installed", () => {
      // A stand-in for jiti 1.x: a function export, without `createJiti`.
      mkdirSync(path.join(outside, "node_modules/jiti"), { recursive: true });
      writeFileSync(
        path.join(outside, "node_modules/jiti/package.json"),
        '{ "name": "jiti", "version": "1.21.7", "main": "index.js" }',
      );
      writeFileSync(
        path.join(outside, "node_modules/jiti/index.js"),
        "module.exports = () => {};\n",
      );

      expect(() => withZodConfigEnv({})).toThrowError(message);
    });
  });
});

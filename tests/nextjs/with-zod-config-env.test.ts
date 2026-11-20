import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { withZodConfigEnv } from "@/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

const originalEnv = process.env;

const envSchema = {
  server: { DATABASE_URL: z.url() },
  client: { NEXT_PUBLIC_APP_URL: z.url() },
} as const;

describe("withZodConfigEnv (zod-config/nextjs)", () => {
  beforeEach(() => {
    process.env = {};
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return the Next.js config unchanged when the environment is valid", () => {
    process.env = {
      DATABASE_URL: "https://db.dev",
      NEXT_PUBLIC_APP_URL: "https://app.dev",
    };
    const nextConfig = { reactStrictMode: true };

    expect(withZodConfigEnv(nextConfig, envSchema)).toBe(nextConfig);
  });

  it("should return a config function unchanged", () => {
    process.env = {
      DATABASE_URL: "https://db.dev",
      NEXT_PUBLIC_APP_URL: "https://app.dev",
    };
    const nextConfig = async () => ({ reactStrictMode: true });

    expect(withZodConfigEnv(nextConfig, envSchema)).toBe(nextConfig);
  });

  it("should throw listing each invalid variable when they are missing", () => {
    expect(() => withZodConfigEnv({}, envSchema)).toThrowError(
      /Invalid environment variables:\n {2}DATABASE_URL: .*\n {2}NEXT_PUBLIC_APP_URL: /,
    );
  });

  it("should not validate with skipValidation", () => {
    expect(() => withZodConfigEnv({}, { ...envSchema, skipValidation: true })).not.toThrow();
  });

  it("should call onError with the Zod error before throwing", () => {
    const onError = vi.fn();

    expect(() => withZodConfigEnv({}, { ...envSchema, onError })).toThrowError(
      /Invalid environment variables/,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].issues).toHaveLength(2);
  });

  it("should throw when a client key does not start with NEXT_PUBLIC_", () => {
    expect(() => withZodConfigEnv({}, { client: { APP_URL: z.url() } })).toThrowError(
      /client keys must start with "NEXT_PUBLIC_"/,
    );
  });
});

describe("withZodConfigEnv without a definition (zod-config/nextjs)", () => {
  let root: string;

  // Inside the repository, so `zod` resolves from the generated env.config files.
  const writeEnvConfig = (file: string, exportLine: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(
      path.join(root, file),
      `import { z } from "zod";\n${exportLine} { server: { DATABASE_URL: z.url() }, client: { NEXT_PUBLIC_APP_URL: z.url() } };\n`,
    );
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(__dirname, ".tmp-"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env = {};
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it("should load the default export of src/env.config.ts", () => {
    writeEnvConfig("src/env.config.ts", "export default");

    expect(() => withZodConfigEnv({})).toThrowError(
      /Invalid environment variables:\n {2}DATABASE_URL: .*\n {2}NEXT_PUBLIC_APP_URL: /,
    );

    process.env = { DATABASE_URL: "https://db.dev", NEXT_PUBLIC_APP_URL: "https://app.dev" };
    const nextConfig = { reactStrictMode: true };
    expect(withZodConfigEnv(nextConfig)).toBe(nextConfig);
  });

  it("should load a named envConfig export from env.config.ts in the root", () => {
    writeEnvConfig("env.config.ts", "export const envConfig =");

    expect(() => withZodConfigEnv({})).toThrowError(/DATABASE_URL/);
  });

  it("should point at passing the definition on Node.js without process.getBuiltinModule", () => {
    writeEnvConfig("src/env.config.ts", "export default");
    const proc = process as { getBuiltinModule?: unknown };
    const getBuiltinModule = proc.getBuiltinModule;
    proc.getBuiltinModule = undefined;

    try {
      expect(() => withZodConfigEnv({})).toThrowError(
        /needs Node\.js 20\.16 or later\. Import the definition and pass it instead, which works on any version: withZodConfigEnv\(nextConfig, envConfig\)/,
      );
    } finally {
      proc.getBuiltinModule = getBuiltinModule;
    }
  });

  it("should throw pointing at the explicit form when there is no env.config file", () => {
    expect(() => withZodConfigEnv({})).toThrowError(
      /no env\.config\.ts in src\/ or the project root\. Create it there, or import the definition and pass it: withZodConfigEnv\(nextConfig, envConfig\)/,
    );
  });
});

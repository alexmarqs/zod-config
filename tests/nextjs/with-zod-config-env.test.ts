import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { withZodConfigEnv } from "@/nextjs-config";
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

  it("should load a TypeScript env.config in src/ with tsconfig paths through jiti", () => {
    writeFileSync(
      path.join(root, "tsconfig.json"),
      '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
    );
    mkdirSync(path.join(root, "src"));
    writeFileSync(
      path.join(root, "src/schemas.ts"),
      'import { z } from "zod";\nexport const url = z.url();\n',
    );
    writeFileSync(
      path.join(root, "src/env.config.ts"),
      'import { url } from "@/schemas";\nenum Level { Info = "info" }\nconst level: string = Level.Info;\nexport default { server: { DATABASE_URL: url }, level };\n',
    );
    process.env = { DATABASE_URL: "nope" };

    expect(() => withZodConfigEnv({})).toThrowError(
      /Invalid environment variables:\n {2}DATABASE_URL: Invalid URL/,
    );
  });

  describe("without jiti", () => {
    let outside: string;

    // Outside the repository, where jiti cannot be resolved (and neither can zod).
    beforeEach(() => {
      outside = mkdtempSync(path.join(tmpdir(), "zod-config-no-jiti-"));
      vi.spyOn(process, "cwd").mockReturnValue(outside);
    });

    afterEach(() => {
      rmSync(outside, { recursive: true, force: true });
    });

    it("should point at installing jiti or passing the definition", () => {
      writeFileSync(path.join(outside, "env.config.ts"), "export default {};\n");

      expect(() => withZodConfigEnv({})).toThrowError(
        /^withZodConfigEnv: finding the env\.config file needs jiti\. Install it \(npm i jiti\), or import the definition and pass it: withZodConfigEnv\(nextConfig, envConfig\)$/,
      );
    });
  });

  it("should load a CommonJS env.config.cjs that assigns module.exports", () => {
    writeFileSync(
      path.join(root, "env.config.cjs"),
      'const { z } = require("zod");\nmodule.exports = { server: { DATABASE_URL: z.url() } };\n',
    );

    expect(() => withZodConfigEnv({})).toThrowError(
      /Invalid environment variables:\n {2}DATABASE_URL: /,
    );
  });

  it("should keep the original error as cause when env.config fails to load", () => {
    writeFileSync(path.join(root, "env.config.cjs"), 'throw new Error("boom");\n');

    let thrown: Error | undefined;
    try {
      withZodConfigEnv({});
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown?.message).toBe("withZodConfigEnv: could not load env.config.cjs: boom");
    expect((thrown?.cause as Error).message).toBe("boom");
  });

  it("should report a non-Error thrown by env.config", () => {
    writeFileSync(path.join(root, "env.config.cjs"), 'throw "boom";\n');

    expect(() => withZodConfigEnv({})).toThrowError(
      "withZodConfigEnv: could not load env.config.cjs: boom",
    );
  });

  it("should name the wrapper and the relative file when nothing usable is exported", () => {
    writeFileSync(path.join(root, "env.config.cjs"), "module.exports = { other: 1 };\n");

    expect(() => withZodConfigEnv({})).toThrowError(
      /^withZodConfigEnv: env\.config\.cjs must export the result of defineEnvConfig/,
    );
  });

  it("should throw pointing at the explicit form when there is no env.config file", () => {
    expect(() => withZodConfigEnv({})).toThrowError(
      /no env\.config file \(\.ts, \.js, \.mjs, …\) in src\/ or the project root\. Create one there, or import the definition and pass it: withZodConfigEnv\(nextConfig, envConfig\)/,
    );
  });
});

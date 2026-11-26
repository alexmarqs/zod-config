import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { type Plugin, resolveConfig, type UserConfig } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { zodConfigEnv } from "@/vite";

const originalEnv = process.env;
const source = path.resolve(__dirname, "../../src");

// Resolves a Vite config with the plugin, the way `vite dev` and `vite build` do: NODE_ENV
// defaults to "production" for a build and to "development" for the dev server.
const runVite = (
  plugin: Plugin,
  config: UserConfig,
  mode = "development",
  command: "build" | "serve" = "build",
  isPreview = false,
) =>
  resolveConfig(
    { configFile: false, logLevel: "silent", ...config, plugins: [plugin] },
    command,
    mode,
    command === "build" ? "production" : "development",
    isPreview,
  );

describe("zodConfigEnv (zod-config/vite)", () => {
  let root: string;

  // The app's env file. It imports `loadEnvConfig` from the sources, and `@/` (used inside the
  // sources) is mapped in the app's tsconfig.json.
  const writeEnvFile = (file = "src/env.ts", extra = "") => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(
      path.join(root, file),
      `import { z } from "zod";
import { loadEnvConfig } from "${source}/index";
${extra}
export const env = loadEnvConfig({
  clientPrefix: "VITE_",
  server: { DATABASE_URL: z.url() },
  client: { VITE_API_URL: z.url() },
  runtimeEnv: import.meta.env,
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
    process.env = {};
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it("should throw listing each invalid variable when they are missing", async () => {
    writeEnvFile();

    await expect(runVite(zodConfigEnv(), { root })).rejects.toThrowError(
      /^Invalid environment variables:\n {2}DATABASE_URL: .*\n {2}VITE_API_URL: /,
    );
  });

  it("should pass with the values from a .env file in the root", async () => {
    writeEnvFile();
    writeFileSync(
      path.join(root, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    await expect(runVite(zodConfigEnv(), { root })).resolves.toBeDefined();
  });

  it("should pass with the values from process.env and no .env file", async () => {
    writeEnvFile();
    process.env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };

    await expect(runVite(zodConfigEnv(), { root })).resolves.toBeDefined();
  });

  it("should read the .env file of the current mode", async () => {
    writeEnvFile();
    writeFileSync(path.join(root, ".env"), "DATABASE_URL=https://db.dev\n");
    writeFileSync(path.join(root, ".env.staging"), "VITE_API_URL=https://api.staging\n");

    await expect(runVite(zodConfigEnv(), { root }, "staging")).resolves.toBeDefined();
    await expect(runVite(zodConfigEnv(), { root }, "production")).rejects.toThrowError(
      /VITE_API_URL/,
    );
  });

  it("should read .env files from envDir, resolved from the root", async () => {
    writeEnvFile();
    const envDir = mkdtempSync(path.join(root, "env-"));
    writeFileSync(
      path.join(envDir, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    await expect(
      runVite(zodConfigEnv(), { root, envDir: path.basename(envDir) }),
    ).resolves.toBeDefined();
  });

  it("should not read .env files when envDir is false", async () => {
    writeEnvFile();
    writeFileSync(
      path.join(root, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    await expect(
      runVite(zodConfigEnv(), { root, envDir: false } as UserConfig),
    ).rejects.toThrowError(/Invalid environment variables/);
  });

  // The env file throws its view of Vite's own variables, so each test can assert on it.
  const viteVariables =
    "throw new Error(JSON.stringify([import.meta.env.MODE, import.meta.env.DEV, import.meta.env.PROD, import.meta.env.BASE_URL, import.meta.env.SSR]));";

  it("should expose Vite's MODE, DEV, PROD, BASE_URL and SSR to the env file", async () => {
    writeEnvFile("src/env.ts", viteVariables);

    process.env = {};
    await expect(runVite(zodConfigEnv(), { root }, "staging", "serve")).rejects.toThrowError(
      '["staging",true,false,"/",true]',
    );

    process.env = {};
    await expect(
      runVite(zodConfigEnv(), { root, base: "/app/" }, "production", "build"),
    ).rejects.toThrowError('["production",false,true,"/app/",true]');
  });

  it("should restore process.env after running the env file", async () => {
    writeEnvFile();
    const env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };
    process.env = env;

    await runVite(zodConfigEnv(), { root });
    expect(process.env).toBe(env);

    writeEnvFile("src/env.ts", 'throw new Error("boom");');
    await expect(runVite(zodConfigEnv(), { root })).rejects.toThrowError("boom");
    expect(process.env).toBe(env);
  });

  it("should follow NODE_ENV for DEV and PROD, like the app does", async () => {
    writeEnvFile("src/env.ts", viteVariables);

    // `NODE_ENV=development vite build` is not a production build.
    process.env = { NODE_ENV: "development" };
    await expect(runVite(zodConfigEnv(), { root }, "production", "build")).rejects.toThrowError(
      '["production",true,false,"/",true]',
    );

    process.env = { NODE_ENV: "production" };
    await expect(runVite(zodConfigEnv(), { root }, "development", "serve")).rejects.toThrowError(
      '["development",false,true,"/",true]',
    );
  });

  it("should use the root and envDir that another plugin sets", async () => {
    writeEnvFile();
    const envDir = mkdtempSync(path.join(root, "env-"));
    writeFileSync(
      path.join(envDir, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );
    const other: Plugin = { name: "sets-root", config: () => ({ root, envDir }) };

    await expect(
      resolveConfig(
        { configFile: false, logLevel: "silent", plugins: [zodConfigEnv(), other] },
        "build",
      ),
    ).resolves.toBeDefined();
  });

  it("should find env.ts in the root, and a file given with the file option", async () => {
    writeEnvFile("env.ts");
    await expect(runVite(zodConfigEnv(), { root })).rejects.toThrowError(/DATABASE_URL/);

    rmSync(path.join(root, "env.ts"));
    writeEnvFile("config/app-env.ts");
    await expect(
      runVite(zodConfigEnv({ file: "config/app-env.ts" }), { root }),
    ).rejects.toThrowError(/DATABASE_URL/);
    await expect(runVite(zodConfigEnv({ file: "missing.ts" }), { root })).rejects.toThrowError(
      "zodConfigEnv: env file not found: missing.ts",
    );
  });

  it("should resolve aliases from the Vite config and tsconfig paths in the env file", async () => {
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "src/a.ts"), "export const a = 1;\n");
    writeEnvFile(
      "src/env.ts",
      'import { a } from "~/a";\nimport { a as b } from "#app/a";\nvoid [a, b];',
    );
    const alias = { "#app": path.join(root, "src") };

    await expect(runVite(zodConfigEnv(), { root, resolve: { alias } })).rejects.toThrowError(
      /^Invalid environment variables/,
    );
    await expect(
      runVite(zodConfigEnv(), {
        root,
        resolve: { alias: [{ find: "#app", replacement: path.join(root, "src") }] },
      }),
    ).rejects.toThrowError(/^Invalid environment variables/);
    await expect(runVite(zodConfigEnv(), { root })).rejects.toThrowError(
      "zodConfigEnv: could not load src/env.ts: Cannot find module '#app/a'. If it is a path alias, declare it in resolve.alias of the Vite config, or the \"paths\" of tsconfig.json",
    );
  });

  it("should resolve an alias that is relative to the Vite root, and use the first match", async () => {
    mkdirSync(path.join(root, "src"));
    mkdirSync(path.join(root, "other"));
    writeFileSync(path.join(root, "src/a.ts"), "export const a = 1;\n");
    writeEnvFile("src/env.ts", 'import { a } from "#app/a";\nvoid a;');

    await expect(
      runVite(zodConfigEnv(), {
        root,
        resolve: {
          alias: [
            { find: "#app", replacement: "/src" },
            { find: "#app", replacement: path.join(root, "other") },
          ],
        },
      }),
    ).rejects.toThrowError(/^Invalid environment variables/);
  });

  it("should do nothing for vite preview", async () => {
    await expect(
      runVite(zodConfigEnv(), { root }, "production", "serve", true),
    ).resolves.toBeDefined();
  });

  it("should restart the dev server when the env file changes", async () => {
    writeEnvFile();
    process.env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };
    const plugin = zodConfigEnv();
    await runVite(plugin, { root });

    let onChange: (file: string) => void = () => {};
    const server = {
      config: { root, logger: { info: vi.fn() } },
      restart: vi.fn(async () => {}),
      watcher: {
        add: vi.fn(),
        on: (_event: string, listener: (file: string) => void) => {
          onChange = listener;
        },
      },
    };
    (plugin.configureServer as (server: unknown) => void)(server);

    expect(server.watcher.add).toHaveBeenCalledWith(path.join(root, "src/env.ts"));
    onChange(path.join(root, "src/other.ts"));
    expect(server.restart).not.toHaveBeenCalled();
    onChange(path.join(root, "src/env.ts"));
    expect(server.restart).toHaveBeenCalledTimes(1);
  });

  it("should do nothing when Vitest reads the config", async () => {
    process.env = { VITEST: "true" };

    await expect(runVite(zodConfigEnv(), { root }, "test")).resolves.toBeDefined();
  });

  it("should throw when there is no env file", async () => {
    await expect(runVite(zodConfigEnv(), { root })).rejects.toThrowError(
      `zodConfigEnv: no env file (env.ts, env.js, …) in src/ or the root of ${root}. Create src/env.ts with loadEnvConfig, or set the "file" option`,
    );
  });

  describe("without jiti 2", () => {
    let outside: string;

    // Outside the repository, where jiti cannot be resolved.
    beforeEach(() => {
      outside = mkdtempSync(path.join(tmpdir(), "zod-config-no-jiti-"));
      writeFileSync(path.join(outside, "env.ts"), "export {};\n");
    });

    afterEach(() => {
      rmSync(outside, { recursive: true, force: true });
    });

    it("should point at installing jiti when it is missing", async () => {
      await expect(runVite(zodConfigEnv(), { root: outside })).rejects.toThrowError(
        "zodConfigEnv: loading env.ts needs jiti 2 or later. Install it (npm i -D jiti)",
      );
    });

    it("should point at jiti 2 when only jiti 1.x is installed", async () => {
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

      await expect(runVite(zodConfigEnv(), { root: outside })).rejects.toThrowError(
        "zodConfigEnv: loading env.ts needs jiti 2 or later. Install it (npm i -D jiti)",
      );
    });
  });
});

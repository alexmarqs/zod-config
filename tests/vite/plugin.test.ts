import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { zodConfigEnv } from "@/vite";
import type { ConfigEnv, Plugin, UserConfig } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;
const source = path.resolve(__dirname, "../../src");

// Calls the plugin's `config` hook the way Vite does when it reads the config.
const runConfigHook = (
  plugin: Plugin,
  config: UserConfig,
  mode = "development",
  command: ConfigEnv["command"] = "build",
) => {
  const hook = plugin.config as (config: UserConfig, env: ConfigEnv) => unknown;

  return hook(config, { mode, command } as ConfigEnv);
};

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

  it("should throw listing each invalid variable when they are missing", () => {
    writeEnvFile();

    expect(() => runConfigHook(zodConfigEnv(), { root })).toThrowError(
      /^Invalid environment variables:\n {2}DATABASE_URL: .*\n {2}VITE_API_URL: /,
    );
  });

  it("should pass with the values from a .env file in the root", () => {
    writeEnvFile();
    writeFileSync(
      path.join(root, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    expect(runConfigHook(zodConfigEnv(), { root })).toBeUndefined();
  });

  it("should pass with the values from process.env and no .env file", () => {
    writeEnvFile();
    process.env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };

    expect(runConfigHook(zodConfigEnv(), { root })).toBeUndefined();
  });

  it("should read the .env file of the current mode", () => {
    writeEnvFile();
    writeFileSync(path.join(root, ".env"), "DATABASE_URL=https://db.dev\n");
    writeFileSync(path.join(root, ".env.staging"), "VITE_API_URL=https://api.staging\n");

    expect(runConfigHook(zodConfigEnv(), { root }, "staging")).toBeUndefined();
    expect(() => runConfigHook(zodConfigEnv(), { root }, "production")).toThrowError(
      /VITE_API_URL/,
    );
  });

  it("should read .env files from envDir, resolved from the root", () => {
    writeEnvFile();
    const envDir = mkdtempSync(path.join(root, "env-"));
    writeFileSync(
      path.join(envDir, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    expect(runConfigHook(zodConfigEnv(), { root, envDir: path.basename(envDir) })).toBeUndefined();
  });

  it("should not read .env files when envDir is false", () => {
    writeEnvFile();
    writeFileSync(
      path.join(root, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    expect(() => runConfigHook(zodConfigEnv(), { root, envDir: false } as UserConfig)).toThrowError(
      /Invalid environment variables/,
    );
  });

  it("should expose MODE, DEV and PROD and restore process.env afterwards", () => {
    writeEnvFile(
      "src/env.ts",
      'if (import.meta.env.MODE !== "staging" || import.meta.env.DEV !== true || import.meta.env.PROD !== false) throw new Error("wrong mode");',
    );
    const env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };
    process.env = env;

    expect(runConfigHook(zodConfigEnv(), { root }, "staging", "serve")).toBeUndefined();
    expect(process.env).toBe(env);
    expect(() => runConfigHook(zodConfigEnv(), { root }, "production")).toThrowError("wrong mode");
    expect(process.env).toBe(env);
  });

  it("should find env.ts in the root, and a file given with the file option", () => {
    writeEnvFile("env.ts");
    expect(() => runConfigHook(zodConfigEnv(), { root })).toThrowError(/DATABASE_URL/);

    rmSync(path.join(root, "env.ts"));
    writeEnvFile("config/app-env.ts");
    expect(() => runConfigHook(zodConfigEnv({ file: "config/app-env.ts" }), { root })).toThrowError(
      /DATABASE_URL/,
    );
    expect(() => runConfigHook(zodConfigEnv({ file: "missing.ts" }), { root })).toThrowError(
      "zodConfigEnv: env file not found: missing.ts",
    );
  });

  it("should resolve aliases from the Vite config and tsconfig paths in the env file", () => {
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "src/a.ts"), "export const a = 1;\n");
    writeEnvFile(
      "src/env.ts",
      'import { a } from "~/a";\nimport { a as b } from "#app/a";\nvoid [a, b];',
    );
    const alias = { "#app": path.join(root, "src") };

    expect(() => runConfigHook(zodConfigEnv(), { root, resolve: { alias } })).toThrowError(
      /^Invalid environment variables/,
    );
    expect(() =>
      runConfigHook(zodConfigEnv(), {
        root,
        resolve: { alias: [{ find: "#app", replacement: path.join(root, "src") }] },
      }),
    ).toThrowError(/^Invalid environment variables/);
    expect(() => runConfigHook(zodConfigEnv(), { root })).toThrowError(
      /^zodConfigEnv: could not load src\/env\.ts: Cannot find module '#app\/a'$/,
    );
  });

  it("should restart the dev server when the env file changes", () => {
    writeEnvFile();
    process.env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };
    const plugin = zodConfigEnv();
    runConfigHook(plugin, { root });

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

  it("should not change the Vite config, and do nothing when Vitest reads the config", () => {
    process.env = { VITEST: "true" };

    expect(runConfigHook(zodConfigEnv(), { root }, "test")).toBeUndefined();
  });

  it("should throw when there is no env file", () => {
    expect(() => runConfigHook(zodConfigEnv(), { root })).toThrowError(
      'zodConfigEnv: no env file (env.ts, env.js, …) in src/ or the project root. Create src/env.ts with loadEnvConfig, or set the "file" option',
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

    it("should point at installing jiti when it is missing", () => {
      expect(() => runConfigHook(zodConfigEnv(), { root: outside })).toThrowError(
        "zodConfigEnv: loading env.ts needs jiti 2 or later. Install it (npm i -D jiti)",
      );
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

      expect(() => runConfigHook(zodConfigEnv(), { root: outside })).toThrowError(
        "zodConfigEnv: loading env.ts needs jiti 2 or later. Install it (npm i -D jiti)",
      );
    });
  });
});

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { zodConfigEnv } from "@/vite";
import type { ConfigEnv, Plugin, UserConfig } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

const originalEnv = process.env;

const envSchema = {
  clientPrefix: "VITE_",
  server: { DATABASE_URL: z.url() },
  client: { VITE_API_URL: z.url() },
} as const;

// Calls the plugin's `config` hook the way Vite does when it reads the config.
const runConfigHook = (plugin: Plugin, config: UserConfig, mode = "development") => {
  const hook = plugin.config as (config: UserConfig, env: ConfigEnv) => unknown;

  return hook(config, { mode, command: "build" } as ConfigEnv);
};

describe("zodConfigEnv (zod-config/vite)", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "zod-config-vite-"));
    process.env = {};
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it("should throw listing each invalid variable when they are missing", async () => {
    await expect(runConfigHook(zodConfigEnv(envSchema), { root })).rejects.toThrowError(
      /Invalid environment variables:\n {2}DATABASE_URL: .*\n {2}VITE_API_URL: /,
    );
  });

  it("should pass with the values from a .env file in the root", async () => {
    writeFileSync(
      path.join(root, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    await expect(runConfigHook(zodConfigEnv(envSchema), { root })).resolves.toBeUndefined();
  });

  it("should pass with the values from process.env and no .env file", async () => {
    process.env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };

    await expect(runConfigHook(zodConfigEnv(envSchema), { root })).resolves.toBeUndefined();
  });

  it("should read the .env file of the current mode", async () => {
    writeFileSync(path.join(root, ".env"), "DATABASE_URL=https://db.dev\n");
    writeFileSync(path.join(root, ".env.staging"), "VITE_API_URL=https://api.staging\n");

    await expect(
      runConfigHook(zodConfigEnv(envSchema), { root }, "staging"),
    ).resolves.toBeUndefined();
    await expect(
      runConfigHook(zodConfigEnv(envSchema), { root }, "production"),
    ).rejects.toThrowError(/VITE_API_URL/);
  });

  it("should read .env files from envDir, resolved from the root", async () => {
    const envDir = mkdtempSync(path.join(root, "env-"));
    writeFileSync(
      path.join(envDir, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    await expect(
      runConfigHook(zodConfigEnv(envSchema), { root, envDir: path.basename(envDir) }),
    ).resolves.toBeUndefined();
  });

  it("should not read .env files when envDir is false", async () => {
    writeFileSync(
      path.join(root, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    await expect(
      runConfigHook(zodConfigEnv(envSchema), { root, envDir: false } as UserConfig),
    ).rejects.toThrowError(/Invalid environment variables/);
  });

  it("should not change the Vite config", async () => {
    process.env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };

    await expect(runConfigHook(zodConfigEnv(envSchema), { root })).resolves.toBeUndefined();
  });

  it("should not validate with skipValidation", async () => {
    await expect(
      runConfigHook(zodConfigEnv({ ...envSchema, skipValidation: true }), { root }),
    ).resolves.toBeUndefined();
  });

  it("should call onError with the Zod error before throwing", async () => {
    const onError = vi.fn();

    await expect(
      runConfigHook(zodConfigEnv({ ...envSchema, onError }), { root }),
    ).rejects.toThrowError(/Invalid environment variables/);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].issues).toHaveLength(2);
  });

  it("should not validate when Vitest reads the config", async () => {
    process.env = { VITEST: "true" };

    await expect(runConfigHook(zodConfigEnv(envSchema), { root }, "test")).resolves.toBeUndefined();
  });

  it("should throw when a client key does not start with clientPrefix", async () => {
    await expect(
      runConfigHook(zodConfigEnv({ clientPrefix: "VITE_", client: { API_URL: z.url() } }), {
        root,
      }),
    ).rejects.toThrowError(/client keys must start with "VITE_"/);
  });
});

describe("zodConfigEnv without a definition (zod-config/vite)", () => {
  let root: string;

  // Inside the repository, so `zod` resolves from the generated env.config files.
  const writeEnvConfig = (file: string, exportLine: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(
      path.join(root, file),
      `import { z } from "zod";\n${exportLine} { clientPrefix: "VITE_", server: { DATABASE_URL: z.url() }, client: { VITE_API_URL: z.url() } };\n`,
    );
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(__dirname, ".tmp-"));
    process.env = {};
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it("should load the default export of src/env.config.ts", async () => {
    writeEnvConfig("src/env.config.ts", "export default");

    await expect(runConfigHook(zodConfigEnv(), { root })).rejects.toThrowError(
      /Invalid environment variables:\n {2}DATABASE_URL: .*\n {2}VITE_API_URL: /,
    );

    writeFileSync(
      path.join(root, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );
    await expect(runConfigHook(zodConfigEnv(), { root })).resolves.toBeUndefined();
  });

  it("should load a named envConfig export from env.config.ts in the root", async () => {
    writeEnvConfig("env.config.ts", "export const envConfig =");

    await expect(runConfigHook(zodConfigEnv(), { root })).rejects.toThrowError(/DATABASE_URL/);
  });

  it("should throw pointing at the explicit form when there is no env.config file", async () => {
    await expect(runConfigHook(zodConfigEnv(), { root })).rejects.toThrowError(
      /no env\.config file \(\.ts, \.js, \.mjs, …\) in src\/ or the project root\. Create one there, or import the definition and pass it: zodConfigEnv\(envConfig\)/,
    );
  });

  it("should restart the dev server when env.config.ts changes", async () => {
    writeFileSync(
      path.join(root, "schemas.ts"),
      'import { z } from "zod";\nexport const url = z.url();\n',
    );
    writeFileSync(
      path.join(root, "env.config.ts"),
      'import { url } from "./schemas";\nexport default { clientPrefix: "VITE_", server: { DATABASE_URL: url } };\n',
    );
    process.env = { DATABASE_URL: "https://db.dev" };
    const plugin = zodConfigEnv();
    await runConfigHook(plugin, { root });

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

    expect(server.watcher.add).toHaveBeenCalledWith(path.join(root, "env.config.ts"));
    onChange(path.join(root, "schemas.ts"));
    expect(server.restart).not.toHaveBeenCalled();
    onChange(path.join(root, "env.config.ts"));
    expect(server.restart).toHaveBeenCalledTimes(1);
  });

  it("should not watch anything when the definition is passed", async () => {
    process.env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };
    const plugin = zodConfigEnv(envSchema);
    await runConfigHook(plugin, { root });
    const server = { watcher: { add: vi.fn(), on: vi.fn() } };
    (plugin.configureServer as (server: unknown) => void)(server);

    expect(server.watcher.add).not.toHaveBeenCalled();
  });

  it("should resolve aliases from the Vite config in env.config.ts", async () => {
    writeFileSync(
      path.join(root, "schemas.ts"),
      'import { z } from "zod";\nexport const url = z.url();\n',
    );
    writeFileSync(
      path.join(root, "env.config.ts"),
      'import { url } from "@/schemas";\nexport default { clientPrefix: "VITE_", server: { DATABASE_URL: url } };\n',
    );
    process.env = { DATABASE_URL: "nope" };

    await expect(
      runConfigHook(zodConfigEnv(), { root, resolve: { alias: { "@": root } } }),
    ).rejects.toThrowError(/Invalid environment variables:\n {2}DATABASE_URL: Invalid URL/);
    await expect(runConfigHook(zodConfigEnv(), { root })).rejects.toThrowError(
      /^zodConfigEnv: could not load env\.config\.ts: Cannot find module '@\/schemas'$/,
    );
  });

  it("should resolve array aliases and tsconfig paths, from src/", async () => {
    writeFileSync(
      path.join(root, "tsconfig.json"),
      '{ "compilerOptions": { "paths": { "~/*": ["./src/*"] } } }',
    );
    mkdirSync(path.join(root, "src"));
    writeFileSync(
      path.join(root, "src/schemas.ts"),
      'import { z } from "zod";\nexport const url = z.url();\n',
    );
    writeFileSync(
      path.join(root, "src/env.config.ts"),
      'import { url } from "~/schemas";\nimport { url as same } from "@/schemas";\nenum Level { Info = "info" }\nexport default { clientPrefix: "VITE_", server: { DATABASE_URL: url, OTHER_URL: same }, level: Level.Info };\n',
    );
    process.env = { DATABASE_URL: "nope", OTHER_URL: "https://ok.dev" };

    await expect(
      runConfigHook(zodConfigEnv(), {
        root,
        resolve: { alias: [{ find: "@", replacement: path.join(root, "src") }] },
      }),
    ).rejects.toThrowError(/Invalid environment variables:\n {2}DATABASE_URL: Invalid URL$/);
  });

  it("should point at installing jiti or passing the definition when jiti is missing", async () => {
    // Outside the repository, where jiti cannot be resolved.
    const outside = mkdtempSync(path.join(tmpdir(), "zod-config-no-jiti-"));
    writeFileSync(path.join(outside, "env.config.ts"), "export default {};\n");

    try {
      await expect(runConfigHook(zodConfigEnv(), { root: outside })).rejects.toThrowError(
        /^zodConfigEnv: finding the env\.config file needs jiti 2 or later\. Install it \(npm i -D jiti\), or import the definition and pass it: zodConfigEnv\(envConfig\)$/,
      );
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("should throw when env.config.ts exports no definition", async () => {
    writeFileSync(path.join(root, "env.config.ts"), "export const other = 1;\n");

    await expect(runConfigHook(zodConfigEnv(), { root })).rejects.toThrowError(
      /^zodConfigEnv: env\.config\.ts must export the result of defineEnvConfig/,
    );
  });
});

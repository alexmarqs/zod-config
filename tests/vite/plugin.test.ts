import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

  it("should throw listing each invalid variable when they are missing", () => {
    expect(() => runConfigHook(zodConfigEnv(envSchema), { root })).toThrowError(
      /Invalid environment variables:\n {2}DATABASE_URL: .*\n {2}VITE_API_URL: /,
    );
  });

  it("should pass with the values from a .env file in the root", () => {
    writeFileSync(
      path.join(root, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    expect(() => runConfigHook(zodConfigEnv(envSchema), { root })).not.toThrow();
  });

  it("should pass with the values from process.env and no .env file", () => {
    process.env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };

    expect(() => runConfigHook(zodConfigEnv(envSchema), { root })).not.toThrow();
  });

  it("should read the .env file of the current mode", () => {
    writeFileSync(path.join(root, ".env"), "DATABASE_URL=https://db.dev\n");
    writeFileSync(path.join(root, ".env.staging"), "VITE_API_URL=https://api.staging\n");

    expect(() => runConfigHook(zodConfigEnv(envSchema), { root }, "staging")).not.toThrow();
    expect(() => runConfigHook(zodConfigEnv(envSchema), { root }, "production")).toThrowError(
      /VITE_API_URL/,
    );
  });

  it("should read .env files from envDir, resolved from the root", () => {
    const envDir = mkdtempSync(path.join(root, "env-"));
    writeFileSync(
      path.join(envDir, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    expect(() =>
      runConfigHook(zodConfigEnv(envSchema), { root, envDir: path.basename(envDir) }),
    ).not.toThrow();
  });

  it("should not read .env files when envDir is false", () => {
    writeFileSync(
      path.join(root, ".env"),
      "DATABASE_URL=https://db.dev\nVITE_API_URL=https://api.dev\n",
    );

    expect(() =>
      runConfigHook(zodConfigEnv(envSchema), { root, envDir: false } as UserConfig),
    ).toThrowError(/Invalid environment variables/);
  });

  it("should not change the Vite config", () => {
    process.env = { DATABASE_URL: "https://db.dev", VITE_API_URL: "https://api.dev" };

    expect(runConfigHook(zodConfigEnv(envSchema), { root })).toBeUndefined();
  });

  it("should not validate with skipValidation", () => {
    expect(() =>
      runConfigHook(zodConfigEnv({ ...envSchema, skipValidation: true }), { root }),
    ).not.toThrow();
  });

  it("should call onError with the Zod error before throwing", () => {
    const onError = vi.fn();

    expect(() => runConfigHook(zodConfigEnv({ ...envSchema, onError }), { root })).toThrowError(
      /Invalid environment variables/,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].issues).toHaveLength(2);
  });

  it("should not validate when Vitest reads the config", () => {
    process.env = { VITEST: "true" };

    expect(() => runConfigHook(zodConfigEnv(envSchema), { root }, "test")).not.toThrow();
  });

  it("should throw when a client key does not start with clientPrefix", () => {
    expect(() =>
      runConfigHook(zodConfigEnv({ clientPrefix: "VITE_", client: { API_URL: z.url() } }), {
        root,
      }),
    ).toThrowError(/client keys must start with "VITE_"/);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z as z3 } from "zod/v3";
import { z } from "zod/v4";
import { z as zm } from "zod/v4-mini";
import { loadEnvConfig as loadGenericEnvConfig } from "@/index";
import { loadEnvConfig } from "@/nextjs";

const originalEnv = process.env;

const nodeEnv = z.enum(["development", "test", "production"]);

describe("loadEnvConfig shared variables", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it("should read and validate shared values on the server, from process.env or runtimeEnv", () => {
    process.env = { DATABASE_URL: "https://db.dev", NODE_ENV: "production" };

    const env = loadEnvConfig({
      server: { DATABASE_URL: z.url() },
      client: { NEXT_PUBLIC_APP_URL: z.url() },
      shared: { NODE_ENV: nodeEnv },
      runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev", NODE_ENV: undefined },
      isServer: true,
    });

    expect(env).toEqual({
      DATABASE_URL: "https://db.dev",
      NEXT_PUBLIC_APP_URL: "https://app.dev",
      NODE_ENV: "production",
    });
  });

  it("should read shared values from runtimeEnv in the browser, and never server values", () => {
    vi.stubGlobal("window", {});
    process.env = { DATABASE_URL: "https://db.dev", NODE_ENV: "development" };

    const env = loadEnvConfig({
      server: { DATABASE_URL: z.url() },
      client: { NEXT_PUBLIC_APP_URL: z.url() },
      shared: { NODE_ENV: nodeEnv },
      runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev", NODE_ENV: "production" },
    });

    expect(env.NODE_ENV).toBe("production");
    expect(JSON.stringify(env)).toBe(
      '{"NEXT_PUBLIC_APP_URL":"https://app.dev","NODE_ENV":"production"}',
    );
    expect(() => env.DATABASE_URL).toThrow(
      'Cannot access server environment variable "DATABASE_URL" on the client',
    );
  });

  it("should validate shared values in the browser", () => {
    vi.stubGlobal("window", {});

    expect(() =>
      loadEnvConfig({
        shared: { NODE_ENV: nodeEnv },
        runtimeEnv: { NODE_ENV: "staging" },
      }),
    ).toThrowError(/^Invalid environment variables:\n {2}NODE_ENV: /);
  });

  it("should accept shared keys with any name, in the generic entry too", () => {
    process.env = {};

    const env = loadGenericEnvConfig({
      clientPrefix: "VITE_",
      client: { VITE_API_URL: z.url() },
      shared: { NODE_ENV: nodeEnv, APP_REGION: z.string() },
      runtimeEnv: { VITE_API_URL: "https://api.dev", NODE_ENV: "test", APP_REGION: "eu" },
      isServer: true,
    });

    expect(env).toEqual({ VITE_API_URL: "https://api.dev", NODE_ENV: "test", APP_REGION: "eu" });
  });

  it("should work with only shared keys", () => {
    vi.stubGlobal("window", {});

    expect(
      loadEnvConfig({ shared: { NODE_ENV: nodeEnv }, runtimeEnv: { NODE_ENV: "test" } }),
    ).toEqual({ NODE_ENV: "test" });
  });

  it("should reject a key declared in more than one group", () => {
    const message =
      'Environment variable "NODE_ENV" is declared more than once: use only one of "server", "client" or "shared"';

    expect(() =>
      loadEnvConfig({
        server: { NODE_ENV: nodeEnv },
        shared: { NODE_ENV: nodeEnv },
        runtimeEnv: { NODE_ENV: "test" },
      }),
    ).toThrowError(message);
  });

  it("should require runtimeEnv when shared keys are defined", () => {
    expect(() => loadGenericEnvConfig({ shared: { NODE_ENV: nodeEnv } } as never)).toThrowError(
      'loadEnvConfig requires "runtimeEnv" when "client" or "shared" keys are defined',
    );
  });

  it.each([
    ["zod 3", z3.enum(["development", "test", "production"])],
    ["zod 4 mini", zm.enum(["development", "test", "production"])],
  ])("should validate shared values with %s", (_label, schema) => {
    vi.stubGlobal("window", {});

    expect(
      loadEnvConfig({ shared: { NODE_ENV: schema }, runtimeEnv: { NODE_ENV: "production" } }),
    ).toEqual({ NODE_ENV: "production" });
    expect(() =>
      loadEnvConfig({ shared: { NODE_ENV: schema }, runtimeEnv: { NODE_ENV: "staging" } }),
    ).toThrowError(/NODE_ENV/);
  });
});

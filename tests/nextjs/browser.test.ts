import { loadEnvConfig } from "@/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

const originalEnv = process.env;

const options = {
  server: { DATABASE_URL: z.string().url(), API_SECRET: z.string().min(1) },
  client: { NEXT_PUBLIC_APP_URL: z.string().url() },
  runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev" },
};

describe("loadEnvConfig (nextjs, browser side)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it("should expose public values and throw on server keys", () => {
    vi.stubGlobal("window", {});
    process.env = {};

    const env = loadEnvConfig(options);

    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.dev");
    expect(() => env.DATABASE_URL).toThrow(
      'Cannot access server environment variable "DATABASE_URL" on the client',
    );
  });

  it("should never read server values in the browser", () => {
    vi.stubGlobal("window", {});
    process.env = { DATABASE_URL: "https://db.dev", API_SECRET: "SENTINEL" };

    expect(JSON.stringify(loadEnvConfig(options))).toBe(
      '{"NEXT_PUBLIC_APP_URL":"https://app.dev"}',
    );
  });

  it("should still validate client values in the browser", () => {
    vi.stubGlobal("window", {});

    let thrown: any;
    let zodError: any;
    try {
      loadEnvConfig({
        onError: (error) => {
          zodError = error;
        },
        ...options,
        runtimeEnv: { NEXT_PUBLIC_APP_URL: "nope" },
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(zodError.issues.map((issue: any) => issue.path)).toEqual([["NEXT_PUBLIC_APP_URL"]]);
  });

  it("should ignore extra runtimeEnv keys in the browser", () => {
    vi.stubGlobal("window", {});

    const env = loadEnvConfig({
      ...options,
      runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev", API_SECRET: "LEAK", OTHER: "x" } as any,
    });

    expect(Object.keys(env)).toEqual(["NEXT_PUBLIC_APP_URL"]);
  });

  it("should ignore undeclared runtimeEnv keys on the server", () => {
    process.env = { DATABASE_URL: "https://db.dev", API_SECRET: "real" };

    const env = loadEnvConfig({
      ...options,
      runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev", OTHER: "x" } as any,
    });

    expect(env.API_SECRET).toBe("real");
    expect("OTHER" in env).toBe(false);
  });

  it("should work when there is no process global", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("process", undefined);

    expect(loadEnvConfig(options).NEXT_PUBLIC_APP_URL).toBe("https://app.dev");
  });

  it("should not throw on serializer and framework probes", () => {
    vi.stubGlobal("window", {});

    const env = loadEnvConfig(options) as any;

    expect(JSON.stringify(env)).toBe('{"NEXT_PUBLIC_APP_URL":"https://app.dev"}');
    expect({ ...env }).toEqual({ NEXT_PUBLIC_APP_URL: "https://app.dev" });
    expect(Object.keys(env)).toEqual(["NEXT_PUBLIC_APP_URL"]);
    expect(env[Symbol.toPrimitive]).toBeUndefined();
    expect(env.then).toBeUndefined();
    expect(env.$$typeof).toBeUndefined();
  });

  it("should be transparent on the server", () => {
    process.env = { DATABASE_URL: "https://db.dev", API_SECRET: "s3cret" };

    const env = loadEnvConfig(options);

    expect(env.DATABASE_URL).toBe("https://db.dev");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.dev");
  });

  it("should load a server-only config in the browser and throw on access", () => {
    vi.stubGlobal("window", {});

    const env = loadEnvConfig({ server: { API_SECRET: z.string() } });

    expect(() => env.API_SECRET).toThrow(
      'Cannot access server environment variable "API_SECRET" on the client',
    );
  });

  it("should behave as the browser when isServer is false", () => {
    process.env = { DATABASE_URL: "https://db.dev", API_SECRET: "s3cret" };

    const env = loadEnvConfig({ ...options, isServer: false });

    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.dev");
    expect(() => env.API_SECRET).toThrow("on the client");
  });

  it("should keep the server key guard when skipValidation is set in the browser", () => {
    vi.stubGlobal("window", {});

    const env = loadEnvConfig({
      ...options,
      runtimeEnv: { NEXT_PUBLIC_APP_URL: "not-validated" },
      skipValidation: true,
    });

    expect(env.NEXT_PUBLIC_APP_URL).toBe("not-validated");
    expect(() => env.DATABASE_URL).toThrow("on the client");
  });
});

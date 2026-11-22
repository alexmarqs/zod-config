import { loadEnvConfig } from "@/index";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod/v4";

const originalEnv = process.env;

describe("loadEnvConfig (generic, root entry)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it("should read only declared client keys from a Vite-shaped runtimeEnv", () => {
    const env = loadEnvConfig({
      clientPrefix: "VITE_",
      client: { VITE_API_URL: z.string().url() },
      runtimeEnv: {
        VITE_API_URL: "https://api.dev",
        VITE_OTHER: "x",
        MODE: "production",
        DEV: false,
        PROD: true,
        SSR: false,
        BASE_URL: "/",
      },
      isServer: false,
    });

    expect(env).toEqual({ VITE_API_URL: "https://api.dev" });
    expectTypeOf(env).toEqualTypeOf<{ readonly VITE_API_URL: string }>();
  });

  it("should read server values from process.env when runtimeEnv does not have them", () => {
    process.env = { DATABASE_URL: "https://db.dev" };

    const env = loadEnvConfig({
      clientPrefix: "PUBLIC_",
      server: { DATABASE_URL: z.string().url() },
      client: { PUBLIC_API_URL: z.string().url() },
      runtimeEnv: { PUBLIC_API_URL: "https://api.dev" },
    });

    expect(env).toEqual({ DATABASE_URL: "https://db.dev", PUBLIC_API_URL: "https://api.dev" });
    expectTypeOf(env).toEqualTypeOf<{
      readonly DATABASE_URL: string;
      readonly PUBLIC_API_URL: string;
    }>();
  });

  it("should read server values from runtimeEnv first, then process.env", () => {
    process.env = { DATABASE_URL: "https://process.dev", API_SECRET: "from-process-env" };

    const env = loadEnvConfig({
      clientPrefix: "PUBLIC_",
      server: { DATABASE_URL: z.string().url(), API_SECRET: z.string() },
      client: { PUBLIC_API_URL: z.string().url() },
      runtimeEnv: {
        PUBLIC_API_URL: "https://api.dev",
        DATABASE_URL: "https://meta.dev",
        API_SECRET: "",
        UNDECLARED: "x",
      },
    });

    // DATABASE_URL is in runtimeEnv, so it wins. API_SECRET is empty there, so it counts as
    // missing and comes from process.env.
    expect(env).toEqual({
      DATABASE_URL: "https://meta.dev",
      API_SECRET: "from-process-env",
      PUBLIC_API_URL: "https://api.dev",
    });
  });

  it("should never read server values from runtimeEnv in the browser", () => {
    const env = loadEnvConfig({
      clientPrefix: "PUBLIC_",
      server: { API_SECRET: z.string() },
      client: { PUBLIC_API_URL: z.string().url() },
      runtimeEnv: { PUBLIC_API_URL: "https://api.dev", API_SECRET: "SENTINEL" },
      isServer: false,
    });

    expect(JSON.stringify(env)).toBe('{"PUBLIC_API_URL":"https://api.dev"}');
  });

  it("should name the given prefix in key errors", () => {
    expect(() =>
      loadEnvConfig({
        clientPrefix: "PUBLIC_",
        client: { API_URL: z.string() },
        runtimeEnv: {},
      } as any),
    ).toThrow(
      'Invalid client environment variable name "API_URL": client keys must start with "PUBLIC_"',
    );

    expect(() =>
      loadEnvConfig({ clientPrefix: "PUBLIC_", server: { PUBLIC_TOKEN: z.string() } } as any),
    ).toThrow(
      'Invalid server environment variable name "PUBLIC_TOKEN": server keys must not start with "PUBLIC_"',
    );
  });

  it("should require a non-empty clientPrefix when client keys are defined", () => {
    const message =
      'loadEnvConfig requires a non-empty "clientPrefix" when "client" keys are defined';

    expect(() => loadEnvConfig({ client: { A: z.string() }, runtimeEnv: {} } as any)).toThrow(
      message,
    );
    expect(() =>
      loadEnvConfig({ clientPrefix: "", client: { A: z.string() }, runtimeEnv: {} } as any),
    ).toThrow(message);
  });

  it("should support a server-only config without clientPrefix or runtimeEnv", () => {
    process.env = { API_SECRET: "s3cret" };

    expect(loadEnvConfig({ server: { API_SECRET: z.string() } })).toEqual({ API_SECRET: "s3cret" });
  });

  it("should throw when a server key is read in the browser", () => {
    const env = loadEnvConfig({
      clientPrefix: "PUBLIC_",
      server: { API_SECRET: z.string() },
      client: { PUBLIC_API_URL: z.string() },
      runtimeEnv: { PUBLIC_API_URL: "https://api.dev" },
      isServer: false,
    });

    expect(() => env.API_SECRET).toThrow(
      'Cannot access server environment variable "API_SECRET" on the client',
    );
  });

  it("should share skipValidation, empty-value and logging behaviour with the Next.js preset", () => {
    const raw = loadEnvConfig({
      clientPrefix: "PUBLIC_",
      client: { PUBLIC_PORT: z.coerce.number() },
      runtimeEnv: { PUBLIC_PORT: "3000" },
      skipValidation: true,
    });
    expect(raw.PUBLIC_PORT).toBe("3000");

    const empty = loadEnvConfig({
      clientPrefix: "PUBLIC_",
      client: { PUBLIC_A: z.string().default("x") },
      runtimeEnv: { PUBLIC_A: "" },
    });
    expect(empty.PUBLIC_A).toBe("x");

    expect(() =>
      loadEnvConfig({
        clientPrefix: "PUBLIC_",
        client: { PUBLIC_URL: z.string().url() },
        runtimeEnv: { PUBLIC_URL: "nope" },
      }),
    ).toThrow(/^Invalid environment variables:\n {2}PUBLIC_URL: /);
    expect(console.error).not.toHaveBeenCalled();
  });
});

// Never called: checked by `tsc` (pnpm type-check).
const genericTypeErrors = () => {
  loadEnvConfig({
    clientPrefix: "PUBLIC_",
    // @ts-expect-error client keys must start with the given prefix
    client: { API_URL: z.string() },
    runtimeEnv: {},
  });

  loadEnvConfig({
    clientPrefix: "PUBLIC_",
    // @ts-expect-error server keys must not start with the given prefix
    server: { PUBLIC_TOKEN: z.string() },
  });

  // @ts-expect-error clientPrefix is required when client keys are defined
  loadEnvConfig({ client: { PUBLIC_A: z.string() }, runtimeEnv: {} });

  // @ts-expect-error runtimeEnv is required when client keys are defined
  loadEnvConfig({ clientPrefix: "PUBLIC_", client: { PUBLIC_A: z.string() } });

  // a prefix only known at runtime must not turn every key into a type error
  const dynamicPrefix = "PUBLIC_" as string;
  loadEnvConfig({
    clientPrefix: dynamicPrefix,
    server: { API_SECRET: z.string() },
    client: { PUBLIC_A: z.string() },
    runtimeEnv: {},
  });
};

describe("type checking loadEnvConfig (generic)", () => {
  it("should be covered by tsc", () => {
    expectTypeOf(genericTypeErrors).toBeFunction();
  });
});

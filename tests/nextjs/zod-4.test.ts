import { types } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { loadEnvConfig } from "@/nextjs";

const originalEnv = process.env;

const shapes = {
  server: {
    DATABASE_URL: z.string().url(),
    API_SECRET: z.string().min(1),
    PORT: z.coerce.number().default(3000),
  },
  client: { NEXT_PUBLIC_APP_URL: z.string().url() },
};

describe("loadEnvConfig (nextjs, zod 4, server side)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should fall back to runtimeEnv for server values missing from process.env", () => {
    // e.g. a runtime without process.env, where the values come from another object
    process.env = {};

    const env = loadEnvConfig({
      ...shapes,
      runtimeEnv: {
        DATABASE_URL: "https://db.dev",
        API_SECRET: "from-runtime-env",
        NEXT_PUBLIC_APP_URL: "https://app.dev",
      },
    });

    expect(env.DATABASE_URL).toBe("https://db.dev");
    expect(env.API_SECRET).toBe("from-runtime-env");
  });

  it("should prefer runtimeEnv over process.env for server values", () => {
    process.env = { DATABASE_URL: "https://db.dev", API_SECRET: "from-process-env" };

    const env = loadEnvConfig({
      ...shapes,
      runtimeEnv: { API_SECRET: "from-runtime-env", NEXT_PUBLIC_APP_URL: "https://app.dev" },
    });

    expect(env.API_SECRET).toBe("from-runtime-env");
    expect(env.DATABASE_URL).toBe("https://db.dev");
  });

  it("should treat an empty server value in runtimeEnv as missing", () => {
    process.env = { DATABASE_URL: "https://db.dev" };

    expect(() =>
      loadEnvConfig({
        ...shapes,
        runtimeEnv: { API_SECRET: "", NEXT_PUBLIC_APP_URL: "https://app.dev" },
      }),
    ).toThrow(/API_SECRET/);
  });

  it("should return a plain object on the server (no Proxy on every read)", () => {
    process.env = { DATABASE_URL: "https://db.dev", API_SECRET: "s3cret" };

    const env = loadEnvConfig({
      ...shapes,
      runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev" },
    });

    expect(types.isProxy(env)).toBe(false);
  });

  it("should return validated server and client values", () => {
    process.env = {
      DATABASE_URL: "https://db.dev",
      API_SECRET: "s3cret",
      NEXT_PUBLIC_APP_URL: "https://ignored.dev",
      UNRELATED: "x",
    };

    const env = loadEnvConfig({
      ...shapes,
      runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev" },
    });

    expect(env).toEqual({
      DATABASE_URL: "https://db.dev",
      API_SECRET: "s3cret",
      PORT: 3000,
      NEXT_PUBLIC_APP_URL: "https://app.dev",
    });
  });

  it("should pass the Zod error with the missing variable in the path to onError", () => {
    process.env = { API_SECRET: "s3cret" };

    let thrown: any;
    let zodError: any;
    try {
      loadEnvConfig({
        onError: (error) => {
          zodError = error;
        },
        ...shapes,
        runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev" },
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(zodError.issues.map((issue: any) => issue.path)).toEqual([["DATABASE_URL"]]);
  });

  it("should not leak an invalid value in the error", () => {
    process.env = { DATABASE_URL: "not-a-url-SENTINEL", API_SECRET: "s3cret" };

    let thrown: any;
    let zodError: any;
    try {
      loadEnvConfig({
        onError: (error) => {
          zodError = error;
        },
        ...shapes,
        runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev" },
      });
    } catch (error) {
      thrown = error;
    }

    expect(zodError.issues[0].path).toEqual(["DATABASE_URL"]);
    expect(JSON.stringify(zodError)).not.toContain("SENTINEL");
    expect(String(thrown.message)).not.toContain("SENTINEL");
  });

  it("should support a server-only config without runtimeEnv", () => {
    process.env = { API_SECRET: "s3cret" };

    expect(loadEnvConfig({ server: { API_SECRET: z.string() } })).toEqual({ API_SECRET: "s3cret" });
  });

  it("should support a client-only config", () => {
    process.env = {};

    const env = loadEnvConfig({
      client: shapes.client,
      runtimeEnv: { NEXT_PUBLIC_APP_URL: "https://app.dev" },
    });

    expect(env).toEqual({ NEXT_PUBLIC_APP_URL: "https://app.dev" });
  });

  it("should apply optional schemas and transforms", () => {
    process.env = { LIST: "a,b" };

    const env = loadEnvConfig({
      server: {
        FLAG: z.string().optional(),
        LIST: z.string().transform((value) => value.split(",")),
      },
    });

    expect(env.FLAG).toBeUndefined();
    expect(env.LIST).toEqual(["a", "b"]);
  });

  it("should treat empty server values as missing", () => {
    process.env = { A: "", B: "" };

    const env = loadEnvConfig({
      server: { A: z.string().optional(), B: z.string().default("x") },
    });

    expect(env.A).toBeUndefined();
    expect(env.B).toBe("x");
  });

  it("should fail a required variable that is empty", () => {
    process.env = { A: "" };

    let thrown: any;
    let zodError: any;
    try {
      loadEnvConfig({
        onError: (error) => {
          zodError = error;
        },
        server: { A: z.string() },
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(zodError.issues[0].path).toEqual(["A"]);
  });

  it("should treat empty runtimeEnv values as missing", () => {
    process.env = {};

    const env = loadEnvConfig({
      client: { NEXT_PUBLIC_A: z.string().optional() },
      runtimeEnv: { NEXT_PUBLIC_A: "" },
    });

    expect(env.NEXT_PUBLIC_A).toBeUndefined();
  });

  it("should not include enum, literal or union input values in the error", () => {
    process.env = { MODE: "prod-SENTINEL", KIND: "lit-SENTINEL", EITHER: "union-SENTINEL" };

    let thrown: any;
    let zodError: any;
    try {
      loadEnvConfig({
        onError: (error) => {
          zodError = error;
        },
        server: {
          MODE: z.enum(["a", "b"]),
          KIND: z.literal("x"),
          EITHER: z.union([z.enum(["a"]), z.literal("b")]),
        },
      });
    } catch (error) {
      thrown = error;
    }

    expect(zodError.issues.map((issue: any) => issue.path)).toEqual([
      ["MODE"],
      ["KIND"],
      ["EITHER"],
    ]);
    expect(JSON.stringify(zodError)).not.toContain("SENTINEL");
    expect(String(thrown.message)).not.toContain("SENTINEL");
    expect(JSON.stringify(zodError.issues)).not.toContain("SENTINEL");
  });

  it("should call onError once with the Zod error, then throw", () => {
    process.env = {};
    const onError = vi.fn();

    let thrown: any;
    try {
      loadEnvConfig({ server: { DATABASE_URL: z.string().url() }, onError });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].issues[0].path).toEqual(["DATABASE_URL"]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("should throw the error from onError when it throws", () => {
    process.env = {};
    const custom = new Error("custom");

    expect(() =>
      loadEnvConfig({
        server: { DATABASE_URL: z.string() },
        onError: () => {
          throw custom;
        },
      }),
    ).toThrow(custom);
  });

  it("should throw a message listing each invalid variable and why, without values", () => {
    process.env = { DATABASE_URL: "nope-SENTINEL", PORT: "abc" };

    let thrown: any;
    try {
      loadEnvConfig({
        server: { DATABASE_URL: z.string().url(), PORT: z.coerce.number(), API_SECRET: z.string() },
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown.message).toBe(
      [
        "Invalid environment variables:",
        "  DATABASE_URL: Invalid URL",
        "  PORT: Invalid input: expected number, received NaN",
        "  API_SECRET: Invalid input: expected string, received undefined",
      ].join("\n"),
    );
    expect(thrown.message).not.toContain("SENTINEL");
    expect(thrown.cause).toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("should not silently accept async refinements", () => {
    process.env = { A: "x" };
    const onError = vi.fn();

    expect(() =>
      loadEnvConfig({ server: { A: z.string().refine(async () => true) }, onError }),
    ).toThrow();
    expect(onError).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("should reject a client key without the NEXT_PUBLIC_ prefix", () => {
    expect(() =>
      loadEnvConfig({ client: { API_URL: z.string() }, runtimeEnv: { API_URL: "x" } } as any),
    ).toThrow(
      'Invalid client environment variable name "API_URL": client keys must start with "NEXT_PUBLIC_"',
    );
  });

  it("should reject a server key with the NEXT_PUBLIC_ prefix", () => {
    expect(() => loadEnvConfig({ server: { NEXT_PUBLIC_TOKEN: z.string() } } as any)).toThrow(
      'Invalid server environment variable name "NEXT_PUBLIC_TOKEN": server keys must not start with "NEXT_PUBLIC_"',
    );
  });

  it("should require at least one key", () => {
    const message = 'loadEnvConfig requires at least one key in "server", "client" or "shared"';

    expect(() => loadEnvConfig({} as any)).toThrow(message);
    expect(() => loadEnvConfig({ server: {}, client: {} } as any)).toThrow(message);
  });

  it("should require runtimeEnv when client keys are defined", () => {
    expect(() => loadEnvConfig({ client: { NEXT_PUBLIC_A: z.string() } } as any)).toThrow(
      'loadEnvConfig requires "runtimeEnv" when "client" or "shared" keys are defined',
    );
  });

  it("should return raw values when skipValidation is set", () => {
    process.env = { PORT: "3000" };

    const env = loadEnvConfig({
      server: { PORT: z.coerce.number(), DATABASE_URL: z.string().url() },
      skipValidation: true,
    });

    expect(env.PORT).toBe("3000");
    expect(env.DATABASE_URL).toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("should still check key names when skipValidation is set", () => {
    expect(() =>
      loadEnvConfig({ server: { NEXT_PUBLIC_TOKEN: z.string() }, skipValidation: true } as any),
    ).toThrow("server keys must not start with");
  });

  it("should treat the call as server side when isServer is true and window exists", () => {
    vi.stubGlobal("window", {});
    process.env = { API_SECRET: "s3cret" };

    try {
      const env = loadEnvConfig({ server: { API_SECRET: z.string() }, isServer: true });

      expect(env.API_SECRET).toBe("s3cret");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

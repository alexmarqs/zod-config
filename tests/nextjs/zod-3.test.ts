import { loadEnvConfig } from "@/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v3";

const originalEnv = process.env;

const shapes = {
  server: {
    DATABASE_URL: z.string().url(),
    API_SECRET: z.string().min(1),
    PORT: z.coerce.number().default(3000),
  },
  client: { NEXT_PUBLIC_APP_URL: z.string().url() },
};

describe("loadEnvConfig (nextjs, zod 3, server side)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return validated server and client values", () => {
    process.env = { DATABASE_URL: "https://db.dev", API_SECRET: "s3cret", UNRELATED: "x" };

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

  it("should keep a variable that is set but transformed to undefined", () => {
    process.env = {};

    const env = loadEnvConfig({
      server: {
        FEATURE: z
          .string()
          .optional()
          .transform((value) => (value === "off" ? undefined : value)),
      },
      runtimeEnv: { FEATURE: "off" },
    });

    expect("FEATURE" in env).toBe(true);
    const defaults: Record<string, string | undefined> = { FEATURE: "on" };
    expect({ ...defaults, ...env }.FEATURE).toBeUndefined();
  });

  it("should pass a ZodError with the missing variable in the path to onError", () => {
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
    expect(zodError).toBeInstanceOf(z.ZodError);
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

  it("should keep the allowed enum values in the message without the received value", () => {
    process.env = { MODE: "prod-SENTINEL" };

    let thrown: any;
    try {
      loadEnvConfig({ server: { MODE: z.enum(["a", "b"]) } });
    } catch (error) {
      thrown = error;
    }

    expect(thrown.message).toBe(
      "Invalid environment variables:\n  MODE: Invalid enum value. Expected 'a' | 'b'",
    );
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

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].issues[0].path).toEqual(["DATABASE_URL"]);
    expect(thrown.message).toBe("Invalid environment variables:\n  DATABASE_URL: Required");
  });

  it("should not silently accept async refinements", () => {
    process.env = { A: "x" };

    expect(() => loadEnvConfig({ server: { A: z.string().refine(async () => true) } })).toThrow();
  });
});

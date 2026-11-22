import { loadEnvConfig } from "@/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4-mini";

const originalEnv = process.env;

const shapes = {
  server: {
    DATABASE_URL: z.string().check(z.url()),
    API_SECRET: z.string().check(z.minLength(1)),
    PORT: z._default(z.coerce.number(), 3000),
  },
  client: { NEXT_PUBLIC_APP_URL: z.string().check(z.url()) },
};

describe("loadEnvConfig (nextjs, zod 4 mini, server side)", () => {
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

    expect(thrown).toBeInstanceOf(Error);
    expect(zodError.issues[0].path).toEqual(["DATABASE_URL"]);
    expect(JSON.stringify(zodError)).not.toContain("SENTINEL");
  });

  it("should call onError once with the Zod error, then throw", () => {
    process.env = {};
    const onError = vi.fn();

    let thrown: any;
    try {
      loadEnvConfig({ server: { DATABASE_URL: z.string().check(z.url()) }, onError });
    } catch (error) {
      thrown = error;
    }

    expect(onError).toHaveBeenCalledTimes(1);
    // Zod 4 Mini has no locale loaded by default, so messages are generic.
    expect(thrown.message).toBe("Invalid environment variables:\n  DATABASE_URL: Invalid input");
  });
});

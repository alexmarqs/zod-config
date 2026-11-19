import { loadEnvConfig } from "@/nextjs";
import { describe, expectTypeOf, it } from "vitest";
import { z as z3 } from "zod/v3";
import { z } from "zod/v4";
import { z as zm } from "zod/v4-mini";

// These functions are never called: the assertions are checked by `tsc` (pnpm type-check).

const zod4Inference = () => {
  const env = loadEnvConfig({
    server: {
      DATABASE_URL: z.string().url(),
      PORT: z.coerce.number().default(3000),
      LIST: z.string().transform((value) => value.split(",")),
      FLAG: z.string().optional(),
      NODE_ENV: z.enum(["development", "production", "test"]),
    },
    client: { NEXT_PUBLIC_APP_URL: z.string().url() },
    runtimeEnv: { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
  });

  expectTypeOf(env).toEqualTypeOf<{
    readonly DATABASE_URL: string;
    readonly PORT: number;
    readonly LIST: string[];
    readonly FLAG: string | undefined;
    readonly NODE_ENV: "development" | "production" | "test";
    readonly NEXT_PUBLIC_APP_URL: string;
  }>();
};

const zod3Inference = () => {
  const env = loadEnvConfig({
    server: {
      DATABASE_URL: z3.string().url(),
      PORT: z3.coerce.number().default(3000),
      LIST: z3.string().transform((value) => value.split(",")),
      FLAG: z3.string().optional(),
      NODE_ENV: z3.enum(["development", "production", "test"]),
    },
    client: { NEXT_PUBLIC_APP_URL: z3.string().url() },
    runtimeEnv: { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
  });

  expectTypeOf(env).toEqualTypeOf<{
    readonly DATABASE_URL: string;
    readonly PORT: number;
    readonly LIST: string[];
    readonly FLAG: string | undefined;
    readonly NODE_ENV: "development" | "production" | "test";
    readonly NEXT_PUBLIC_APP_URL: string;
  }>();
};

const zodMiniInference = () => {
  const env = loadEnvConfig({
    server: {
      DATABASE_URL: zm.string().check(zm.url()),
      PORT: zm._default(zm.coerce.number(), 3000),
      FLAG: zm.optional(zm.string()),
      NODE_ENV: zm.enum(["development", "production", "test"]),
    },
    client: { NEXT_PUBLIC_APP_URL: zm.string() },
    runtimeEnv: { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
  });

  expectTypeOf(env).toEqualTypeOf<{
    readonly DATABASE_URL: string;
    readonly PORT: number;
    readonly FLAG: string | undefined;
    readonly NODE_ENV: "development" | "production" | "test";
    readonly NEXT_PUBLIC_APP_URL: string;
  }>();
};

const clientKeyWithoutPrefix = () => {
  loadEnvConfig({
    // @ts-expect-error client keys must start with NEXT_PUBLIC_
    client: { API_SECRET: z.string() },
    runtimeEnv: { API_SECRET: "x" },
  });
};

const serverKeyWithPrefix = () => {
  loadEnvConfig({
    // @ts-expect-error server keys must not start with NEXT_PUBLIC_
    server: { NEXT_PUBLIC_TOKEN: z.string() },
  });
};

const missingRuntimeEnvEntry = () => {
  loadEnvConfig({
    client: { NEXT_PUBLIC_A: z.string(), NEXT_PUBLIC_B: z.string() },
    // @ts-expect-error NEXT_PUBLIC_B is missing
    runtimeEnv: { NEXT_PUBLIC_A: "a" },
  });
};

const serverKeysInRuntimeEnv = () => {
  const env = loadEnvConfig({
    server: { DATABASE_URL: z.string() },
    client: { NEXT_PUBLIC_A: z.string() },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_A: process.env.NEXT_PUBLIC_A,
    },
  });

  expectTypeOf(env.DATABASE_URL).toEqualTypeOf<string>();

  loadEnvConfig({
    server: { DATABASE_URL: z.string() },
    client: { NEXT_PUBLIC_A: z.string() },
    runtimeEnv: {
      NEXT_PUBLIC_A: "a",
      // @ts-expect-error not a declared server or client key
      OTHER: "x",
    },
  });

  const serverOnlyEnv = loadEnvConfig({
    server: { DATABASE_URL: z.string() },
    runtimeEnv: { DATABASE_URL: "https://db.dev" },
  });

  // runtimeEnv must not widen the result (e.g. with an index signature)
  expectTypeOf(serverOnlyEnv).toEqualTypeOf<{ readonly DATABASE_URL: string }>();

  loadEnvConfig({
    server: { DATABASE_URL: z.string() },
    runtimeEnv: {
      // @ts-expect-error not a declared server key
      OTHER: "x",
    },
  });
};

const missingRuntimeEnv = () => {
  // @ts-expect-error runtimeEnv is required when client keys are defined
  loadEnvConfig({ client: { NEXT_PUBLIC_A: z.string() } });
};

const serverOnly = () => {
  const env = loadEnvConfig({ server: { API_SECRET: z.string() } });

  expectTypeOf(env).toEqualTypeOf<{ readonly API_SECRET: string }>();

  // @ts-expect-error not declared
  env.NOPE;
};

const options = () => {
  loadEnvConfig({
    server: { API_SECRET: z.string() },
    skipValidation: true,
    isServer: true,
    onError: (error) => {
      expectTypeOf(error.issues).toBeArray();
    },
  });

  loadEnvConfig({
    server: { API_SECRET: z.string() },
    // @ts-expect-error clientPrefix is not an option of the Next.js preset
    clientPrefix: "PUBLIC_",
  });
};

describe("type checking loadEnvConfig (nextjs)", () => {
  it("should be covered by tsc", () => {
    expectTypeOf(zod4Inference).toBeFunction();
    expectTypeOf(zod3Inference).toBeFunction();
    expectTypeOf(zodMiniInference).toBeFunction();
    expectTypeOf(clientKeyWithoutPrefix).toBeFunction();
    expectTypeOf(serverKeyWithPrefix).toBeFunction();
    expectTypeOf(missingRuntimeEnvEntry).toBeFunction();
    expectTypeOf(missingRuntimeEnv).toBeFunction();
    expectTypeOf(serverKeysInRuntimeEnv).toBeFunction();
    expectTypeOf(serverOnly).toBeFunction();
    expectTypeOf(options).toBeFunction();
  });
});

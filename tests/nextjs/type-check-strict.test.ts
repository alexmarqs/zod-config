import { loadEnvConfig } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod/v4";

// These functions are never called: the assertions are checked by `tsc` (pnpm type-check).

const looseByDefault = () => {
  // without `strict`, any object is accepted, e.g. all of import.meta.env
  const viteEnv: Record<string, string | boolean | undefined> = { VITE_A: "a", MODE: "x" };
  const env = loadEnvConfig({
    clientPrefix: "VITE_",
    client: { VITE_A: z.string(), VITE_B: z.string().optional() },
    runtimeEnv: viteEnv,
  });

  expectTypeOf(env).toEqualTypeOf<{
    readonly VITE_A: string;
    readonly VITE_B: string | undefined;
  }>();

  // a missing or misspelled key is not a type error without `strict`
  loadEnvConfig({
    clientPrefix: "EXPO_PUBLIC_",
    client: { EXPO_PUBLIC_A: z.string() },
    runtimeEnv: { EXPO_PUBLIC_AA: "a" },
  });
};

const strictRequiresEveryClientKey = () => {
  const env = loadEnvConfig({
    clientPrefix: "EXPO_PUBLIC_",
    server: { API_SECRET: z.string() },
    client: { EXPO_PUBLIC_A: z.string(), EXPO_PUBLIC_B: z.string().optional() },
    runtimeEnv: {
      API_SECRET: process.env.API_SECRET,
      EXPO_PUBLIC_A: process.env.EXPO_PUBLIC_A,
      EXPO_PUBLIC_B: process.env.EXPO_PUBLIC_B,
    },
    strict: true,
  });

  expectTypeOf(env).toEqualTypeOf<{
    readonly API_SECRET: string;
    readonly EXPO_PUBLIC_A: string;
    readonly EXPO_PUBLIC_B: string | undefined;
  }>();

  // @ts-expect-error EXPO_PUBLIC_B is missing (optional keys must be listed too)
  loadEnvConfig({
    clientPrefix: "EXPO_PUBLIC_",
    client: { EXPO_PUBLIC_A: z.string(), EXPO_PUBLIC_B: z.string().optional() },
    runtimeEnv: { EXPO_PUBLIC_A: "a" },
    strict: true,
  });

  loadEnvConfig({
    clientPrefix: "EXPO_PUBLIC_",
    client: { EXPO_PUBLIC_A: z.string() },
    runtimeEnv: {
      EXPO_PUBLIC_A: "a",
      // @ts-expect-error misspelled key: not a declared server or client key
      EXPO_PUBLIC_AA: "a",
    },
    strict: true,
  });
};

const strictRequiresServerKeysToo = () => {
  // like T3 Env's runtimeEnvStrict: every declared key, server and client, must be listed
  // @ts-expect-error API_SECRET is missing
  loadEnvConfig({
    clientPrefix: "EXPO_PUBLIC_",
    server: { API_SECRET: z.string() },
    client: { EXPO_PUBLIC_A: z.string() },
    runtimeEnv: { EXPO_PUBLIC_A: "a" },
    strict: true,
  });

  loadEnvConfig({
    clientPrefix: "EXPO_PUBLIC_",
    server: { API_SECRET: z.string() },
    client: { EXPO_PUBLIC_A: z.string() },
    runtimeEnv: { EXPO_PUBLIC_A: "a", API_SECRET: process.env.API_SECRET },
    strict: true,
  });
};

const strictRejectsWholeObjects = () => {
  const viteEnv: Record<string, string | undefined> = { VITE_A: "a" };

  // @ts-expect-error with strict, keys must be listed one by one
  loadEnvConfig({
    clientPrefix: "VITE_",
    client: { VITE_A: z.string() },
    runtimeEnv: viteEnv,
    strict: true,
  });
};

const strictWithoutClientKeys = () => {
  // accepted, has no effect
  loadEnvConfig({ server: { API_SECRET: z.string() }, strict: true });
};

// `shared` keys follow `strict` like the others.
const sharedStrict = () => {
  loadEnvConfig({
    clientPrefix: "EXPO_PUBLIC_",
    client: { EXPO_PUBLIC_A: z.string() },
    shared: { NODE_ENV: z.string() },
    strict: true,
    runtimeEnv: { EXPO_PUBLIC_A: "a", NODE_ENV: "test" },
  });

  // @ts-expect-error NODE_ENV is missing
  loadEnvConfig({
    clientPrefix: "EXPO_PUBLIC_",
    client: { EXPO_PUBLIC_A: z.string() },
    shared: { NODE_ENV: z.string() },
    strict: true,
    runtimeEnv: { EXPO_PUBLIC_A: "a" },
  });

  // without client keys, shared keys still need runtimeEnv, and no clientPrefix
  loadEnvConfig({ shared: { NODE_ENV: z.string() }, runtimeEnv: { NODE_ENV: "test" } });
  // @ts-expect-error runtimeEnv is missing
  loadEnvConfig({ shared: { NODE_ENV: z.string() } });
};

describe("loadEnvConfig (generic) strict types", () => {
  it("is checked by tsc", () => {
    expectTypeOf(looseByDefault).toBeFunction();
    expectTypeOf(strictRequiresEveryClientKey).toBeFunction();
    expectTypeOf(strictRequiresServerKeysToo).toBeFunction();
    expectTypeOf(strictRejectsWholeObjects).toBeFunction();
    expectTypeOf(strictWithoutClientKeys).toBeFunction();
    expectTypeOf(sharedStrict).toBeFunction();
  });
});

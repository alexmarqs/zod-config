import { loadEnvConfig } from "@/index";
import { loadEnvConfig as loadNextEnvConfig } from "@/nextjs";
import { withZodConfigEnv } from "@/nextjs-config";
import { zodConfigEnv } from "@/vite";
import type { Plugin } from "vite";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod/v4";

// These functions are never called: the assertions are checked by `tsc` (pnpm type-check).

const viteSchemaSharedWithThePlugin = () => {
  const envSchema = {
    clientPrefix: "VITE_",
    server: { DATABASE_URL: z.url(), PORT: z.coerce.number().default(3000) },
    client: { VITE_API_URL: z.url(), VITE_SENTRY_DSN: z.string().optional() },
  } as const;

  const viteEnv: Record<string, string | boolean | undefined> = {};
  const env = loadEnvConfig({ ...envSchema, runtimeEnv: viteEnv });

  expectTypeOf(env).toEqualTypeOf<{
    readonly DATABASE_URL: string;
    readonly PORT: number;
    readonly VITE_API_URL: string;
    readonly VITE_SENTRY_DSN: string | undefined;
  }>();

  expectTypeOf(zodConfigEnv(envSchema)).toMatchTypeOf<Plugin>();
};

const viteSchemaWithoutAsConst = () => {
  const envSchema = {
    clientPrefix: "VITE_",
    client: { VITE_API_URL: z.url() },
  };

  const env = loadEnvConfig({ ...envSchema, runtimeEnv: {} });

  expectTypeOf(env).toEqualTypeOf<{ readonly VITE_API_URL: string }>();
  expectTypeOf(zodConfigEnv(envSchema)).toMatchTypeOf<Plugin>();
};

const nextSchemaSharedWithTheWrapper = () => {
  const envSchema = {
    server: { DATABASE_URL: z.url() },
    client: { NEXT_PUBLIC_APP_URL: z.url() },
  } as const;

  const env = loadNextEnvConfig({
    ...envSchema,
    runtimeEnv: { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
  });

  expectTypeOf(env).toEqualTypeOf<{
    readonly DATABASE_URL: string;
    readonly NEXT_PUBLIC_APP_URL: string;
  }>();

  // the wrapper returns the config with its own type
  const nextConfig = { reactStrictMode: true };
  expectTypeOf(withZodConfigEnv(nextConfig, envSchema)).toEqualTypeOf<{
    reactStrictMode: boolean;
  }>();

  // the client keys must still be listed in `runtimeEnv`
  // @ts-expect-error NEXT_PUBLIC_APP_URL is missing
  loadNextEnvConfig({ ...envSchema, runtimeEnv: {} });
};

describe("shared env schema types", () => {
  it("should be checked by tsc", () => {
    expectTypeOf(viteSchemaSharedWithThePlugin).toBeFunction();
    expectTypeOf(viteSchemaWithoutAsConst).toBeFunction();
    expectTypeOf(nextSchemaSharedWithTheWrapper).toBeFunction();
  });
});

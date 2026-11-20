import { defineEnvConfig, loadEnvConfig } from "@/index";
import {
  defineEnvConfig as defineNextEnvConfig,
  loadEnvConfig as loadNextEnvConfig,
  withZodConfigEnv,
} from "@/nextjs";
import { zodConfigEnv } from "@/vite";
import type { Plugin } from "vite";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod/v4";

const originalEnv = process.env;

describe("defineEnvConfig", () => {
  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return a definition that loadEnvConfig loads with full types", () => {
    const envConfig = defineEnvConfig({
      clientPrefix: "VITE_",
      server: { PORT: z.coerce.number().default(3000) },
      client: { VITE_API_URL: z.url(), VITE_SENTRY_DSN: z.string().optional() },
    });

    const env = loadEnvConfig({
      ...envConfig,
      runtimeEnv: { VITE_API_URL: "https://api.dev" },
    });

    expect(env).toEqual({ PORT: 3000, VITE_API_URL: "https://api.dev" });
    expectTypeOf(env).toEqualTypeOf<{
      readonly PORT: number;
      readonly VITE_API_URL: string;
      readonly VITE_SENTRY_DSN: string | undefined;
    }>();
  });

  it("should keep the options given", () => {
    const onError = () => {};
    const server = { PORT: z.string() };
    const envConfig = defineEnvConfig({ server, onError, skipValidation: true });

    expect(envConfig).toEqual({ server, client: {}, onError, skipValidation: true });
  });

  it("should accept a server-only definition without clientPrefix", () => {
    process.env = { PORT: "8080" };
    const envConfig = defineEnvConfig({ server: { PORT: z.coerce.number() } });

    const env = loadEnvConfig({ ...envConfig });

    expect(env).toEqual({ PORT: 8080 });
    expectTypeOf(env).toEqualTypeOf<{ readonly PORT: number }>();
  });

  it("should be accepted by the Vite plugin", () => {
    const envConfig = defineEnvConfig({
      clientPrefix: "VITE_",
      client: { VITE_API_URL: z.url() },
    });

    expectTypeOf(zodConfigEnv(envConfig)).toMatchTypeOf<Plugin>();
    expect(zodConfigEnv(envConfig).name).toBe("zod-config:env");
  });

  it("should return a Next.js definition that loadEnvConfig loads with full types", () => {
    process.env = { DATABASE_URL: "https://db.dev", NEXT_PUBLIC_APP_URL: "https://app.dev" };
    const envConfig = defineNextEnvConfig({
      server: { DATABASE_URL: z.url() },
      client: { NEXT_PUBLIC_APP_URL: z.url() },
    });

    const env = loadNextEnvConfig({
      ...envConfig,
      runtimeEnv: { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
    });

    expect(env).toEqual({ DATABASE_URL: "https://db.dev", NEXT_PUBLIC_APP_URL: "https://app.dev" });
    expectTypeOf(env).toEqualTypeOf<{
      readonly DATABASE_URL: string;
      readonly NEXT_PUBLIC_APP_URL: string;
    }>();

    const nextConfig = { reactStrictMode: true };
    expect(withZodConfigEnv(envConfig)(nextConfig)).toBe(nextConfig);
  });
});

// These functions are never called: the assertions are checked by `tsc` (pnpm type-check).

const typeErrors = () => {
  // @ts-expect-error client keys must start with the prefix
  defineEnvConfig({ clientPrefix: "VITE_", client: { API_URL: z.url() } });

  // @ts-expect-error server keys must not start with the prefix
  defineEnvConfig({ clientPrefix: "VITE_", server: { VITE_SECRET: z.string() } });

  // @ts-expect-error clientPrefix is required with client keys
  defineEnvConfig({ client: { VITE_API_URL: z.url() } });

  // @ts-expect-error unknown option
  defineEnvConfig({ clientPrefix: "VITE_", clients: { VITE_API_URL: z.url() } });

  // @ts-expect-error not a Zod schema
  defineEnvConfig({ clientPrefix: "VITE_", client: { VITE_API_URL: "string" } });

  // @ts-expect-error runtimeEnv belongs to loadEnvConfig
  defineEnvConfig({ server: { PORT: z.string() }, runtimeEnv: {} });

  // @ts-expect-error client keys must start with NEXT_PUBLIC_
  defineNextEnvConfig({ client: { APP_URL: z.url() } });

  // @ts-expect-error server keys must not start with NEXT_PUBLIC_
  defineNextEnvConfig({ server: { NEXT_PUBLIC_SECRET: z.string() } });

  const nextEnvConfig = defineNextEnvConfig({ client: { NEXT_PUBLIC_APP_URL: z.url() } });
  // @ts-expect-error the client keys must still be listed in runtimeEnv
  loadNextEnvConfig({ ...nextEnvConfig, runtimeEnv: {} });
};

describe("defineEnvConfig types", () => {
  it("should be checked by tsc", () => {
    expectTypeOf(typeErrors).toBeFunction();
  });
});

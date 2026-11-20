import { withZodConfigEnv } from "@/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

const originalEnv = process.env;

const envSchema = {
  server: { DATABASE_URL: z.url() },
  client: { NEXT_PUBLIC_APP_URL: z.url() },
} as const;

describe("withZodConfigEnv (zod-config/nextjs)", () => {
  beforeEach(() => {
    process.env = {};
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return the Next.js config unchanged when the environment is valid", () => {
    process.env = {
      DATABASE_URL: "https://db.dev",
      NEXT_PUBLIC_APP_URL: "https://app.dev",
    };
    const nextConfig = { reactStrictMode: true };

    expect(withZodConfigEnv(envSchema)(nextConfig)).toBe(nextConfig);
  });

  it("should return a config function unchanged", () => {
    process.env = {
      DATABASE_URL: "https://db.dev",
      NEXT_PUBLIC_APP_URL: "https://app.dev",
    };
    const nextConfig = async () => ({ reactStrictMode: true });

    expect(withZodConfigEnv(envSchema)(nextConfig)).toBe(nextConfig);
  });

  it("should throw listing each invalid variable when they are missing", () => {
    expect(() => withZodConfigEnv(envSchema)({})).toThrowError(
      /Invalid environment variables:\n {2}DATABASE_URL: .*\n {2}NEXT_PUBLIC_APP_URL: /,
    );
  });

  it("should not validate with skipValidation", () => {
    expect(() => withZodConfigEnv({ ...envSchema, skipValidation: true })({})).not.toThrow();
  });

  it("should call onError with the Zod error before throwing", () => {
    const onError = vi.fn();

    expect(() => withZodConfigEnv({ ...envSchema, onError })({})).toThrowError(
      /Invalid environment variables/,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].issues).toHaveLength(2);
  });

  it("should throw when a client key does not start with NEXT_PUBLIC_", () => {
    expect(() => withZodConfigEnv({ client: { APP_URL: z.url() } })({})).toThrowError(
      /client keys must start with "NEXT_PUBLIC_"/,
    );
  });
});

import { preloadEnvConfig } from "@/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inlineAdapter } from "../fixtures/utils-fixtures";

const originalEnv = process.env;
const STATE_KEY = Symbol.for("zod-config.nextjs.preload");

describe("preloadEnvConfig", () => {
  beforeEach(() => {
    delete (globalThis as any)[STATE_KEY];
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should do nothing outside production by default", async () => {
    process.env = { NODE_ENV: "development" };
    const adapters = vi.fn(() => [inlineAdapter({ A: "1" })]);

    await preloadEnvConfig({ adapters });

    expect(adapters).not.toHaveBeenCalled();
    expect(process.env.A).toBeUndefined();
  });

  it("should load in production by default", async () => {
    process.env = { NODE_ENV: "production" };

    await preloadEnvConfig({ adapters: () => [inlineAdapter({ A: "1" })] });

    expect(process.env.A).toBe("1");
  });

  it("should load in development when enabled is true", async () => {
    process.env = { NODE_ENV: "development" };

    await preloadEnvConfig({ enabled: true, adapters: () => [inlineAdapter({ A: "1" })] });

    expect(process.env.A).toBe("1");
  });

  it("should not load in production when enabled is false", async () => {
    process.env = { NODE_ENV: "production" };
    const adapters = vi.fn(() => [inlineAdapter({ A: "1" })]);

    await preloadEnvConfig({ enabled: false, adapters });

    expect(adapters).not.toHaveBeenCalled();
    expect(process.env.A).toBeUndefined();
  });

  it("should copy strings, numbers and booleans and skip everything else", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await preloadEnvConfig({
      enabled: true,
      adapters: () => [
        inlineAdapter({ S: "str-SENTINEL", N: 5432, B: true, O: { x: 1 }, L: ["a"], Z: null }),
      ],
    });

    expect(process.env.S).toBe("str-SENTINEL");
    expect(process.env.N).toBe("5432");
    expect(process.env.B).toBe("true");
    expect(process.env.O).toBeUndefined();
    expect(process.env.L).toBeUndefined();
    expect(process.env.Z).toBeUndefined();

    const logged = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls]);
    expect(logged).not.toContain("SENTINEL");
  });

  it("should never overwrite a variable that is already set", async () => {
    process.env = { S: "existing" };

    await preloadEnvConfig({
      enabled: true,
      adapters: () => [inlineAdapter({ S: "new", N: "new" })],
    });

    expect(process.env.S).toBe("existing");
    expect(process.env.N).toBe("new");
  });

  it("should fill a variable that is set but empty", async () => {
    process.env = { E: "" };

    await preloadEnvConfig({ enabled: true, adapters: () => [inlineAdapter({ E: "new" })] });

    expect(process.env.E).toBe("new");
  });

  it("should resolve without doing anything when there is no process global", async () => {
    const adapters = vi.fn(() => [inlineAdapter({ A: "1" })]);
    vi.stubGlobal("process", undefined);

    try {
      await preloadEnvConfig({ enabled: true, adapters });
    } finally {
      vi.unstubAllGlobals();
    }

    expect(adapters).not.toHaveBeenCalled();
  });

  it("should let later adapters override earlier ones", async () => {
    await preloadEnvConfig({
      enabled: true,
      adapters: async () => [inlineAdapter({ A: "1", B: "1" }), inlineAdapter({ B: "2" })],
    });

    expect(process.env.A).toBe("1");
    expect(process.env.B).toBe("2");
  });

  it("should run at most once per process", async () => {
    const adapters = vi.fn(() => [inlineAdapter({ A: "1" })]);

    const first = preloadEnvConfig({ enabled: true, adapters });
    const second = preloadEnvConfig({ enabled: true, adapters });
    await Promise.all([first, second]);
    await preloadEnvConfig({ enabled: true, adapters });

    expect(first).toBe(second);
    expect(adapters).toHaveBeenCalledTimes(1);
  });

  it("should do nothing on the Edge runtime", async () => {
    process.env = { NEXT_RUNTIME: "edge" };
    const adapters = vi.fn(() => [inlineAdapter({ A: "1" })]);

    await preloadEnvConfig({ enabled: true, adapters });

    expect(adapters).not.toHaveBeenCalled();
  });

  it("should run on the Node.js runtime", async () => {
    process.env = { NEXT_RUNTIME: "nodejs" };

    await preloadEnvConfig({ enabled: true, adapters: () => [inlineAdapter({ A: "1" })] });

    expect(process.env.A).toBe("1");
  });

  it("should keep the values of working adapters when another adapter fails to read", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = {
      name: "failing adapter",
      read: async () => {
        throw new Error("boom");
      },
    };

    await preloadEnvConfig({
      enabled: true,
      adapters: () => [failing, inlineAdapter({ A: "1" })],
    });

    expect(process.env.A).toBe("1");
  });

  it("should reject when the adapters function fails, and retry on the next call", async () => {
    await expect(
      preloadEnvConfig({
        enabled: true,
        adapters: async () => {
          throw new Error("cannot import");
        },
      }),
    ).rejects.toThrow("cannot import");

    await preloadEnvConfig({ enabled: true, adapters: () => [inlineAdapter({ A: "1" })] });

    expect(process.env.A).toBe("1");
  });

  it("should do nothing when no adapters are returned", async () => {
    process.env = { EXISTING: "x" };

    await preloadEnvConfig({ enabled: true, adapters: () => [] });

    expect(process.env).toEqual({ EXISTING: "x" });
  });
});

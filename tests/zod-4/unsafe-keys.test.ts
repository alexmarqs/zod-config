import { envAdapter } from "@/lib/adapters/env-adapter";
import { loadConfig } from "@/lib/config";
import { loadConfigSync } from "@/lib/config-sync";
import { deepMerge } from "@/lib/utils";
import { applyNestingSeparatorKeyValue } from "@/lib/utils/nesting-separator";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod/v4";

const syncAdapter = (json: string) => ({ name: "inline", read: () => JSON.parse(json) });

const cleanPrototype = () => {
  for (const key of Object.keys(Object.prototype)) {
    delete (Object.prototype as Record<string, unknown>)[key];
  }
};

describe("unsafe keys", () => {
  afterEach(() => {
    // never let a failing test leak pollution into other tests
    cleanPrototype();
  });

  it("should not pollute Object.prototype through a __proto__ key in adapter data", () => {
    const config = loadConfigSync({
      schema: z.object({ A: z.string() }),
      adapters: [syncAdapter('{"__proto__":{"polluted":"yes"},"A":"1"}')],
    });

    expect(config).toEqual({ A: "1" });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("should not pollute Object.prototype through a nested __proto__ key", async () => {
    const config = await loadConfig({
      schema: z.object({ db: z.object({ host: z.string() }) }),
      adapters: [
        syncAdapter('{"db":{"host":"a"}}'),
        syncAdapter('{"db":{"__proto__":{"polluted":"yes"},"host":"b"}}'),
      ],
    });

    expect(config).toEqual({ db: { host: "b" } });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("should not pollute through constructor.prototype in adapter data", () => {
    loadConfigSync({
      schema: z.object({ A: z.string() }),
      adapters: [syncAdapter('{"constructor":{"prototype":{"polluted":"yes"}},"A":"1"}')],
    });

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("should keep merging a regular key named prototype", () => {
    expect(deepMerge({}, { prototype: { a: 1 } }, { prototype: { b: 2 } })).toEqual({
      prototype: { a: 1, b: 2 },
    });
  });

  it("should not return a result whose own prototype was replaced by deepMerge", () => {
    const merged = deepMerge({}, JSON.parse('{"__proto__":{"injected":true},"a":1}'));

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect((merged as Record<string, unknown>).injected).toBeUndefined();
    expect(merged).toEqual({ a: 1 });
  });

  it("should not pollute Object.prototype through a nesting separator key", () => {
    const config = loadConfigSync({
      schema: z.object({ A: z.string() }),
      adapters: [
        envAdapter({
          customEnv: {
            A: "1",
            "__proto__.polluted": "yes",
            "db.__proto__.polluted": "yes",
            "constructor.prototype.polluted": "yes",
          },
          nestingSeparator: ".",
        }),
      ],
    });

    expect(config).toEqual({ A: "1" });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("should skip keys with an unsafe path segment and keep the others", () => {
    const acc: Record<string, unknown> = {};

    applyNestingSeparatorKeyValue(acc, "db.host", "localhost", ".");
    applyNestingSeparatorKeyValue(acc, "db.__proto__.x", "1", ".");
    applyNestingSeparatorKeyValue(acc, "x.constructor", "1", ".");

    expect(acc).toEqual({ db: { host: "localhost" } });
  });

  it("should keep a path segment named prototype as a regular nested key", () => {
    const config = loadConfigSync({
      schema: z.object({ prototype: z.object({ db: z.object({ HOST: z.string() }) }) }),
      adapters: [
        envAdapter({ customEnv: { "prototype/db/HOST": "db.internal" }, nestingSeparator: "/" }),
      ],
    });

    expect(config).toEqual({ prototype: { db: { HOST: "db.internal" } } });
    expect(Object.keys(Object.prototype)).toEqual([]);
  });

  it("should treat inherited property names as regular nested keys", () => {
    const acc: Record<string, unknown> = {};

    applyNestingSeparatorKeyValue(acc, "toString.value", "1", ".");
    applyNestingSeparatorKeyValue(acc, "valueOf", "2", ".");

    expect(acc.toString).toEqual({ value: "1" });
    expect(acc.valueOf).toBe("2");
  });

  it("should not let a transform set the prototype of the data", () => {
    const config = loadConfigSync({
      schema: z.object({ A: z.string() }),
      adapters: [
        {
          name: "inline",
          read: () => ({ A: "1", B: { injected: "yes" } }),
          transform: ({ key, value }) =>
            key === "B" ? { key: "__proto__", value } : { key, value },
        },
      ],
    });

    expect(config).toEqual({ A: "1" });
    expect((config as Record<string, unknown>).injected).toBeUndefined();
  });
});

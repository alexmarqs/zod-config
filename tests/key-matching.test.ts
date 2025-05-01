import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { loadConfig } from "@/index";

describe("Lenient key matching tests", () => {
  it("should perform lenient matching", async () => {
    const MyConfig = z.object({
      foo: z.object({
        enabled: z.boolean().default(true),
        nestedProp: z.string(),
        OTHER_PROP: z.string(),
        databaseUrl: z.string(),
      }),
    });

    const mockedLogger = { warn: vi.fn() };
    const config = await loadConfig({
      logger: mockedLogger,
      schema: MyConfig,
      keyMatching: "lenient",
      adapters: [
        inlineAdapter({
          FOO: { NESTED_PROP: "Foo!", otherProp: "Test", "database.url": "https://example.com" },
        }),
      ],
    });

    expect(config).toEqual({
      foo: {
        enabled: true,
        nestedProp: "Foo!",
        OTHER_PROP: "Test",
        databaseUrl: "https://example.com",
      },
    });
  });

  it("key matching should preserve order of adapters", async () => {
    const MyConfig = z.object({
      foo: z.object({
        enabled: z.boolean().default(true),
        nestedProp: z.string(),
        OTHER_PROP: z.string(),
      }),
    });

    const mockedLogger = { warn: vi.fn() };
    const config = await loadConfig({
      logger: mockedLogger,
      schema: MyConfig,
      keyMatching: "lenient",
      adapters: [
        inlineAdapter({ FOO: { nestedProp: "Foo!", otherProp: "Test" } }),
        inlineAdapter({ FOO: { NESTED_PROP: "Override1", otherProp: "Override1" } }),
        inlineAdapter({ foo: { NESTED_PROP: "Override2", otherProp: "Override2" } }),
        inlineAdapter({ FOO: { NESTED_PROP: "Override3" } }),
      ],
    });

    expect(config).toEqual({
      foo: {
        enabled: true,
        nestedProp: "Override3",
        OTHER_PROP: "Override2",
      },
    });
  });
});

function inlineAdapter(source: Record<string, unknown>) {
  return { name: "inline", read: async () => source };
}

import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4-mini";

import { loadConfig } from "@/index";
import { inlineAdapter } from "../fixtures/utils-fixtures";

describe("Lenient key matching tests", () => {
  it("should perform lenient matching", async () => {
    const MyConfig = z.object({
      foo: z.object({
        enabled: z._default(z.boolean(), true),
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
        inlineAdapter({
          FOO: { NESTED_PROP: "Foo!", otherProp: "Test" },
        }),
      ],
    });

    expect(config).toEqual({
      foo: {
        enabled: true,
        nestedProp: "Foo!",
        OTHER_PROP: "Test",
      },
    });
  });

  it("key matching should preserve order of adapters", async () => {
    const MyConfig = z.object({
      foo: z.object({
        enabled: z._default(z.boolean(), true),
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

  it("should handle complex nested structures with various key formats", async () => {
    const ComplexConfig = z.object({
      apiSettings: z.object({
        baseUrl: z.string(),
        timeoutMs: z.number(),
        retryCount: z.number(),
        headers: z.record(z.string(), z.string()),
      }),
      databaseConfig: z.object({
        connectionString: z.string(),
        poolSize: z.number(),
        migrations: z.object({
          enableAuto: z.boolean(),
          scriptsPath: z.string(),
        }),
      }),
      featureFlags: z.record(z.string(), z.boolean()),
    });

    const config = await loadConfig({
      schema: ComplexConfig,
      keyMatching: "lenient",
      adapters: [
        inlineAdapter({
          API_SETTINGS: {
            "base-url": "https://api.example.com",
            TIMEOUT_MS: 5000,
            retry_count: 3,
            headers: { "x-api-key": "test-key" },
          },
          database_config: {
            ConnectionString: "postgres://localhost:5432/mydb",
            "POOL-SIZE": 10,
            MIGRATIONS: {
              enable_auto: true,
              "scripts.path": "/migrations",
            },
          },
          "FEATURE.FLAGS": {
            newUI: true,
            BETA_FEATURES: false,
            "experimental-api": true,
          },
        }),
      ],
    });

    expect(config).toEqual({
      apiSettings: {
        baseUrl: "https://api.example.com",
        timeoutMs: 5000,
        retryCount: 3,
        headers: { "x-api-key": "test-key" },
      },
      databaseConfig: {
        connectionString: "postgres://localhost:5432/mydb",
        poolSize: 10,
        migrations: {
          enableAuto: true,
          scriptsPath: "/migrations",
        },
      },
      featureFlags: {
        newUI: true,
        BETA_FEATURES: false,
        "experimental-api": true,
      },
    });
  });
});

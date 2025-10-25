import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

import { loadConfig } from "@/index";
import { inlineAdapter } from "../fixtures/utils-fixtures";
import { envAdapter } from "@/lib/adapters/env-adapter";

describe("Lenient key matching tests", () => {
  it("should perform lenient matching", async () => {
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

  it("should perform lenient matching with prefault values", async () => {
    const MyConfig = z.object({
      one: z
        .object({
          two: z.string().default("foo"),
        })
        .prefault({}),
    });

    const mockedLogger = { warn: vi.fn() };

    const config = await loadConfig({
      logger: mockedLogger,
      schema: MyConfig,
      adapters: [
        envAdapter({
          customEnv: {
            ONE__TWO: "bar",
          },
          keyMatching: "lenient",
          nestingSeparator: "__",
        }),
      ],
    });

    expect(config).toEqual({
      one: {
        two: "bar",
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

  it("should work with nested transforms", async () => {
    const ConfigWithTransforms = z.object({
      apiKey: z.string().transform((val) => val.trim()),
      maxRetries: z.string().transform((val) => Number.parseInt(val, 10)),
      isEnabled: z.string().transform((val) => val.toLowerCase() === "true"),
    });

    const config = await loadConfig({
      schema: ConfigWithTransforms,
      keyMatching: "lenient",
      adapters: [
        inlineAdapter({
          "api-key": " secret-key-123 ",
          MAX_RETRIES: "5",
          IS_ENABLED: "TRUE",
        }),
      ],
    });

    expect(config).toEqual({
      apiKey: "secret-key-123",
      maxRetries: 5,
      isEnabled: true,
    });
  });

  it("should work with top level object transforms", async () => {
    const ServerConfig = z
      .object({
        host: z.string(),
        port: z.string(),
      })
      .transform((data) => ({
        serverUrl: `http://${data.host}:${data.port}`,
        host: data.host,
        port: Number.parseInt(data.port, 10),
      }));

    const config = await loadConfig({
      schema: ServerConfig,
      keyMatching: "lenient",
      adapters: [
        inlineAdapter({
          HOST: "localhost",
          PORT: "3000",
        }),
      ],
    });

    expect(config).toEqual({
      serverUrl: "http://localhost:3000",
      host: "localhost",
      port: 3000,
    });
  });

  it("should work with nested transforms", async () => {
    const DatabaseConfig = z.object({
      credentials: z
        .object({
          username: z.string(),
          password: z.string(),
        })
        .transform((creds) => ({
          ...creds,
          encoded: Buffer.from(`${creds.username}:${creds.password}`).toString("base64"),
        })),
      settings: z.object({
        host: z.preprocess(() => "preprocess-db.example.com", z.string()),
        port: z.string().transform((val) => Number.parseInt(val, 10)),
      }),
    });

    const config = await loadConfig({
      schema: DatabaseConfig,
      keyMatching: "lenient",
      adapters: [
        inlineAdapter({
          CREDENTIALS: {
            "USER-NAME": "admin",
            PASSWORD: "secret123",
          },
          settings: {
            HOST: "db.example.com",
            port: "5432",
          },
        }),
      ],
    });

    expect(config).toEqual({
      credentials: {
        username: "admin",
        password: "secret123",
        encoded: "YWRtaW46c2VjcmV0MTIz", // Base64 of "admin:secret123"
      },
      settings: {
        host: "preprocess-db.example.com",
        port: 5432,
      },
    });
  });

  it("should handle async transforms with lenient matching", async () => {
    const AsyncConfig = z.object({
      userId: z.string().transform(async (val) => val.toUpperCase()),
      lastLogin: z.string().transform(async (val) => new Date(val).toISOString()),
    });

    const config = await loadConfig({
      schema: AsyncConfig,
      keyMatching: "lenient",
      adapters: [
        inlineAdapter({
          user_id: "user123",
          "LAST-LOGIN": "2023-01-01T12:00:00Z",
        }),
      ],
    });

    expect(config).toEqual({
      userId: "USER123",
      lastLogin: new Date("2023-01-01T12:00:00Z").toISOString(),
    });
  });
});

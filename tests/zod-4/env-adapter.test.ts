import { envAdapter } from "@/lib/adapters/env-adapter";
import { loadConfig } from "@/lib/config";
import {} from "node:fs/promises";
import { inlineAdapter } from "../fixtures/utils-fixtures";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

describe("env adapter", () => {
  it("should return parsed data when schema is valid", async () => {
    // given
    const schema = z.object({
      APP_NAME: z.string(),
      PORT: z.string().regex(/^\d+$/),
    });

    Object.assign(process.env, {
      APP_NAME: "app name",
      PORT: "3000",
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: envAdapter(),
    });

    // then
    expect(config.APP_NAME).toBe("app name");
    expect(config.PORT).toBe("3000");
  });
  it("should return parsed data when schema is valid with custom env", async () => {
    // given
    const schema = z.object({
      APP_NAME: z.string(),
      PORT: z.string().regex(/^\d+$/),
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: envAdapter({
        customEnv: {
          APP_NAME: "app name",
          PORT: "3000",
        },
      }),
    });

    // then
    expect(config.APP_NAME).toBe("app name");
    expect(config.PORT).toBe("3000");
  });
  it("should return parsed data when schema is valid with regex key", async () => {
    // given
    const schema = z.object({
      APP_NAME: z.string(),
    });

    Object.assign(process.env, {
      APP_NAME: "app name",
      PORT: "3000",
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: envAdapter({
        regex: /^APP_/,
      }),
    });

    // then
    expect(config).toEqual({
      APP_NAME: "app name",
    });
  });
  it("Process.env should be correctly handled", async () => {
    // given
    const schema = z.object({
      NODE_ENV: z.string(),
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: [
        inlineAdapter({
          NODE_ENV: "test-inline",
        }),
        // should exist NODE_ENV = test in process.env
        envAdapter(),
      ],
    });

    // then
    expect(config.NODE_ENV).toBe("test");
  });
  it("should convert flat env vars to nested objects with dot separator", async () => {
    const schema = z.object({
      database: z.object({
        host: z.string(),
        port: z.string(),
        auth: z.object({
          username: z.string(),
          password: z.string(),
        }),
      }),
      app: z.object({
        name: z.string(),
      }),
    });

    const customEnv = {
      "database.host": "localhost",
      "database.port": "5432",
      "database.auth.username": "admin",
      "database.auth.password": "secret",
      "app.name": "my-app",
    };

    const config = await loadConfig({
      schema,
      adapters: envAdapter({
        customEnv,
        nestingSeparator: ".",
      }),
    });

    expect(config).toEqual({
      database: {
        host: "localhost",
        port: "5432",
        auth: {
          username: "admin",
          password: "secret",
        },
      },
      app: {
        name: "my-app",
      },
    });
  });
  it("should work with lenient key matching and nested separator", async () => {
    const schema = z.object({
      myApp: z.object({
        database: z.object({
          host: z.string(),
          port: z.string(),
        }),
      }),
    });

    const customEnv = {
      MY_APP__DATABASE__HOST: "localhost",
      MY_APP__DATABASE__PORT: "5432",
    };

    const config = await loadConfig({
      schema,

      adapters: envAdapter({
        customEnv,
        nestingSeparator: "__",
        keyMatching: "lenient",
      }),
    });

    expect(config).toEqual({
      myApp: {
        database: {
          host: "localhost",
          port: "5432",
        },
      },
    });
  });
  it("should not apply nesting when separator is not provided", async () => {
    const schema = z.object({
      "database.host": z.string(),
      "database.port": z.string(),
    });

    const customEnv = {
      "database.host": "localhost",
      "database.port": "5432",
    };

    const config = await loadConfig({
      schema,
      adapters: envAdapter({
        customEnv,
        // No nestingDelimiter provided
      }),
    });

    expect(config).toEqual({
      "database.host": "localhost",
      "database.port": "5432",
    });
  });
  it("should handle mixed delimited and non-delimited keys with dot separator", async () => {
    const schema = z.object({
      database: z.object({
        host: z.string(),
        port: z.string(),
      }),
      simpleKey: z.string(),
    });

    const customEnv = {
      "database.host": "localhost",
      "database.port": "5432",
      simpleKey: "simple-value",
    };

    const config = await loadConfig({
      schema,
      adapters: envAdapter({
        customEnv,
        nestingSeparator: ".",
      }),
    });

    expect(config).toEqual({
      database: {
        host: "localhost",
        port: "5432",
      },
      simpleKey: "simple-value",
    });
  });
  it("should work with transform (adapter level) and nested separator", async () => {
    const schema = z.object({
      DATABASE: z.object({
        HOST: z.string(),
        PORT: z.string(),
      }),
    });

    const customEnv = {
      MY_APP_DATABASE_HOST: "localhost",
      MY_APP_DATABASE_PORT: "5432",
      OTHER_VAR: "ignored",
      ANOTHER_OTHER_VAR: "also-ignored",
    };

    const config = await loadConfig({
      schema,
      adapters: envAdapter({
        customEnv,
        transform: (obj) => {
          if (!obj.key.startsWith("MY_APP_")) {
            return false;
          }

          const strippedKey = obj.key.replace(/^MY_APP_/, "");

          return { key: strippedKey, value: obj.value };
        },
        nestingSeparator: "_",
      }),
    });

    expect(config).toEqual({
      DATABASE: {
        HOST: "localhost",
        PORT: "5432",
      },
    });
  });
  it("should work with transform (root config level) and nested separator", async () => {
    const schema = z.object({
      DATABASE: z.object({
        HOST: z.string(),
        PORT: z.string(),
      }),
    });

    const customEnv = {
      MY_APP_DATABASE_HOST: "localhost",
      MY_APP_DATABASE_PORT: "5432",
      OTHER_VAR: "ignored",
      ANOTHER_OTHER_VAR: "also-ignored",
    };

    const config = await loadConfig({
      schema,
      transform: (obj) => {
        if (!obj.key.startsWith("MY_APP_")) {
          return false;
        }

        const strippedKey = obj.key.replace(/^MY_APP_/, "");

        return { key: strippedKey, value: obj.value };
      },
      adapters: envAdapter({
        customEnv,
        nestingSeparator: "_",
      }),
    });

    expect(config).toEqual({
      DATABASE: {
        HOST: "localhost",
        PORT: "5432",
      },
    });
  });
});

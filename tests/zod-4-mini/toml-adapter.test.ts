import { tomlAdapter } from "@/lib/adapters/toml-adapter";
import { loadConfig } from "@/lib/config";
import type { Logger } from "@/types";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4-mini";

describe("toml adapter", () => {
  const testFilePath = path.join(__dirname, "test-toml-adapter.toml");

  beforeAll(async () => {
    await writeFile(
      testFilePath,
      `
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
API_KEY = "secret123"
DEBUG = true

[[kv_namespaces]]
binding = "MY_KV"
id = "xxx111xxx"
preview_id = "xxx222xxx"

[triggers]
crons = ["0 0 * * *"]
`,
    );
  });

  afterAll(async () => {
    await unlink(testFilePath);
  });

  it("should return parsed data when schema is valid", async () => {
    // given
    const schema = z.object({
      name: z.string(),
      main: z.string(),
      compatibility_date: z.string(),
      vars: z.object({
        API_KEY: z.string(),
        DEBUG: z.boolean(),
      }),
      kv_namespaces: z.array(
        z.object({
          binding: z.string(),
          id: z.string(),
          preview_id: z.string(),
        }),
      ),
      triggers: z.object({
        crons: z.array(z.string()),
      }),
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: tomlAdapter({
        path: testFilePath,
      }),
    });

    // then
    expect(config.name).toBe("my-worker");
    expect(config.main).toBe("src/index.ts");
    expect(config.compatibility_date).toBe("2024-01-01");
    expect(config.vars.API_KEY).toBe("secret123");
    expect(config.vars.DEBUG).toBe(true);
    expect(config.kv_namespaces).toEqual([
      {
        binding: "MY_KV",
        id: "xxx111xxx",
        preview_id: "xxx222xxx",
      },
    ]);
    expect(config.triggers.crons).toEqual(["0 0 * * *"]);
  });
  it("should throw zod error when schema is invalid", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.number(),
    });

    // when
    // then
    expect(
      loadConfig({
        schema,
        adapters: tomlAdapter({
          path: testFilePath,
        }),
      }),
    ).rejects.toThrowError(z.core.$ZodError);
  });
  it("should log error from adapter errors + throw zod error when schema is invalid", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.number(),
    });
    const consoleErrorSpy = vi.spyOn(console, "warn");

    // when
    // then
    await expect(
      loadConfig({
        schema,
        adapters: tomlAdapter({
          path: "not-exist.toml",
        }),
      }),
    ).rejects.toThrowError(z.core.$ZodError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Cannot read data from toml adapter: Failed to parse / read TOML file at not-exist.toml: ENOENT: no such file or directory, open 'not-exist.toml'",
    );
  });
  it("should log error from adapter errors (custom logger) + throw zod error when schema is invalid", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.number(),
    });

    const customLogger: Logger = {
      warn: (_msg) => {},
    };

    const customLoggerWarnSpy = vi.spyOn(customLogger, "warn");

    // when
    // then
    await expect(
      loadConfig({
        schema,
        adapters: tomlAdapter({
          path: "not-exist.toml",
        }),
        logger: customLogger,
      }),
    ).rejects.toThrowError(z.core.$ZodError);

    expect(customLoggerWarnSpy).toHaveBeenCalledWith(
      "Cannot read data from toml adapter: Failed to parse / read TOML file at not-exist.toml: ENOENT: no such file or directory, open 'not-exist.toml'",
    );
  });
  it("throw zod error when schema is invalid but not log error from adapter errors when silent is true", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.number(),
    });

    const consoleErrorSpy = vi.spyOn(console, "warn");

    // when
    // then
    expect(
      loadConfig({
        schema,
        adapters: tomlAdapter({
          path: "not-exist.toml",
          silent: true,
        }),
      }),
    ).rejects.toThrowError(z.core.$ZodError);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

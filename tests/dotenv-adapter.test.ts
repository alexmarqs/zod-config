import { dotEnvAdapter } from "@/lib/adapters/dotenv-adapter";
import { loadConfig } from "@/lib/config";
import type { Logger } from "@/types";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

describe("dotenv adapter", () => {
  const testFilePath = path.join(__dirname, ".env.test");

  beforeAll(async () => {
    await writeFile(testFilePath, "HOST=localhost\nPORT=3000");
  });

  afterAll(async () => {
    await unlink(testFilePath);
  });

  it("should return parsed data when schema is valid", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.string().regex(/^\d+$/),
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: dotEnvAdapter({
        path: testFilePath,
      }),
    });

    // then
    expect(config.HOST).toBe("localhost");
    expect(config.PORT).toBe("3000");
  });

  it("should throw zod error when schema is valid but data is invalid due to side effects .transform", async () => {
    // given
    const schema = z
      .object({
        HOST: z.string().transform((val) => val.toUpperCase()),
        PORT: z.string().regex(/^\d+$/),
      })
      .transform((data) => {
        return {
          HOST: data.HOST,
          PORT: "12345",
        };
      });

    // when
    const config = await loadConfig({
      schema,
      adapters: dotEnvAdapter({
        path: testFilePath,
      }),
    });

    // then
    expect(config.HOST).toBe("LOCALHOST");
    expect(config.PORT).toBe("12345");
  });
  it("should return parsed data when schema is valid with regex key", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: dotEnvAdapter({
        path: testFilePath,
        regex: /^HOST$/,
      }),
    });

    // then
    expect(config).toEqual({
      HOST: "localhost",
    });
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
        adapters: dotEnvAdapter({
          path: testFilePath,
        }),
      }),
    ).rejects.toThrowError(z.ZodError);
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
        adapters: dotEnvAdapter({
          path: ".env.not-exist",
        }),
      }),
    ).rejects.toThrowError(z.ZodError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Cannot read data from dotenv adapter: Failed to parse / read .env file at .env.not-exist: ENOENT: no such file or directory, open '.env.not-exist'",
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
        adapters: dotEnvAdapter({
          path: ".env.not-exist",
        }),
        logger: customLogger,
      }),
    ).rejects.toThrowError(z.ZodError);

    expect(customLoggerWarnSpy).toHaveBeenCalledWith(
      "Cannot read data from dotenv adapter: Failed to parse / read .env file at .env.not-exist: ENOENT: no such file or directory, open '.env.not-exist'",
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
        adapters: dotEnvAdapter({
          path: ".env.not-exist",
          silent: true,
        }),
      }),
    ).rejects.toThrowError(z.ZodError);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

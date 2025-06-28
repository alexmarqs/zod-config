import { loadConfigSync } from "@/index";
import { envAdapter } from "@/lib/adapters/env-adapter";
import { jsonAdapter } from "@/lib/adapters/json-adapter";
import { loadConfig } from "@/lib/config";
import type { Adapter, Logger } from "@/types";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

describe("multiple adapters", () => {
  const testFilePath = path.join(__dirname, "test-multiple-adapters.json");

  beforeAll(async () => {
    const testFileData = { APP_NAME: "app name", APP_ID: "1234abcde" };
    await writeFile(testFilePath, JSON.stringify(testFileData));
  });

  afterAll(async () => {
    await unlink(testFilePath);
  });

  it("should return parsed data from adapters when schema is valid", () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.string().regex(/^\d+$/),
      APP_NAME: z.string(),
    });

    process.env = {
      HOST: "localhost",
      PORT: "3000",
    };

    // when
    const config = loadConfigSync({
      schema,
      adapters: [
        envAdapter(),
        jsonAdapter({
          path: testFilePath,
        }),
      ],
    });

    // then
    expect(config.HOST).toBe("localhost");
    expect(config.PORT).toBe("3000");
    expect(config.APP_NAME).toBe("app name");
  });
  it("should return parsed data from adapters when schema is valid even if one adapter fails", () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.string().regex(/^\d+$/),
      APP_NAME: z.string(),
    });

    process.env = {
      HOST: "localhost",
      PORT: "3000",
      APP_NAME: "app name",
    };

    const consoleErrorSpy = vi.spyOn(console, "warn");

    // when
    const config = loadConfigSync({
      schema,
      adapters: [
        envAdapter(),
        jsonAdapter({
          path: "not-exist.json",
        }),
      ],
    });

    // then
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(config.HOST).toBe("localhost");
    expect(config.PORT).toBe("3000");
    expect(config.APP_NAME).toBe("app name");
  });
  it("should return parsed data from adapters when schema is valid even if one adapter fails (custom logger)", () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.string().regex(/^\d+$/),
      APP_NAME: z.string(),
    });
    process.env = {
      HOST: "localhost",
      PORT: "3000",
      APP_NAME: "app name",
    };

    const customLogger: Logger = {
      warn: (_msg) => {},
    };

    const customLoggerWarnSpy = vi.spyOn(customLogger, "warn");
    const consoleErrorSpy = vi.spyOn(console, "warn");

    // when
    const config = loadConfigSync({
      schema,
      adapters: [
        envAdapter(),
        jsonAdapter({
          path: "not-exist.json",
        }),
      ],
      logger: customLogger,
    });

    // then
    expect(customLoggerWarnSpy).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(config.HOST).toBe("localhost");
    expect(config.PORT).toBe("3000");
    expect(config.APP_NAME).toBe("app name");
  });
  it("should return parsed data from adapters when schema is valid overriding previous adapters", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.string().regex(/^\d+$/),
      APP_NAME: z.string(),
      APP_ID: z.string(),
    });


    const customAsyncAdapter: Adapter = {
      name: "custom adapter",
      read: async () => {

        await new Promise((resolve) => setTimeout(resolve, 100));

        return {
          HOST: "localhost",
          PORT: "3000",
          APP_NAME: "app name from env",
          APP_ID: undefined,
        };
      },
    };



    // when
    const config = await loadConfig({
      schema,
      adapters: [
        jsonAdapter({
          path: testFilePath,
        }),
        customAsyncAdapter,
      ],
    });

    
    // then
    expect(config.HOST).toBe("localhost");
    expect(config.PORT).toBe("3000");
    expect(config.APP_NAME).toBe("app name from env");
    expect(config.APP_ID).toBe("1234abcde");
  });
});

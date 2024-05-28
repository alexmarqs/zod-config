import { unlink, writeFile } from "fs/promises";
import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { dotEnvAdapter } from "../src/lib/adapters/dotenv-adapter";
import { envAdapter } from "../src/lib/adapters/env-adapter";
import { jsonAdapter } from "../src/lib/adapters/json-adapter";
import { loadConfig } from "../src/lib/config";
import { Adapter, Logger } from "../src/types";

describe("Load config tests", () => {
  describe("default adapter", () => {
    it("should return parsed data when schema is valid", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.string().regex(/^\d+$/),
      });
      process.env = {
        HOST: "localhost",
        PORT: "3000",
      };

      // when
      const config = await loadConfig({
        schema,
      });

      // then
      expect(config.HOST).toBe("localhost");
      expect(config.PORT).toBe("3000");
    });

    it("should throw zod error when schema is invalid", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.number(),
      });
      process.env = {
        HOST: "localhost",
        PORT: "3000",
      };

      // when
      // then
      loadConfig({
        schema,
      }).catch((err) => {
        expectZodError(err);
      });
    });
  });
  describe("json adapter", () => {
    const testFilePath = path.join(__dirname, "test.json");

    beforeAll(async () => {
      await writeFile(testFilePath, JSON.stringify({ HOST: "localhost", PORT: "3000" }));
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
        adapters: jsonAdapter({
          path: testFilePath,
        }),
      });

      // then
      expect(config.HOST).toBe("localhost");
      expect(config.PORT).toBe("3000");
    });
    it("should throw zod error when schema is invalid", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.number(),
      });

      // when
      // then
      loadConfig({
        schema,
        adapters: jsonAdapter({
          path: testFilePath,
        }),
      }).catch((err) => {
        expectZodError(err);
      });
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
      loadConfig({
        schema,
        adapters: jsonAdapter({
          path: "not-exist.json",
        }),
      }).catch((err) => {
        expectZodError(err);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Cannot read data from json adapter: Failed to parse / read JSON file at not-exist.json: ENOENT: no such file or directory, open 'not-exist.json'",
        );
      });
    });
  });
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
    it("should throw zod error when schema is invalid", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.number(),
      });

      // when
      // then
      loadConfig({
        schema,
        adapters: dotEnvAdapter({
          path: testFilePath,
        }),
      }).catch((err) => {
        expectZodError(err);
      });
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
      loadConfig({
        schema,
        adapters: dotEnvAdapter({
          path: ".env.not-exist",
        }),
      }).catch((err) => {
        expectZodError(err);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Cannot read data from dotenv adapter: Failed to parse / read .env file at .env.not-exist: ENOENT: no such file or directory, open '.env.not-exist'",
        );
      });
    });
  });
  describe("env adapter", () => {
    it("should return parsed data when schema is valid", async () => {
      // given
      const schema = z.object({
        APP_NAME: z.string(),
        PORT: z.string().regex(/^\d+$/),
      });

      process.env = {
        APP_NAME: "app name",
        PORT: "3000",
      };

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
  });
  describe("multiple adapters", () => {
    const testFilePath = path.join(__dirname, "test.json");

    beforeAll(async () => {
      const testFileData = { APP_NAME: "app name", APP_ID: "1234abcde" };
      await writeFile(testFilePath, JSON.stringify(testFileData));
    });

    afterAll(async () => {
      await unlink(testFilePath);
    });

    it("should return parsed data from adapters when schema is valid", async () => {
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
      const config = await loadConfig({
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
    it("should return parsed data from adapters when schema is valid even if one adapter fails (default logger)", async () => {
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
      const config = await loadConfig({
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
    it("should return parsed data from adapters when schema is valid even if one adapter fails (custom logger)", async () => {
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
        warn: () => {},
      };

      const customLoggerWarnSpy = vi.spyOn(customLogger, "warn");
      const consoleErrorSpy = vi.spyOn(console, "warn");

      // when
      const config = await loadConfig({
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
      process.env = {
        HOST: "localhost",
        PORT: "3000",
        APP_NAME: "app name from env",
        APP_ID: undefined,
      };

      // when
      const config = await loadConfig({
        schema,
        adapters: [
          jsonAdapter({
            path: testFilePath,
          }),
          envAdapter(),
        ],
      });

      // then
      expect(config.HOST).toBe("localhost");
      expect(config.PORT).toBe("3000");
      expect(config.APP_NAME).toBe("app name from env");
      expect(config.APP_ID).toBe("1234abcde");
    });
  });
  describe("custom adapter", () => {
    it("should return parsed data when schema is valid", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        APP_NAME: z.string(),
      });

      const customAdapter: Adapter = {
        name: "custom adapter",
        read: async () => {
          return {
            HOST: "custom host",
            APP_NAME: "custom name",
          };
        },
      };

      // when
      const config = await loadConfig({
        schema,
        adapters: customAdapter,
      });

      // then
      expect(config.HOST).toBe("custom host");
      expect(config.APP_NAME).toBe("custom name");
    });
    it("should return parsed data when schema is valid with multiple custom adapters", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.string().regex(/^\d+$/),
      });

      const customAdapter1 = {
        name: "custom adapter 1",
        read: async () => {
          return {
            HOST: "custom host 1",
            PORT: "1111",
          };
        },
      };

      const customAdapter2 = {
        name: "custom adapter 2",
        read: async () => {
          return {
            HOST: "custom host 2",
            PORT: "2222",
          };
        },
      };

      // when
      const config = await loadConfig({
        schema,
        adapters: [customAdapter1, customAdapter2],
      });

      // then
      expect(config.HOST).toBe("custom host 2");
      expect(config.PORT).toBe("2222");
    });
  });
  describe("callbacks", () => {
    it("should call onError when schema is invalid", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.number(),
      });

      process.env = {
        HOST: "localhost",
        PORT: "3000",
      };

      const onError = vi.fn();

      // when
      await loadConfig({
        schema,
        onError,
      });

      // then
      expect(onError).toHaveBeenCalled();
    });
    it("should call onSuccess when schema is valid", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.string().regex(/^\d+$/),
      });

      process.env = {
        HOST: "localhost",
        PORT: "3000",
      };

      const onSuccess = vi.fn();

      // when
      await loadConfig({
        schema,
        onSuccess,
      });

      // then
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

const expectZodError = (err: unknown) => {
  expect(err).toBeInstanceOf(z.ZodError);
};

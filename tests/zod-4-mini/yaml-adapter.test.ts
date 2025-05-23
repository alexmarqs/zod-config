import { yamlAdapter } from "@/lib/adapters/yaml-adapter";
import { loadConfig } from "@/lib/config";
import type { Logger } from "@/types";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4-mini";
import YAML from "yaml";

describe("yaml adapter", () => {
  const testFilePath = path.join(__dirname, "test-yaml-adapter.yaml");

  beforeAll(async () => {
    await writeFile(testFilePath, YAML.stringify({ HOST: "localhost", PORT: "3000" }));
  });

  afterAll(async () => {
    await unlink(testFilePath);
  });

  it("should return parsed data when schema is valid", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.string(),
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: yamlAdapter({
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
    expect(
      loadConfig({
        schema,
        adapters: yamlAdapter({
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
        adapters: yamlAdapter({
          path: "not-exist.yaml",
        }),
      }),
    ).rejects.toThrowError(z.core.$ZodError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Cannot read data from yaml adapter: Failed to parse / read YAML file at not-exist.yaml: ENOENT: no such file or directory, open 'not-exist.yaml'",
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
        adapters: yamlAdapter({
          path: "not-exist.yaml",
        }),
        logger: customLogger,
      }),
    ).rejects.toThrowError(z.core.$ZodError);

    expect(customLoggerWarnSpy).toHaveBeenCalledWith(
      "Cannot read data from yaml adapter: Failed to parse / read YAML file at not-exist.yaml: ENOENT: no such file or directory, open 'not-exist.yaml'",
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
        adapters: yamlAdapter({
          path: "not-exist.yaml",
          silent: true,
        }),
      }),
    ).rejects.toThrowError(z.core.$ZodError);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

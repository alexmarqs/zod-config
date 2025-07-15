import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { loadConfig, loadConfigSync } from "@/index";
import { jsonAdapter } from "@/lib/adapters/json-adapter";
import { envAdapter } from "@/lib/adapters/env-adapter";
import type { Adapter, SyncAdapter, Logger } from "@/types";

describe("Resolved Config Tests", () => {
  describe("Silent option resolution", () => {
    it("should use global silent option when adapter doesn't specify silent", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.number(),
      });
      const consoleWarnSpy = vi.spyOn(console, "warn");

      // when - global silent is true, adapter doesn't specify silent
      await expect(
        loadConfig({
          schema,
          silent: true,
          adapters: jsonAdapter({
            path: "non-existent.json",
          }),
        }),
      ).rejects.toThrowError(z.core.$ZodError);

      // then - should not log error due to global silent
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should use adapter silent option over global silent option", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.number(),
      });
      const consoleWarnSpy = vi.spyOn(console, "warn");

      // when - global silent is false, adapter silent is true
      await expect(
        loadConfig({
          schema,
          silent: false,
          adapters: jsonAdapter({
            path: "non-existent.json",
            silent: true,
          }),
        }),
      ).rejects.toThrowError(z.core.$ZodError);

      // then - should not log error due to adapter silent override
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should log error when global silent is true but adapter silent is false", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.number(),
      });
      const consoleWarnSpy = vi.spyOn(console, "warn");

      // when - global silent is true, adapter silent is false
      await expect(
        loadConfig({
          schema,
          silent: true,
          adapters: jsonAdapter({
            path: "non-existent.json",
            silent: false,
          }),
        }),
      ).rejects.toThrowError(z.core.$ZodError);

      // then - should log error due to adapter silent override
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Cannot read data from json adapter: Failed to parse / read JSON file at non-existent.json: ENOENT: no such file or directory, open 'non-existent.json'",
      );
    });

    it("should work with sync adapters - global silent option", () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.number(),
      });
      const consoleWarnSpy = vi.spyOn(console, "warn");

      // when - global silent is true, adapter doesn't specify silent
      expect(() =>
        loadConfigSync({
          schema,
          silent: true,
          adapters: jsonAdapter({
            path: "non-existent.json",
          }),
        }),
      ).toThrowError(z.core.$ZodError);

      // then - should not log error due to global silent
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should work with sync adapters - adapter silent override", () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.number(),
      });
      const consoleWarnSpy = vi.spyOn(console, "warn");

      // when - global silent is false, adapter silent is true
      expect(() =>
        loadConfigSync({
          schema,
          silent: false,
          adapters: jsonAdapter({
            path: "non-existent.json",
            silent: true,
          }),
        }),
      ).toThrowError(z.core.$ZodError);

      // then - should not log error due to adapter silent override
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("KeyMatching option resolution", () => {
    it("should use global keyMatching option when adapter doesn't specify keyMatching", async () => {
      // given
      const schema = z.object({
        apiKey: z.string(),
        hostName: z.string(),
      });

      const customAdapter: Adapter = {
        name: "test adapter",
        read: async () => ({
          API_KEY: "secret123",
          HOST_NAME: "localhost",
        }),
      };

      // when - global keyMatching is lenient, adapter doesn't specify keyMatching
      const config = await loadConfig({
        schema,
        keyMatching: "lenient",
        adapters: customAdapter,
      });

      // then - should apply lenient key matching
      expect(config).toEqual({
        apiKey: "secret123",
        hostName: "localhost",
      });
    });

    it("should use adapter keyMatching option over global keyMatching option", async () => {
      // given
      const schema = z.object({
        apiKey: z.string(),
        hostName: z.string(),
      });

      const customAdapter: Adapter = {
        name: "test adapter",
        keyMatching: "strict",
        read: async () => ({
          apiKey: "secret123", // exact match for strict
          hostName: "localhost", // exact match for strict
        }),
      };

      // when - global keyMatching is lenient, adapter keyMatching is strict
      const config = await loadConfig({
        schema,
        keyMatching: "lenient",
        adapters: customAdapter,
      });

      // then - should use strict key matching from adapter
      expect(config).toEqual({
        apiKey: "secret123",
        hostName: "localhost",
      });
    });

    it("should apply lenient key matching when adapter overrides global strict", async () => {
      // given
      const schema = z.object({
        apiKey: z.string(),
        hostName: z.string(),
      });

      const customAdapter: Adapter = {
        name: "test adapter",
        keyMatching: "lenient",
        read: async () => ({
          API_KEY: "secret123", // should be transformed to apiKey
          HOST_NAME: "localhost", // should be transformed to hostName
        }),
      };

      // when - global keyMatching is strict, adapter keyMatching is lenient
      const config = await loadConfig({
        schema,
        keyMatching: "strict",
        adapters: customAdapter,
      });

      // then - should use lenient key matching from adapter
      expect(config).toEqual({
        apiKey: "secret123",
        hostName: "localhost",
      });
    });

    it("should work with sync adapters - keyMatching resolution", () => {
      // given
      const schema = z.object({
        apiKey: z.string(),
        hostName: z.string(),
      });

      const customAdapter: SyncAdapter = {
        name: "test adapter",
        keyMatching: "lenient",
        read: () => ({
          API_KEY: "secret123",
          HOST_NAME: "localhost",
        }),
      };

      // when - global keyMatching is strict, adapter keyMatching is lenient
      const config = loadConfigSync({
        schema,
        keyMatching: "strict",
        adapters: customAdapter,
      });

      // then - should use lenient key matching from adapter
      expect(config).toEqual({
        apiKey: "secret123",
        hostName: "localhost",
      });
    });
  });

  describe("Multiple adapters with different configurations", () => {
    it("should resolve configuration independently for each adapter", async () => {
      // given
      const schema = z.object({
        apiKey: z.string(),
        hostName: z.string(),
        port: z.number(),
      });

      const adapter1: Adapter = {
        name: "adapter1",
        keyMatching: "lenient",
        silent: true,
        read: async () => ({
          API_KEY: "secret123",
          HOST_NAME: "localhost",
        }),
      };

      const adapter2: Adapter = {
        name: "adapter2",
        keyMatching: "strict",
        silent: false,
        read: async () => ({
          port: 3000,
        }),
      };

      // when - each adapter has different configuration
      const config = await loadConfig({
        schema,
        keyMatching: "strict", // global default
        silent: false, // global default
        adapters: [adapter1, adapter2],
      });

      // then - should merge data from both adapters with their respective configurations
      expect(config).toEqual({
        apiKey: "secret123", // from adapter1 with lenient key matching
        hostName: "localhost", // from adapter1 with lenient key matching
        port: 3000, // from adapter2 with strict key matching
      });
    });

    it("should handle mixed sync and async adapters with different configurations", async () => {
      // given
      const schema = z.object({
        apiKey: z.string(),
        hostName: z.string(),
        port: z.number(),
      });

      const syncAdapter: SyncAdapter = {
        name: "sync adapter",
        keyMatching: "lenient",
        read: () => ({
          API_KEY: "secret123",
        }),
      };

      const asyncAdapter: Adapter = {
        name: "async adapter",
        keyMatching: "strict",
        read: async () => ({
          hostName: "localhost",
          port: 3000,
        }),
      };

      // when
      const config = await loadConfig({
        schema,
        keyMatching: "strict", // global default
        adapters: [syncAdapter, asyncAdapter],
      });

      // then
      expect(config).toEqual({
        apiKey: "secret123", // from sync adapter with lenient key matching
        hostName: "localhost", // from async adapter with strict key matching
        port: 3000, // from async adapter with strict key matching
      });
    });
  });

  describe("Default values when no configuration is provided", () => {
    it("should use strict keyMatching as default when no global or adapter config is provided", async () => {
      // given
      const schema = z.object({
        apiKey: z.string(),
      });

      const customAdapter: Adapter = {
        name: "test adapter",
        read: async () => ({
          apiKey: "secret123", // exact match for strict
        }),
      };

      // when - no keyMatching configuration provided
      const config = await loadConfig({
        schema,
        adapters: customAdapter,
      });

      // then - should use strict as default
      expect(config).toEqual({
        apiKey: "secret123",
      });
    });

    it("should use undefined as default for silent when no configuration is provided", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.string(),
      });
      const consoleWarnSpy = vi.spyOn(console, "warn");

      const failingAdapter: Adapter = {
        name: "failing adapter",
        read: async () => {
          throw new Error("Test error");
        },
      };

      // when - no silent configuration provided, should log errors by default
      await expect(
        loadConfig({
          schema,
          adapters: [
            failingAdapter,
            envAdapter({ customEnv: { HOST: "localhost", PORT: "3000" } }),
          ],
        }),
      ).resolves.toEqual({
        HOST: "localhost",
        PORT: "3000",
      });

      // then - should log error since silent is undefined (defaults to false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Cannot read data from failing adapter: Test error",
      );
    });
  });

  describe("Custom logger with resolved config", () => {
    it("should use custom logger with resolved silent configuration", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.string(),
      });

      const customLogger: Logger = {
        warn: vi.fn(),
      };

      const failingAdapter: Adapter = {
        name: "failing adapter",
        silent: false, // explicitly not silent
        read: async () => {
          throw new Error("Test error");
        },
      };

      // when - global silent is true, but adapter overrides to false
      await expect(
        loadConfig({
          schema,
          silent: true,
          logger: customLogger,
          adapters: [
            failingAdapter,
            envAdapter({ customEnv: { HOST: "localhost", PORT: "3000" } }),
          ],
        }),
      ).resolves.toEqual({
        HOST: "localhost",
        PORT: "3000",
      });

      // then - should use custom logger due to adapter silent override
      expect(customLogger.warn).toHaveBeenCalledWith(
        "Cannot read data from failing adapter: Test error",
      );
    });
  });
});

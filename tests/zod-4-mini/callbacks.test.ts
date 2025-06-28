import { loadConfig } from "@/lib/config";
import { loadConfigSync } from "@/lib/config-sync";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4-mini";

describe("callbacks", () => {
  describe("loadConfig", () => {
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
        PORT: z.string().check(z.regex(/^\d+$/)),
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

  describe("loadConfigSync", () => {
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
      loadConfigSync({
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
        PORT: z.string().check(z.regex(/^\d+$/)),
      });

      process.env = {
        HOST: "localhost",
        PORT: "3000",
      };

      const onSuccess = vi.fn();

      // when
      loadConfigSync({
        schema,
        onSuccess,
      });

      // then
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

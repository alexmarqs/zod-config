import { loadConfig } from "@/lib/config";
import { loadConfigSync } from "@/lib/config-sync";
import type { Adapter } from "@/types";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

describe("custom adapter", () => {
  describe("loadConfig", () => {
    it("should return parsed data when schema is valid with both async and sync custom adapters", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.string().regex(/^\d+$/),
      });

      const customAdapter1 = {
        name: "custom async adapter 1",
        read: async () => {
          return {
            HOST: "custom host 1",
            PORT: "1111",
          };
        },
      };

      const customAdapter2 = {
        name: "custom sync adapter 2",
        read: () => {
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

  describe("loadConfigSync", () => {
    it("should return parsed data when schema is valid with both sync custom adapters", () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.string().regex(/^\d+$/),
      });

      const customAdapter1 = {
        name: "custom sync adapter 1",
        read:  () => {
          return {
            HOST: "custom host 1",
            PORT: "1111",
          };
        },
      };

      const customAdapter2 = {
        name: "custom sync adapter 2",
        read: () => {
          return {
            HOST: "custom host 2"
          };
        },
      };

      // when
      const config = loadConfigSync({
        schema,
        adapters: [customAdapter1, customAdapter2],
      });

      // then
      expect(config.HOST).toBe("custom host 2");
      expect(config.PORT).toBe("1111");
    });
    it("should throw an error when an async adapter is provided", async () => {
      // given
      const schema = z.object({
        HOST: z.string(),
        PORT: z.string().regex(/^\d+$/),
      });

      const customAdapter1: Adapter = {
        name: "custom adapter 1",
        read: async () => {
          return {
            HOST: "custom host 1",
            PORT: "1111",
          };
        },
      };

      expect(() =>
        loadConfigSync({
          schema,
          adapters: [customAdapter1],
        }),
      ).toThrowError(
        "Data returned from custom adapter 1 is a Promise. Use loadConfig instead of loadConfigSync to use asynchronous adapters.",
      );
    });
  });
});

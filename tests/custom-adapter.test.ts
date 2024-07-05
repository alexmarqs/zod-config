import { loadConfig } from "@/lib/config";
import type { Adapter } from "@/types";
import {} from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { z } from "zod";

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

import { envAdapter } from "@/lib/adapters/env-adapter";
import { loadConfig } from "@/lib/config";
import {} from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4-mini";

describe("env adapter", () => {
  it("should return parsed data when schema is valid", async () => {
    // given
    const schema = z.object({
      APP_NAME: z.string(),
      PORT: z.string().check(z.regex(/^\d+$/)),
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
      PORT: z.string().check(z.regex(/^\d+$/)),
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

    process.env = {
      APP_NAME: "app name",
      PORT: "3000",
    };

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
});

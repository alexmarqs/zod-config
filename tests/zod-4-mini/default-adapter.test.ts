import { loadConfig } from "@/lib/config";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

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
    await expect(
      loadConfig({
        schema,
      }),
    ).rejects.toThrowError(z.core.$ZodError);
  });
});

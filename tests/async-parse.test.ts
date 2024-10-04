import { loadConfig } from "@/lib/config";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Async schema parsing", () => {
  it("should parse correclty the schema", async () => {
    // given
    const schemaWithAsyncOps = z.object({
      PROP_1: z.string().transform(async (val) => {
        return val.toUpperCase();
      }),
      PROP_2: z.string().refine(async (val) => val.length <= 8),
    });

    process.env = {
      PROP_1: "hello",
      PROP_2: "world",
    };

    // when
    const data = await loadConfig({
      schema: schemaWithAsyncOps,
    });

    // then
    expect(data).toEqual({
      PROP_1: "HELLO",
      PROP_2: "world",
    });
  });
});

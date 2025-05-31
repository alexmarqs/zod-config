import { loadConfig } from "@/index";
import { inlineAdapter } from "../fixtures/utils-fixtures";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod/v3";

describe("type checking zod v3", () => {
  it("should infer the correct type", async () => {
    const schema = z.object({
      server: z.object({
        port: z.number(),
      }),
    });

    const config = await loadConfig({
      schema,
      adapters: [
        inlineAdapter({
          server: { port: 3000 },
        }),
      ],
    });

    expectTypeOf(config).toEqualTypeOf<z.infer<typeof schema>>();
  });
});

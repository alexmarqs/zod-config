import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { loadConfig } from "@/index";

describe("loadConfig()", () => {
    it("should perform lenient matching", async () => {
        const MyConfig = z.object({
            foo: z.object({
                enabled: z.boolean().default(true),
                nestedProp: z.string(),
                OTHER_PROP: z.string(),
            }),
        });

        const mockedLogger = { warn: vi.fn() };
        const config = await loadConfig({
            logger: mockedLogger,
            schema: MyConfig,
            lenientMatching: true,
            adapters: [
                inlineAdapter({ FOO: { NESTED_PROP: "Foo!", otherProp: "Test" } }),
            ],
        });

        expect(config).toEqual({
            foo: {
                enabled: true,
                nestedProp: "Foo!",
                OTHER_PROP: "Test",
            },
        });
    });
});

// candidate for the library?
function inlineAdapter(source: Record<string, unknown>) {
    return { name: 'inline', read: () => source };
}

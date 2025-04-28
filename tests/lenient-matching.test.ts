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

    it("lenient matching should preserve order of adapter", async () => {
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
                inlineAdapter({ FOO: { nestedProp: "Foo!", otherProp: "Test" } }),
                inlineAdapter({ FOO: { NESTED_PROP: "Override1", otherProp: "Override1" } }),
                inlineAdapter({ foo: { NESTED_PROP: "Override2", otherProp: "Override2" } }),
            ],
        });

        expect(config).toEqual({
            foo: {
                enabled: true,
                nestedProp: "Override2",
                OTHER_PROP: "Override2",
            },
        });
    });
});

// candidate for the library?
function inlineAdapter(source: Record<string, unknown>) {
    return { name: 'inline', read: () => source };
}

import { rm, writeFile, mkdir } from "node:fs/promises";
import { afterEach, vi, describe, it, beforeEach, beforeAll, afterAll, expect } from "vitest";
import { type AnyZodObject, z } from "zod";

import { directoryAdapter } from "@/lib/adapters/directory-adapter";
import { scriptAdapter } from "@/lib/adapters/script-adapter";
import * as variables from "@/lib/adapters/directory-adapter/variables";
import { loadConfig } from "@/index";

vi.mock("@/lib/adapters/directory-adapter/variables", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/adapters/directory-adapter/variables")>();
  return {
    ...original,
    resolveConfigResolutionVariables: vi.fn(() => ({
      deploymentName: "development",
      instanceName: null,
      hostname: "localhost",
      shortHostname: "localhost",
    })),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

type DirectoryTestContext = {
  schema: AnyZodObject;
  directories: string[];
  files: Array<{ fileName: string; content: string }>;
  environments: Array<{
    resolvedVariables: Partial<variables.ConfigResolutionVariables>;
    expected: unknown;
  }>;
};

describe.each<DirectoryTestContext>([
  {
    schema: z.object({
      foo: z.string(),
      bar: z.number(),
      baz: z.object({
        qux: z.string(),
        corge: z.string(),
      }),
    }),
    directories: ["test-config"],
    files: [
      {
        fileName: "test-config/default.ts",
        content: `export default { foo: "hello", bar: 10, baz: { qux: "world", corge: "!" } };`,
      },
      {
        fileName: "test-config/development.ts",
        content: `export default { foo: "hiya" };`,
      },
      {
        fileName: "test-config/local-development.ts",
        content: `export default { baz: { qux: "hehee" } };`,
      },
    ],
    environments: [
      {
        resolvedVariables: {
          deploymentName: "development",
        },
        expected: { foo: "hiya", bar: 10, baz: { qux: "hehee", corge: "!" } },
      },
      {
        resolvedVariables: {
          deploymentName: "production",
        },
        expected: { foo: "hello", bar: 10, baz: { qux: "world", corge: "!" } },
      },
    ],
  },
])("Directory adapter tests", ({ schema, directories, files, environments }) => {
  describe.each(environments)("Environment-specific tests", ({ resolvedVariables, expected }) => {
    beforeEach(() => {
      vi.spyOn(variables, "resolveConfigResolutionVariables").mockReturnValue({
        deploymentName: "development",
        instanceName: null,
        hostname: "localhost",
        shortHostname: "localhost",
        ...resolvedVariables,
      });
    });

    it("should return parsed data when it matches schema", async () => {
      // given

      // when
      const config = await loadConfig({
        schema,
        adapters: directoryAdapter({
          paths: directories,
          adapters: [
            {
              extensions: [".ts"],
              adapterFactory: (filePath: string) =>
                scriptAdapter({
                  path: filePath,
                }),
            },
          ],
        }),
      });

      // then
      expect(config).toEqual(expected);
    });
  });

  beforeAll(async () => {
    await Promise.all(directories.map(async (directory) => await mkdir(directory)));
    await Promise.all(
      files.map(async ({ fileName, content }) => await writeFile(fileName, content)),
    );
  });

  afterAll(async () => {
    await Promise.all(
      directories.map(async (directory) => await rm(directory, { recursive: true })),
    );
  });
});

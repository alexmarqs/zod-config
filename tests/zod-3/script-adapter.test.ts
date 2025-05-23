import { scriptAdapter } from "@/lib/adapters/script-adapter";
import { loadConfig } from "@/lib/config";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod/v3";

describe.each([
  {
    fileName: "test.ts",
    content: `export default { HOST: "localhost", PORT: "3000" };`,
    expected: { HOST: "localhost", PORT: "3000" },
  },
  {
    fileName: "test.js",
    content: `module.exports = { HOST: "localhost", PORT: "9000" };`,
    expected: { HOST: "localhost", PORT: "9000" },
  },
  {
    fileName: "test.json",
    content: `{"HOST":"localhost","PORT":"3000"}`,
    expected: { HOST: "localhost", PORT: "3000" },
  },
])("script adapter", ({ fileName, content, expected }) => {
  const testFilePath = path.join(__dirname, fileName);

  beforeAll(async () => {
    await writeFile(testFilePath, content);
  });

  afterAll(async () => {
    await unlink(testFilePath);
  });

  it("should return parsed data when schema is valid", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.string().regex(/^\d+$/),
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: scriptAdapter({
        path: testFilePath,
      }),
    });

    // then
    expect(config.HOST).toBe(expected.HOST);
    expect(config.PORT).toBe(expected.PORT);
  });
});

describe("combining multiple script adapters", () => {
  const testFilePath1 = path.join(__dirname, "test-multiple-script-adapter1.ts");
  const testFilePath2 = path.join(__dirname, "test-multiple-script-adapter2.ts");

  beforeAll(async () => {
    const fileContent1 = `export default { 
      HOST: "app name", 
      PORT: "1111", 
      TEST_MAP: new Map([["key", "value"], ["key2", "value2"]]),
      TEST_RECORD: { key: "key", value: "value1" }
    }`;
    const fileContent2 = `export default { 
      HOST: "app name2", 
      PORT: "1234", 
      TEST_MAP: new Map([["key", "value2"]]),
      TEST_RECORD: { key: "key2" }
    }`;

    await Promise.all([
      writeFile(testFilePath1, fileContent1),
      writeFile(testFilePath2, fileContent2),
    ]);
  });

  afterAll(async () => {
    await Promise.all([unlink(testFilePath1), unlink(testFilePath2)]);
  });

  it("should successfully parse, merge and return type-safe data", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.string().regex(/^\d+$/),
      TEST_RECORD: z.object({
        key: z.string(),
        value: z.string(),
      }),
      TEST_MAP: z.map(z.string(), z.string()).optional(),
    });

    // when
    const config = await loadConfig({
      schema,
      adapters: [scriptAdapter({ path: testFilePath1 }), scriptAdapter({ path: testFilePath2 })],
    });

    // then
    expect(config.HOST).toBe("app name2"); // second adapter overrides the first one
    expect(config.PORT).toBe("1234"); // second adapter overrides the first one
    expect(config.TEST_MAP).toEqual(new Map([["key", "value2"]])); // MAP is not mergeable so only the last one is loaded
    expect(config.TEST_RECORD).toEqual({
      key: "key2", // from second adapter
      value: "value1", // preserved from first adapter
    }); // records are merged between adapters
  });
});

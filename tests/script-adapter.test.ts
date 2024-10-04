import { scriptAdapter } from "@/lib/adapters/script-adapter";
import { loadConfig } from "@/lib/config";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

describe.each([
  {
    fileName: "test.ts",
    content: `export default { HOST: "localhost", PORT: "3000" } satisfies Record<string, string>;`,
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

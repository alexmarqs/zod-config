import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "index": "src/index.ts",
      "json-adapter": "src/lib/adapters/json-adapter/index.ts",
      "env-adapter": "src/lib/adapters/env-adapter/index.ts",
    },
    format: ["cjs", "esm"],
    target: "node14",
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    dts: true,
    outDir: "dist",
  }
]);

import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "json-adapter": "src/lib/adapters/json-adapter/index.ts",
      "json5-adapter": "src/lib/adapters/json5-adapter/index.ts",
      "env-adapter": "src/lib/adapters/env-adapter/index.ts",
      "dotenv-adapter": "src/lib/adapters/dotenv-adapter/index.ts",
      "script-adapter": "src/lib/adapters/script-adapter/index.ts",
      "directory-adapter": "src/lib/adapters/directory-adapter/index.ts",
      "yaml-adapter": "src/lib/adapters/yaml-adapter/index.ts",
      "toml-adapter": "src/lib/adapters/toml-adapter/index.ts",
    },
    format: ["cjs", "esm"],
    target: "node14",
    splitting: false,
    sourcemap: false,
    clean: true,
    minify: true,
    dts: true,
    outDir: "dist",
  },
]);

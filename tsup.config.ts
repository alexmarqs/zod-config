import { defineConfig } from "tsup";

export default defineConfig([
  // Main/common entry
  {
    entry: [
      "src/index.ts"
    ],
    format: ["cjs", "esm"],
    target: "node14", // support Node.js 14 and above
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    dts: true,
    outDir: "dist",
  },
  // Adapters
  {
    entry: [
      "src/lib/adapters/json-adapter/index.ts",
    ],
    format: ["cjs", "esm"],
    target: "node14", // support Node.js 14 and above
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    dts: true,
    outDir: "json-adapter/",
  },
  {
    entry: [
      "src/lib/adapters/env-adapter/index.ts",
    ],
    format: ["cjs", "esm"],
    target: "node14", // support Node.js 14 and above
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    dts: true,
    outDir: "env-adapter/",
  },
]);

import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/lib/adapters/json-adapter/index.ts",
    "src/lib/adapters/env-adapter/index.ts",
  ],
  format: ["cjs", "esm"],
  target: "node14", // support Node.js 14 and above
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  dts: true,
  outDir: "dist",
});

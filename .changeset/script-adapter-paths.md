---
"zod-config": minor
---

Script adapter: fall back to jiti, when it's installed, for TypeScript files that native `import()` can't load, resolve relative paths from the working directory, load `.json` files without the import attribute error from Node, and read the config correctly when tsx or jiti compiles the file to CommonJS.

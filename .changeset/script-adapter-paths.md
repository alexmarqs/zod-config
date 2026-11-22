---
"zod-config": minor
---

Script adapter: load TypeScript files with jiti when it's installed (otherwise Node's built-in type stripping), resolve relative paths from the working directory, load `.json` files without the import attribute error from Node, and read the config correctly when tsx or jiti compiles the file to CommonJS.

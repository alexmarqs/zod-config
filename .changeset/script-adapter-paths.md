---
"zod-config": minor
---

Script adapter: fall back to jiti, when it's installed, for TypeScript files that native `import()` can't load (older Node, enums, extensionless imports, path aliases). Also fixes relative paths (now resolved from the working directory), `.json` files on plain Node, `.cts` files using `module.exports`, and configs loaded while the app runs under tsx or `node --import jiti/register`.

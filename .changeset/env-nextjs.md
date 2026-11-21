---
"zod-config": minor
---

Add `loadEnvConfig()`, exported from `zod-config/nextjs` (Next.js preset) and from `zod-config` (any framework, with `clientPrefix`): synchronous, type-safe environment validation with separate server and client schemas, public-prefix enforcement, and runtime protection against reading server variables in the browser. With `strict: true`, the generic export also type-checks that `runtimeEnv` lists every server and client key.

Add build-time validation of the same env file: the `zodConfigEnv()` Vite plugin, exported from `zod-config/vite`, stops `vite dev` and `vite build` on an invalid environment, and `withZodConfigEnv(nextConfig)`, exported from `zod-config/nextjs/config`, does the same for the Next.js config. Both find `env.ts` in `src/` or the project root and run it with `jiti`. `vite` and `jiti` are new optional peer dependencies: `vite` is only needed for `zod-config/vite`, `jiti` only for the plugin and the wrapper.

Zod 3 is no longer imported at runtime, so it is not bundled for Zod 4 users.

Zod 3 support is deprecated and will be removed in the next major version.

The `zod` peer range is now `^3.25.1 || ^4.0.0`: Zod 3.25.0 is missing the `zod/v4/core` files and never worked.

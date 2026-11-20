---
"zod-config": minor
---

Add `loadEnvConfig()`, exported from `zod-config/nextjs` (Next.js preset) and from `zod-config` (any framework, with `clientPrefix`): synchronous, type-safe environment validation with separate server and client schemas, public-prefix enforcement, and runtime protection against reading server variables in the browser. With `strict: true`, the generic export also type-checks that `runtimeEnv` lists every client key.

Zod 3 is no longer imported at runtime, so it is not bundled for Zod 4 users.

Zod 3 support is deprecated and will be removed in the next major version.

The `zod` peer range is now `^3.25.1 || ^4.0.0`: Zod 3.25.0 is missing the `zod/v4/core` files and never worked.

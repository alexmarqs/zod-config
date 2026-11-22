# zod-config

## 1.6.0

### Minor Changes

- 92135c5: Add `loadEnvConfig()`, exported from `zod-config/nextjs` (Next.js preset) and from `zod-config` (any framework, with `clientPrefix`): synchronous, type-safe environment validation with separate server and client schemas, public-prefix enforcement, and runtime protection against reading server variables in the browser. A `shared` group declares variables read on both sides without the public prefix, such as `NODE_ENV`. With `strict: true`, the generic export also type-checks that `runtimeEnv` lists every declared key.

  Add build-time validation of the same env file: the `zodConfigEnv()` Vite plugin, exported from `zod-config/vite`, stops `vite dev` and `vite build` on an invalid environment, and `withZodConfigEnv(nextConfig)`, exported from `zod-config/nextjs/config`, does the same for the Next.js config. Both find `env.ts` in `src/` or the project root and run it with `jiti`. `vite` and `jiti` are new optional peer dependencies: `vite` is only needed for `zod-config/vite`, `jiti` only for the plugin and the wrapper.

  Zod 3 is no longer imported at runtime, so it is not bundled for Zod 4 users.

  Zod 3 support is deprecated and will be removed in the next major version.

  The `zod` peer range is now `^3.25.1 || ^4.0.0`: Zod 3.25.0 is missing the `zod/v4/core` files and never worked.

## 1.5.1

### Patch Changes

- 69c5595: Skip the keys `__proto__` and `constructor` when merging adapter data, and nested keys with a `__proto__` or `constructor` segment when a nesting separator is used, in line with what other merge libraries do. Inherited property names such as `toString` no longer cause a false "nested key conflict" error.

## 1.5.0

### Minor Changes

- e2fb51e: Add `aws-secrets-manager-adapter` and `aws-ssm-adapter` to load configuration from AWS Secrets Manager secrets and SSM Parameter Store parameters (optional peer dependencies `@aws-sdk/client-secrets-manager` and `@aws-sdk/client-ssm`, `^3.428.0`).

# zod-config

## 1.5.1

### Patch Changes

- 69c5595: Skip the keys `__proto__` and `constructor` when merging adapter data, and nested keys with a `__proto__` or `constructor` segment when a nesting separator is used, in line with what other merge libraries do. Inherited property names such as `toString` no longer cause a false "nested key conflict" error.

## 1.5.0

### Minor Changes

- e2fb51e: Add `aws-secrets-manager-adapter` and `aws-ssm-adapter` to load configuration from AWS Secrets Manager secrets and SSM Parameter Store parameters (optional peer dependencies `@aws-sdk/client-secrets-manager` and `@aws-sdk/client-ssm`, `^3.428.0`).

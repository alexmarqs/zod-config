---
"zod-config": patch
---

Skip the keys `__proto__` and `constructor` when merging adapter data, and nested keys with a `__proto__`, `constructor` or `prototype` segment when a nesting separator is used, in line with what other merge libraries do. Inherited property names such as `toString` no longer cause a false "nested key conflict" error.

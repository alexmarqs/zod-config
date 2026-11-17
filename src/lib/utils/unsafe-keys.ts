/**
 * Keys that must never be written or merged from external data, to prevent prototype pollution.
 *
 * `prototype` is not in the list on purpose: with `constructor` blocked and own-property checks
 * in place it cannot reach a real prototype, and it is a plausible config key or path segment.
 */
const UNSAFE_KEYS = new Set(["__proto__", "constructor"]);

/**
 * Whether a key, or a segment of a nested key path, must be skipped.
 */
export const isUnsafeKey = (key: string) => UNSAFE_KEYS.has(key);

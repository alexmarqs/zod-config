/**
 * Keys that must never be written or merged from external data, to prevent prototype pollution.
 */
const UNSAFE_MERGE_KEYS = new Set(["__proto__", "constructor"]);
const UNSAFE_PATH_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Whether a key of an object coming from an adapter must be skipped when copying or merging it.
 */
export const isUnsafeKey = (key: string) => UNSAFE_MERGE_KEYS.has(key);

/**
 * Whether a segment of a nested key path (e.g. `a.b.c` split by the nesting separator) must be
 * rejected. Paths also block `prototype`, since `constructor.prototype.x` is another way in.
 */
export const isUnsafePathKey = (key: string) => UNSAFE_PATH_KEYS.has(key);

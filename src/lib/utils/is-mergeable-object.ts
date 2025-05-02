export function isMergeableObject(item: unknown): item is Partial<Record<string, unknown>> {
    if (!item) return false;
    if (typeof item !== "object") return false;
    // ES6 class instances, Maps, Sets, Arrays, etc. are not considered records
    if (Object.getPrototypeOf(item) === Object.prototype) return true;
    // Some library/Node.js functions return records with null prototype
    if (Object.getPrototypeOf(item) === null) return true;
    return false;
}

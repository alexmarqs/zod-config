/**
 * Returns a safe process.env object by default to ensure we have a plain object to avoid prototype issues.
 */
export const getSafeProcessEnv = () => {
  return typeof process !== "undefined" ? { ...process.env } : {};
};

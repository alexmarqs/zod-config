export const inlineAdapter = (source: Record<string, unknown>) => {
  return { name: "inline", read: async () => source };
};

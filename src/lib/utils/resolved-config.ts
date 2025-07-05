import type { Adapter, KeyMatching, SyncAdapter } from "@/types";

/**
 * Get the resolved config for an adapter.
 * This is used to resolve the config for an adapter based on the global config and the adapter config.
 * The adapter config will override the global config if it is provided.
 */
export const getResolvedConfig = (
  adapter: Adapter | SyncAdapter,
  keyMatching?: KeyMatching,
  silent?: boolean,
) => {
  return {
    keyMatching: adapter.keyMatching ?? keyMatching ?? "strict",
    silent: adapter.silent ?? silent,
  };
};

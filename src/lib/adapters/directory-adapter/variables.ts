import { hostname as osHostname } from "node:os";

/**
 * Inspects the `NODE_CONFIG_ENV` and `NODE_ENV` environment variables
 * to determine the deployment name to use when deciding which configuration
 * files to load.
 * Defaults to `"development"` when no value is specified.
 */
export function resolveDeploymentName(): string {
  const { NODE_CONFIG_ENV, NODE_ENV } = process.env;

  if (NODE_CONFIG_ENV !== undefined) {
    return NODE_CONFIG_ENV;
  }

  if (NODE_ENV !== undefined) {
    return NODE_ENV;
  }

  return "development";
}

/**
 * Inspects the `NODE_APP_INSTANCE` environment variable to determine the
 * instance name to use when deciding which configuration files to load.
 * Defaults to `null` when no value is specified.
 */
export function resolveInstanceName(): string | null {
  const { NODE_APP_INSTANCE } = process.env;

  if (NODE_APP_INSTANCE !== undefined) {
    return NODE_APP_INSTANCE;
  }

  return null;
}

/**
 * Inspects the `HOST`, `HOSTNAME` environment variables and `os.hostname()`
 * to determine the hostname to use when deciding which configuration files to load.
 */
export function resolveHostname(): string {
  const { HOST, HOSTNAME } = process.env;

  if (HOST !== undefined) {
    return HOST;
  }

  if (HOSTNAME !== undefined) {
    return HOSTNAME;
  }

  return osHostname();
}

/**
 * Truncates the value returned from `getHostname` from the first dot (`.`) character
 * to determine the 'short hostname' to use when deciding which configuration files.
 *
 * @see {resolveHostname}
 */
export function resolveShortHostname(): string {
  const hostname = resolveHostname();
  const dotIndex = hostname.indexOf(".");
  if (dotIndex === -1) return hostname;
  return hostname.substring(0, dotIndex);
}

export type ConfigResolutionVariables = {
  deploymentName: string;
  instanceName: string | null;
  hostname: string;
  shortHostname: string;
};

export function resolveConfigResolutionVariables() {
  return {
    deploymentName: resolveDeploymentName(),
    instanceName: resolveInstanceName(),
    hostname: resolveHostname(),
    shortHostname: resolveShortHostname(),
  };
}

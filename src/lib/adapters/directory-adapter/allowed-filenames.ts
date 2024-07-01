import { resolveConfigResolutionVariables } from "./variables";

/**
 * @see {https://github.com/node-config/node-config/wiki/Configuration-Files#file-load-order}
 */
export function getAllowedFilenames(): string[] {
  const { instanceName, deploymentName, shortHostname, hostname } =
    resolveConfigResolutionVariables();

  if (instanceName === null) {
    return [
      "default",
      deploymentName,
      shortHostname,
      `${shortHostname}-${deploymentName}`,
      hostname,
      `${hostname}-${deploymentName}`,
      "local",
      `local-${deploymentName}`,
    ];
  }

  return [
    "default",
    `default-${instanceName}`,
    deploymentName,
    `${deploymentName}-${instanceName}`,
    shortHostname,
    `${shortHostname}-${deploymentName}`,
    `${shortHostname}-${instanceName}`,
    `${shortHostname}-${deploymentName}-${instanceName}`,
    hostname,
    `${hostname}-${deploymentName}`,
    `${hostname}-${instanceName}`,
    `${hostname}-${deploymentName}-${instanceName}`,
    "local",
    `local-${deploymentName}`,
    `local-${instanceName}`,
    `local-${deploymentName}-${instanceName}`,
  ];
}

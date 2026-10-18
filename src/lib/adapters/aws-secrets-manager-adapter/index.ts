import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData } from "../../utils";

export type AwsSecretsManagerAdapterProps = BaseAdapterProps & {
  /**
   * Name or ARN of the secret.
   */
  secretId: string;
  /**
   * Client to use. Defaults to a shared client that resolves region and credentials
   * through the AWS SDK default chain.
   */
  client?: SecretsManagerClient;
  /**
   * Expose the raw secret value (as a string) under this key instead of merging its JSON entries.
   * Parse it in the schema if needed, e.g. `z.string().transform(JSON.parse)`.
   */
  key?: string;
};

let defaultClient: SecretsManagerClient | undefined;

const getDefaultClient = () => {
  defaultClient ??= new SecretsManagerClient({});
  return defaultClient;
};

const ADAPTER_NAME = "aws secrets manager adapter";

export const awsSecretsManagerAdapter = ({
  secretId,
  client,
  key,
  regex,
  silent,
  keyMatching,
  transform,
}: AwsSecretsManagerAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const response = await (client ?? getDefaultClient()).send(
          new GetSecretValueCommand({ SecretId: secretId }),
        );

        const raw =
          response.SecretString ||
          (response.SecretBinary && new TextDecoder().decode(response.SecretBinary));

        const data = raw ? (key ? { [key]: raw } : JSON.parse(raw) || {}) : {};

        return filteredData(data, { regex });
      } catch (error) {
        throw new Error(
          `Failed to read AWS secret "${secretId}": ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    },
    silent,
    keyMatching,
    transform,
  };
};

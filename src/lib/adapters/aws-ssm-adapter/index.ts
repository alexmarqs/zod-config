import { GetParameterCommand, GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { Adapter, BaseAdapterProps } from "../../../types";
import { filteredData, parseJsonObject } from "../../utils";

type ParameterSource =
  | {
      /**
       * Name or ARN of a single parameter. SecureString parameters are decrypted.
       */
      name: string;
      /**
       * Expose the raw parameter value (as a string) under this key instead of merging its JSON entries.
       * Parse it in the schema if needed, e.g. `z.string().transform(JSON.parse)`.
       */
      key?: string;
      path?: never;
    }
  | {
      /**
       * Load every parameter under this path (recursively). The path is stripped from the
       * parameter names and sub-paths become nested objects, e.g. `/app/prod/db/HOST` with
       * path `/app/prod` becomes `{ db: { HOST } }`. SecureString parameters are decrypted.
       * `regex` is matched against the stripped names before nesting (e.g. `db/HOST`).
       */
      path: string;
      name?: never;
      key?: never;
    };

export type AwsSsmAdapterProps = BaseAdapterProps &
  ParameterSource & {
    /**
     * Client to use. Defaults to a shared client that resolves region and credentials
     * through the AWS SDK default chain.
     */
    client?: SSMClient;
  };

let defaultClient: SSMClient | undefined;

const getDefaultClient = () => {
  defaultClient ??= new SSMClient({});
  return defaultClient;
};

const ADAPTER_NAME = "aws ssm adapter";

const readParameter = async (client: SSMClient, name: string, key?: string) => {
  const response = await client.send(new GetParameterCommand({ Name: name, WithDecryption: true }));

  const raw = response.Parameter?.Value;

  if (!raw) return {};

  if (key) return { [key]: raw };

  return parseJsonObject(raw);
};

const readPath = async (client: SSMClient, path: string) => {
  // SSM paths have no trailing slash (except the root "/")
  const normalizedPath = path === "/" ? "/" : path.replace(/\/+$/, "");
  const prefix = normalizedPath === "/" ? "/" : `${normalizedPath}/`;
  const data: Record<string, string> = {};
  let nextToken: string | undefined;

  do {
    const response = await client.send(
      new GetParametersByPathCommand({
        Path: normalizedPath,
        Recursive: true,
        WithDecryption: true,
        NextToken: nextToken,
      }),
    );

    for (const { Name, Value } of response.Parameters ?? []) {
      if (Name?.startsWith(prefix) && Value !== undefined) {
        data[Name.slice(prefix.length)] = Value;
      }
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return data;
};

export const awsSsmAdapter = ({
  name,
  path,
  client,
  key,
  regex,
  silent,
  keyMatching,
  transform,
}: AwsSsmAdapterProps): Adapter => {
  return {
    name: ADAPTER_NAME,
    read: async () => {
      try {
        const ssmClient = client ?? getDefaultClient();

        const data =
          path !== undefined
            ? await readPath(ssmClient, path)
            : await readParameter(ssmClient, name, key);

        return filteredData(data, { regex });
      } catch (error) {
        throw new Error(
          `Failed to read AWS SSM ${
            path !== undefined ? `path "${path}"` : `parameter "${name}"`
          }: ${error instanceof Error ? error.message : error}`,
        );
      }
    },
    silent,
    keyMatching,
    transform,
    nestingSeparator: path !== undefined ? "/" : undefined,
  };
};

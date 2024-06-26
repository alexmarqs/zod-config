import type { z } from "zod";

export type Adapter = {
  name: string;
  read: () => Promise<z.infer<z.AnyZodObject>>;
  silent?: boolean;
};

export type Config<T extends z.AnyZodObject = z.AnyZodObject> = {
  schema: T;
  adapters?: Adapter[] | Adapter;
  onSuccess?: (data: z.infer<T>) => void;
  onError?: (error: z.ZodError<z.infer<T>>) => void;
  logger?: Logger;
};

export type Logger = {
  warn: (message: string) => void;
};

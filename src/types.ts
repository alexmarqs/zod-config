import { z } from "zod";

export type Adapter = {
  name: string;
  read: () => Promise<z.infer<z.AnyZodObject>>;
};

export type Config<T extends z.AnyZodObject = z.AnyZodObject> = {
  schema: T;
  adapters?: Adapter[] | Adapter;
  onSuccess?: (data: z.infer<T>) => void;
  onError?: (error: z.ZodError<z.infer<T>>) => void;
};

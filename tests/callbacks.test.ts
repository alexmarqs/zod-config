import { loadConfig } from "@/lib/config";
import {} from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

describe("callbacks", () => {
  it("should call onError when schema is invalid", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.number(),
    });

    process.env = {
      HOST: "localhost",
      PORT: "3000",
    };

    const onError = vi.fn();

    // when
    await loadConfig({
      schema,
      onError,
    });

    // then
    expect(onError).toHaveBeenCalled();
  });
  it("should call onSuccess when schema is valid", async () => {
    // given
    const schema = z.object({
      HOST: z.string(),
      PORT: z.string().regex(/^\d+$/),
    });

    process.env = {
      HOST: "localhost",
      PORT: "3000",
    };

    const onSuccess = vi.fn();

    // when
    await loadConfig({
      schema,
      onSuccess,
    });

    // then
    expect(onSuccess).toHaveBeenCalled();
  });
});

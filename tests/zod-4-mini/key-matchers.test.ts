import { z } from "zod/v4-mini";
import { applyKeyMatching, getShape } from "../../src/lib/utils";
import { describe, it, expect } from "vitest";

describe("applyKeyMatching", () => {
  it("should match keys in a simple object", () => {
    // given
    const schema = z.object({
      apiKey: z.string(),
      secretToken: z.string(),
    });

    const data = {
      API_KEY: "my-key",
      SECRET_TOKEN: "my-token",
    };

    // when
    const shape = getShape(schema);
    if (!shape) {
      throw new Error("Shape should not be undefined");
    }
    const result = applyKeyMatching(data, shape, "lenient");

    // then
    expect(result).toEqual({
      apiKey: "my-key",
      secretToken: "my-token",
    });
  });

  it("should match keys in a deeply nested object", () => {
    // given
    const schema = z.object({
      database: z.object({
        connection: z.object({
          host: z.string(),
          port: z.number(),
          auth: z.object({
            userName: z.string(),
            password: z.string(),
          }),
        }),
      }),
      features: z.object({
        enableLogging: z.boolean(),
      }),
    });

    const data = {
      DATABASE: {
        CONNECTION: {
          HOST: "localhost",
          PORT: 5432,
          AUTH: {
            USER_NAME: "admin",
            PASSWORD: "secret",
          },
        },
      },
      FEATURES: {
        ENABLE_LOGGING: true,
      },
    };

    // when
    const shape = getShape(schema);
    if (!shape) {
      throw new Error("Shape should not be undefined");
    }
    const result = applyKeyMatching(data, shape, "lenient");

    // then
    expect(result).toEqual({
      database: {
        connection: {
          host: "localhost",
          port: 5432,
          auth: {
            userName: "admin",
            password: "secret",
          },
        },
      },
      features: {
        enableLogging: true,
      },
    });
  });

  it("should handle partial data", () => {
    // given
    const schema = z.object({
      database: z.object({
        connection: z.object({
          host: z.string(),
          port: z.number(),
          username: z.string(),
          password: z.string(),
        }),
      }),
    });

    // Only some of the fields are provided
    const data = {
      DATABASE: {
        CONNECTION: {
          HOST: "localhost",
          // port is missing
          USERNAME: "admin",
          // password is missing
        },
      },
    };

    // when
    const shape = getShape(schema);
    if (!shape) {
      throw new Error("Shape should not be undefined");
    }
    const result = applyKeyMatching(data, shape, "lenient");

    // then
    expect(result).toEqual({
      database: {
        connection: {
          host: "localhost",
          username: "admin",
        },
      },
    });
  });

  it("should handle max depth to prevent circular references", () => {
    // given
    const schema = z.object({
      node: z.object({
        child: z.object({
          grandchild: z.object({
            data: z.string(),
          }),
        }),
      }),
    });

    // Create a deeply nested object that would exceed MAX_DEPTH
    // This is just for testing, in practice MAX_DEPTH would be much higher
    let deeplyNested: any = { DATA: "value" };
    for (let i = 0; i < 150; i++) {
      deeplyNested = { CHILD: deeplyNested };
    }

    const data = {
      NODE: {
        CHILD: deeplyNested,
      },
    };

    // when - this should not stack overflow due to MAX_DEPTH
    const shape = getShape(schema);
    if (!shape) {
      throw new Error("Shape should not be undefined");
    }
    const result = applyKeyMatching(data, shape, "lenient");

    // then - we should get a result with transformation applied until MAX_DEPTH
    expect(result).toBeDefined();
    expect(result.node).toBeDefined();
  });

  it("should not transform keys when using strict mode", () => {
    // given
    const schema = z.object({
      apiKey: z.string(),
      secretToken: z.string(),
    });

    const data = {
      apiKey: "my-key",
      secretToken: "my-token",
      API_KEY: "should-remain-unchanged",
    };

    // when
    const shape = getShape(schema);
    if (!shape) {
      throw new Error("Shape should not be undefined");
    }
    const result = applyKeyMatching(data, shape, "strict");

    // then
    expect(result).toEqual({
      apiKey: "my-key",
      secretToken: "my-token",
      API_KEY: "should-remain-unchanged",
    });
  });
});

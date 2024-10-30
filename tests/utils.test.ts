import { deepMerge, filterByPrefixKey } from "../src/lib/adapters/utils";
import { describe, it, expect } from "vitest";

describe("filterByPrefixKey", () => {
  it("should return an object with keys that start with the prefix", () => {
    // given
    const data = {
      APP_NAME: "my-app",
      TEST_NAME: "my-test",
    };
    const prefix = "TEST_";
    const expected = {
      TEST_NAME: "my-test",
    };

    // when
    const filteredData = filterByPrefixKey(data, prefix);

    // then
    expect(filteredData).toEqual(expected);
  });

  it("should return an empty object if no keys start with the prefix", () => {
    // given
    const data = {
      APP_NAME: "my-app",
      TEST_NAME: "my-test",
    };
    const prefix = "NOTHING_";

    // when
    const filteredData = filterByPrefixKey(data, prefix);

    // then

    expect(filteredData).toEqual({});
  });

  it("should return an empty object if the input object is empty", () => {
    // given
    const data = {};
    const prefix = "NOTHING_";

    // when
    const filteredData = filterByPrefixKey(data, prefix);

    // then
    expect(filteredData).toEqual({});
  });
});

describe("deepMerge", () => {
  it("should merge two flat objects", () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 3, c: 4 };
    const result = deepMerge(obj1, obj2);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("should merge two nested objects", () => {
    const obj1 = {
      a: 1,
      b: {
        c: [
          {
            z: 1,
            o: 2,
          },
        ],
      },
    };
    const obj2 = { b: { d: 3 }, e: 4 };
    const result = deepMerge(obj1, obj2);
    expect(result).toEqual({ a: 1, b: { c: [{ z: 1, o: 2 }], d: 3 }, e: 4 });
  });

  it("should not merge arrays", () => {
    const obj1 = { a: [1, 2] };
    const obj2 = { a: [3, 4] };
    const result = deepMerge(obj1, obj2);
    expect(result).toEqual({ a: [3, 4] });
  });
  it("should not override with undefined values", () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: undefined, c: [] };
    const result = deepMerge(obj1, obj2);
    expect(result).toEqual({ a: 1, b: 2, c: [] });
  });
  it("should override with null values", () => {
    const obj1 = { a: 1, b: 2 }; 
    const obj2 = { a: null, c: [] };
    const result = deepMerge(obj1, obj2);
    expect(result).toEqual({ a: null, b: 2, c: [] });
  });
});

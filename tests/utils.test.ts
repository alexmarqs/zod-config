import {
  deepMerge,
  filterByPrefixKey,
  filterByRegex,
  isMergeableObject,
} from "../src/lib/adapters/utils";
import { describe, it, expect } from "vitest";

describe("filterByRegex", () => {
  it("should return an object with keys that match the regex #1", () => {
    // given
    const data = {
      APP_NAME: "my-app",
      TEST_NAME: "my-test",
    };

    // starts with TEST_
    const regex = /^TEST_/;

    // when
    const filteredData = filterByRegex(data, regex);

    // then
    expect(filteredData).toEqual({
      TEST_NAME: "my-test",
    });
  });
  it("should return an object with keys that match the regex #2", () => {
    // given
    const data = {
      REACT_APP_NAME: "my-app",
      REACT_APP_TEST_NAME: "my-test",
      APP_NAME: "my-app",
      TEST_APP: "my-test",
    };

    // contains _APP_ in the middle of the key
    const regex = /_APP_/;

    // when
    const filteredData = filterByRegex(data, regex);

    // then
    expect(filteredData).toEqual({
      REACT_APP_NAME: "my-app",
      REACT_APP_TEST_NAME: "my-test",
    });
  });

  it("should return an empty object if no keys match the regex", () => {
    // given
    const data = {
      APP_NAME: "my-app",
      TEST_NAME: "my-test",
    };

    // no keys match the regex
    const regex = /NOT_MATCHING/;

    // when
    const filteredData = filterByRegex(data, regex);

    // then
    expect(filteredData).toEqual({});
  });

  it("should return an empty object if the input object is empty", () => {
    // given
    const data = {};
    const regex = /NOT_MATCHING/;

    // when
    const filteredData = filterByRegex(data, regex);

    // then
    expect(filteredData).toEqual({});
  });
});

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

describe("isMergeableObject", () => {
  it("should return true for plain objects", () => {
    expect(isMergeableObject({})).toBe(true);
    expect(isMergeableObject({ a: 1 })).toBe(true);
  });

  it("should return false for non-mergeable values", () => {
    // null and undefined
    expect(isMergeableObject(null)).toBe(false);
    expect(isMergeableObject(undefined)).toBe(false);

    // primitives
    expect(isMergeableObject(10)).toBe(false);
    expect(isMergeableObject("string")).toBe(false);
    expect(isMergeableObject(true)).toBe(false);

    // built-in objects and collections
    expect(isMergeableObject([])).toBe(false);
    expect(isMergeableObject(new Map())).toBe(false);
    expect(isMergeableObject(new Set())).toBe(false);
  });
});

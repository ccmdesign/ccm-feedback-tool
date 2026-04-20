import { describe, expect, it } from "vitest";
import { canonicalize } from "../src/webhook/canonicalization.js";

describe("canonicalize", () => {
  it("sorts keys at the top level", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("sorts keys recursively", () => {
    expect(canonicalize({ a: { z: 1, y: 2 }, b: [3, 1, 2] })).toBe('{"a":{"y":2,"z":1},"b":[3,1,2]}');
  });

  it("preserves array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("handles nested object-in-array", () => {
    expect(canonicalize([{ b: 2, a: 1 }])).toBe('[{"a":1,"b":2}]');
  });

  it("preserves numeric formatting", () => {
    expect(canonicalize({ n: 1.5 })).toBe('{"n":1.5}');
  });

  it("drops undefined values (matches JSON.stringify default)", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("serializes null correctly", () => {
    expect(canonicalize({ a: null })).toBe('{"a":null}');
  });

  it("produces identical output on repeated calls (deterministic)", () => {
    const input = { foo: { x: 1, y: 2 }, bar: [1, 2], baz: "hello" };
    expect(canonicalize(input)).toBe(canonicalize(input));
  });

  it("sorts keys regardless of insertion order", () => {
    const a = { foo: 1, bar: 2 };
    const b: Record<string, number> = {};
    b.bar = 2;
    b.foo = 1;
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("escapes strings via JSON.stringify semantics", () => {
    expect(canonicalize({ s: 'a"b' })).toBe('{"s":"a\\"b"}');
  });
});

import { describe, expect, it } from "vitest";
import { canonicalize } from "../src/webhook/canonicalization.js";
import { buildWebhookPayload } from "../src/webhook/payload.js";

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

  // CCM-284 — audio_url lands alphabetically inside an annotation between
  // anchor and created_at. This is a regression guard: if someone accidentally
  // refactors `buildWebhookPayload` to emit the key in insertion order, the
  // canonical bytes will shift and the test will fail.
  describe("audio_url canonical position (CCM-284)", () => {
    const INPUT_WITHOUT_AUDIO = {
      reviewId: "rb_1",
      projectId: "p_1",
      projectName: "demo",
      submittedAt: new Date("2026-04-20T00:00:00.000Z"),
      reviewer: { name: "Claudio" },
      annotations: [
        {
          id: "a_1",
          type: "comment",
          message: "hi",
          url: "https://example.com",
          createdAt: new Date("2026-04-20T00:00:00.000Z"),
          anchor: {
            cssSelector: "body",
            xpath: "/html/body",
            textSnippet: "",
            elementTag: "BODY",
            textPrefix: "",
            textSuffix: "",
            fingerprint: "0:0:x",
            neighborText: "",
          },
          rect: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
          scrollX: 0,
          scrollY: 0,
          viewportW: 1920,
          viewportH: 1080,
          devicePixelRatio: 1,
        },
      ],
    };

    it("absent field leaves canonical output identical to pre-CCM-284", () => {
      const bytes = canonicalize(buildWebhookPayload(INPUT_WITHOUT_AUDIO));
      // Canonical string must NOT contain audio_url when audioUrl is absent.
      expect(bytes.includes("audio_url")).toBe(false);
    });

    it("present field sorts alphabetically and appears once", () => {
      const input = {
        ...INPUT_WITHOUT_AUDIO,
        annotations: [{ ...INPUT_WITHOUT_AUDIO.annotations[0], audioUrl: "https://s.example/a.webm" }],
      };
      const bytes = canonicalize(buildWebhookPayload(input));
      // alphabetically anchor → audio_url → created_at
      const anchorIdx = bytes.indexOf('"anchor"');
      const audioIdx = bytes.indexOf('"audio_url"');
      const createdIdx = bytes.indexOf('"created_at"');
      expect(anchorIdx).toBeGreaterThan(-1);
      expect(audioIdx).toBeGreaterThan(anchorIdx);
      expect(createdIdx).toBeGreaterThan(audioIdx);
      // appears exactly once
      expect(bytes.split('"audio_url"').length - 1).toBe(1);
    });
  });
});

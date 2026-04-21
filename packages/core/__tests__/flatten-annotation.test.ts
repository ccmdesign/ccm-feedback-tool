import { describe, expect, it } from "vitest";
import type { AnnotationPayload } from "../src/types.js";
import { flattenAnnotation, isImageSwapAnnotation, isTextChangeAnnotation } from "../src/types.js";

const baseAnchor = {
  cssSelector: "main > h1",
  xpath: "/html/body/main/h1",
  textSnippet: "Hello world",
  elementTag: "H1",
  elementId: undefined,
  textPrefix: "",
  textSuffix: "",
  fingerprint: "1:0:abc",
  neighborText: "",
};

const baseRect = { xPct: 0, yPct: 0, wPct: 1, hPct: 1 };
const baseMetrics = {
  scrollX: 0,
  scrollY: 0,
  viewportW: 1440,
  viewportH: 900,
  devicePixelRatio: 2,
};

describe("flattenAnnotation", () => {
  it("preserves rectangle payload shape and defaults type to rectangle", () => {
    const input: AnnotationPayload = {
      anchor: baseAnchor,
      rect: baseRect,
      ...baseMetrics,
    };
    const flat = flattenAnnotation(input);
    expect(flat.type).toBe("rectangle");
    expect(flat.originalText).toBeUndefined();
    expect(flat.proposedText).toBeUndefined();
    expect(flat.originalAssetUrl).toBeUndefined();
    expect(flat.proposedAssetUrl).toBeUndefined();
    expect(flat.proposedAssetSource).toBeUndefined();
    expect(flat.proposedAltText).toBeUndefined();
    expect(flat.assetMeta).toBeUndefined();
    expect(flat.cssSelector).toBe("main > h1");
    expect(flat.xPct).toBe(0);
    expect(flat.viewportW).toBe(1440);
  });

  it("preserves explicit type rectangle without adding other fields", () => {
    const flat = flattenAnnotation({
      anchor: baseAnchor,
      rect: baseRect,
      ...baseMetrics,
      type: "rectangle",
    });
    expect(flat.type).toBe("rectangle");
    expect(flat.originalText).toBeUndefined();
  });

  it("flattens text_change payloads with original + proposed text", () => {
    const flat = flattenAnnotation({
      anchor: baseAnchor,
      rect: baseRect,
      ...baseMetrics,
      type: "text_change",
      originalText: "Hello world",
      proposedText: "Hello planet",
    });
    expect(flat.type).toBe("text_change");
    expect(flat.originalText).toBe("Hello world");
    expect(flat.proposedText).toBe("Hello planet");
    expect(flat.originalAssetUrl).toBeUndefined();
    expect(flat.assetMeta).toBeUndefined();
  });

  it("flattens image_swap payloads with all asset fields", () => {
    const meta = { width: 1200, height: 630, sizeBytes: 102400, mime: "image/jpeg" as const };
    const flat = flattenAnnotation({
      anchor: baseAnchor,
      rect: baseRect,
      ...baseMetrics,
      type: "image_swap",
      originalAssetUrl: "https://host.example.com/hero.jpg",
      proposedAssetUrl: "https://supabase.example.co/storage/v1/object/public/assets/p1/new.jpg",
      proposedAssetSource: "link",
      proposedAltText: "Team celebrating",
      assetMeta: meta,
    });
    expect(flat.type).toBe("image_swap");
    expect(flat.originalAssetUrl).toBe("https://host.example.com/hero.jpg");
    expect(flat.proposedAssetUrl).toBe("https://supabase.example.co/storage/v1/object/public/assets/p1/new.jpg");
    expect(flat.proposedAssetSource).toBe("link");
    expect(flat.proposedAltText).toBe("Team celebrating");
    expect(flat.assetMeta).toEqual(meta);
    expect(flat.originalText).toBeUndefined();
  });

  it("does not leak undefined keys for omitted optional fields (exactOptionalPropertyTypes)", () => {
    const flat = flattenAnnotation({
      anchor: baseAnchor,
      rect: baseRect,
      ...baseMetrics,
      type: "image_swap",
      originalAssetUrl: "https://host.example.com/hero.jpg",
      proposedAssetUrl: "https://supabase.example.co/storage/v1/object/public/assets/p1/new.jpg",
      proposedAssetSource: "upload",
      assetMeta: { width: 100, height: 100, sizeBytes: 1000, mime: "image/png" },
      // proposedAltText deliberately omitted
    });
    expect("proposedAltText" in flat).toBe(false);
  });
});

describe("isTextChangeAnnotation / isImageSwapAnnotation guards", () => {
  it("isTextChangeAnnotation narrows to text_change with both text fields", () => {
    const ann = {
      type: "text_change" as const,
      originalText: "a",
      proposedText: "b",
    };
    expect(isTextChangeAnnotation(ann)).toBe(true);
  });

  it("isTextChangeAnnotation rejects rectangle", () => {
    expect(isTextChangeAnnotation({ type: "rectangle", originalText: undefined, proposedText: undefined })).toBe(false);
  });

  it("isImageSwapAnnotation narrows to image_swap with all required fields", () => {
    expect(
      isImageSwapAnnotation({
        type: "image_swap",
        originalAssetUrl: "https://a",
        proposedAssetUrl: "https://b",
        proposedAssetSource: "link",
        assetMeta: { width: 1, height: 1, sizeBytes: 1, mime: "image/png" },
      }),
    ).toBe(true);
  });

  it("isImageSwapAnnotation rejects when assetMeta is missing", () => {
    expect(
      isImageSwapAnnotation({
        type: "image_swap",
        originalAssetUrl: "https://a",
        proposedAssetUrl: "https://b",
        proposedAssetSource: "link",
        assetMeta: undefined,
      }),
    ).toBe(false);
  });
});

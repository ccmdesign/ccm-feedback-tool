import { describe, expect, it } from "vitest";
import { canonicalize } from "../src/webhook/canonicalization.js";
import { buildWebhookPayload } from "../src/webhook/payload.js";

const BASE_INPUT = {
  reviewId: "review_1",
  projectId: "project_1",
  projectName: "demo",
  submittedAt: new Date("2026-04-20T00:00:00.000Z"),
  reviewer: { name: "Claudio" },
  annotations: [
    {
      id: "ann_1",
      type: "comment",
      message: "hello",
      url: "https://example.com",
      createdAt: new Date("2026-04-20T00:00:00.000Z"),
      anchor: {
        cssSelector: "body > main",
        xpath: "/html/body/main",
        textSnippet: "hi",
        elementTag: "MAIN",
        elementId: "main",
        textPrefix: "",
        textSuffix: "",
        fingerprint: "1:0:h",
        neighborText: "",
      },
      rect: { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.4 },
      scrollX: 0,
      scrollY: 0,
      viewportW: 1920,
      viewportH: 1080,
      devicePixelRatio: 2,
    },
  ],
};

describe("buildWebhookPayload", () => {
  it("emits schema_version '1'", () => {
    expect(buildWebhookPayload(BASE_INPUT).schema_version).toBe("1");
  });

  it("normalizes dates to ISO strings", () => {
    const p = buildWebhookPayload(BASE_INPUT);
    expect(p.submitted_at).toBe("2026-04-20T00:00:00.000Z");
    expect(p.annotations[0].created_at).toBe("2026-04-20T00:00:00.000Z");
  });

  it("converts camelCase anchor fields to snake_case", () => {
    const p = buildWebhookPayload(BASE_INPUT);
    const anchor = p.annotations[0].anchor;
    expect(anchor.css_selector).toBe("body > main");
    expect(anchor.text_prefix).toBe("");
    expect(anchor.element_id).toBe("main");
  });

  it("converts rect fields to snake_case", () => {
    const p = buildWebhookPayload(BASE_INPUT);
    const rect = p.annotations[0].rect;
    expect(rect.x_pct).toBe(0.1);
    expect(rect.w_pct).toBe(0.3);
  });

  it("omits reviewer email when not provided", () => {
    const p = buildWebhookPayload(BASE_INPUT);
    expect(p.reviewer.email).toBeUndefined();
  });

  it("includes reviewer email when provided", () => {
    const p = buildWebhookPayload({ ...BASE_INPUT, reviewer: { name: "Claudio", email: "c@example.com" } });
    expect(p.reviewer.email).toBe("c@example.com");
  });

  it("omits element_id when the anchor has null/undefined", () => {
    const ann = { ...BASE_INPUT.annotations[0], anchor: { ...BASE_INPUT.annotations[0].anchor, elementId: null } };
    const p = buildWebhookPayload({ ...BASE_INPUT, annotations: [ann] });
    expect(p.annotations[0].anchor.element_id).toBeUndefined();
  });

  // CCM-284 — audio_url is absent on annotations without audioUrl
  it("omits audio_url when audioUrl is not provided on the input", () => {
    const p = buildWebhookPayload(BASE_INPUT);
    expect(p.annotations[0].audio_url).toBeUndefined();
    expect("audio_url" in p.annotations[0]).toBe(false);
  });

  // CCM-284 — audio_url is propagated when audioUrl is provided
  it("includes audio_url when audioUrl is provided on the annotation", () => {
    const ann = { ...BASE_INPUT.annotations[0], audioUrl: "https://storage.example.com/a/1.webm" };
    const p = buildWebhookPayload({ ...BASE_INPUT, annotations: [ann] });
    expect(p.annotations[0].audio_url).toBe("https://storage.example.com/a/1.webm");
  });

  // CCM-284 — null audioUrl is treated as absent (no null leaks to wire payload)
  it("omits audio_url when audioUrl is null", () => {
    const ann = { ...BASE_INPUT.annotations[0], audioUrl: null };
    const p = buildWebhookPayload({ ...BASE_INPUT, annotations: [ann] });
    expect(p.annotations[0].audio_url).toBeUndefined();
  });
});

describe("CCM-282 buildWebhookPayload — annotation intents", () => {
  it("does not emit CCM-282 fields for rectangle annotations (regression guard)", () => {
    const p = buildWebhookPayload(BASE_INPUT);
    const ann = p.annotations[0];
    // Explicit rectangle — discriminator default is rectangle; avoid top-level pollution.
    expect(ann.annotation_type).toBeUndefined();
    expect(ann.original_text).toBeUndefined();
    expect(ann.proposed_text).toBeUndefined();
    expect(ann.original_asset_url).toBeUndefined();
    expect(ann.proposed_asset_url).toBeUndefined();
    expect(ann.proposed_alt_text).toBeUndefined();
    expect(ann.asset_meta).toBeUndefined();
  });

  it("emits text_change fields at annotation top level (NOT nested under target)", () => {
    const ann = {
      ...BASE_INPUT.annotations[0],
      annotationType: "text_change",
      originalText: "Hello world",
      proposedText: "Hello planet",
    };
    const p = buildWebhookPayload({ ...BASE_INPUT, annotations: [ann] });
    const emitted = p.annotations[0];
    expect(emitted.annotation_type).toBe("text_change");
    expect(emitted.original_text).toBe("Hello world");
    expect(emitted.proposed_text).toBe("Hello planet");
    // Ensure the fields are NOT nested under a "target" key — spec §6.1 drift mitigation.
    expect((emitted as unknown as Record<string, unknown>).target).toBeUndefined();
    // Image fields must not appear on a text_change annotation.
    expect(emitted.original_asset_url).toBeUndefined();
    expect(emitted.proposed_asset_url).toBeUndefined();
  });

  it("emits image_swap fields at annotation top level with snake_case asset_meta", () => {
    const ann = {
      ...BASE_INPUT.annotations[0],
      annotationType: "image_swap",
      originalAssetUrl: "https://cdn.example.com/hero.jpg",
      proposedAssetUrl: "https://proj.supabase.co/storage/v1/object/public/assets/p1/new.jpg",
      proposedAssetSource: "link",
      proposedAltText: "Team celebrating",
      assetMeta: { width: 1200, height: 630, sizeBytes: 102400, mime: "image/jpeg" },
    };
    const p = buildWebhookPayload({ ...BASE_INPUT, annotations: [ann] });
    const emitted = p.annotations[0];
    expect(emitted.annotation_type).toBe("image_swap");
    expect(emitted.original_asset_url).toBe("https://cdn.example.com/hero.jpg");
    expect(emitted.proposed_asset_url).toBe("https://proj.supabase.co/storage/v1/object/public/assets/p1/new.jpg");
    expect(emitted.proposed_asset_source).toBe("link");
    expect(emitted.proposed_alt_text).toBe("Team celebrating");
    expect(emitted.asset_meta).toEqual({
      width: 1200,
      height: 630,
      size_bytes: 102400,
      mime: "image/jpeg",
    });
    // Text fields must not appear on an image_swap annotation.
    expect(emitted.original_text).toBeUndefined();
    expect(emitted.proposed_text).toBeUndefined();
  });

  it("omits proposed_alt_text when missing / empty (consistent with existing optional treatment)", () => {
    const ann = {
      ...BASE_INPUT.annotations[0],
      annotationType: "image_swap",
      originalAssetUrl: "https://cdn.example.com/a.jpg",
      proposedAssetUrl: "https://proj.supabase.co/storage/v1/object/public/assets/x/b.jpg",
      proposedAssetSource: "upload",
      proposedAltText: null,
      assetMeta: { width: 100, height: 100, sizeBytes: 1000, mime: "image/png" },
    };
    const p = buildWebhookPayload({ ...BASE_INPUT, annotations: [ann] });
    expect(p.annotations[0].proposed_alt_text).toBeUndefined();
  });

  it("canonicalized bytes for a mixed-type batch are stable across invocations", () => {
    const input = {
      ...BASE_INPUT,
      annotations: [
        BASE_INPUT.annotations[0], // rectangle
        {
          ...BASE_INPUT.annotations[0],
          id: "ann_2",
          annotationType: "text_change",
          originalText: "a",
          proposedText: "b",
        },
        {
          ...BASE_INPUT.annotations[0],
          id: "ann_3",
          annotationType: "image_swap",
          originalAssetUrl: "https://ext.com/a.jpg",
          proposedAssetUrl: "https://proj.supabase.co/storage/v1/object/public/assets/p/b.jpg",
          proposedAssetSource: "link",
          assetMeta: { width: 1, height: 1, sizeBytes: 1, mime: "image/jpeg" },
        },
      ],
    };
    const a = canonicalize(buildWebhookPayload(input));
    const b = canonicalize(buildWebhookPayload(input));
    expect(a).toBe(b);
    // Sorted-keys invariant — asset_meta keys appear in alphabetical order.
    expect(a.indexOf('"asset_meta":{"height"')).toBeGreaterThan(-1);
  });
});

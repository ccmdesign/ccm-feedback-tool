import { describe, expect, it } from "vitest";
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

import { describe, expect, it } from "vitest";
import { CCM_FEEDBACK_MODELS } from "../src/schema.js";

describe("CCM-282 FeedbackAnnotation intent discriminator + type columns", () => {
  const ann = CCM_FEEDBACK_MODELS.FeedbackAnnotation;

  it("type discriminator defaults to 'rectangle' for backfill compatibility", () => {
    expect(ann.fields.type).toBeDefined();
    expect(ann.fields.type.type).toBe("String");
    expect(ann.fields.type.default).toBe('"rectangle"');
    // Required (not optional) so every row has a discriminator.
    expect(ann.fields.type.optional).toBeUndefined();
  });

  it("text_change columns exist as optional Text fields", () => {
    for (const name of ["originalText", "proposedText"]) {
      const field = ann.fields[name as keyof typeof ann.fields];
      expect(field, `${name} must exist`).toBeDefined();
      expect(field.type).toBe("String");
      expect(field.optional).toBe(true);
      expect(field.nativeType).toBe("Text");
    }
  });

  it("image_swap columns exist with correct shape", () => {
    expect(ann.fields.originalAssetUrl.type).toBe("String");
    expect(ann.fields.originalAssetUrl.optional).toBe(true);
    expect(ann.fields.originalAssetUrl.nativeType).toBe("Text");

    expect(ann.fields.proposedAssetUrl.type).toBe("String");
    expect(ann.fields.proposedAssetUrl.optional).toBe(true);
    expect(ann.fields.proposedAssetUrl.nativeType).toBe("Text");

    expect(ann.fields.proposedAssetSource.type).toBe("String");
    expect(ann.fields.proposedAssetSource.optional).toBe(true);
    // Not a Text field — short enum string.
    expect(ann.fields.proposedAssetSource.nativeType).toBeUndefined();

    expect(ann.fields.proposedAltText.type).toBe("String");
    expect(ann.fields.proposedAltText.optional).toBe(true);
    expect(ann.fields.proposedAltText.nativeType).toBe("Text");
  });

  it("assetMeta is an optional Json column", () => {
    expect(ann.fields.assetMeta.type).toBe("Json");
    expect(ann.fields.assetMeta.optional).toBe(true);
  });

  it("has an index on the type discriminator", () => {
    const hasTypeIndex = ann.indexes?.some((idx) => idx.fields.length === 1 && idx.fields[0] === "type");
    expect(hasTypeIndex).toBe(true);
  });

  it("keeps the existing CCM-279 indexes (regression guard)", () => {
    const feedbackIdx = ann.indexes?.some((idx) => idx.fields.length === 1 && idx.fields[0] === "feedbackId");
    const statusIdx = ann.indexes?.some((idx) => idx.fields.length === 1 && idx.fields[0] === "status");
    expect(feedbackIdx).toBe(true);
    expect(statusIdx).toBe(true);
  });
});

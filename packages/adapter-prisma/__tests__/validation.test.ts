import { afterEach, describe, expect, it } from "vitest";
import { assetMirrorRequestSchema, signUploadRequestSchema } from "../src/validation/asset.js";
import {
  feedbackCreateSchema,
  feedbackPatchSchema,
  formatValidationErrors,
  resolveCcmStorageOrigin,
} from "../src/validation.js";
import { validAnnotation, validPayload } from "./fixtures.js";

const DEFAULT_STORAGE_ORIGIN = "http://localhost:54321/storage/v1/object/public/assets/";

function imageSwapAnnotationFor(origin: string) {
  return {
    ...validAnnotation,
    type: "image_swap" as const,
    originalAssetUrl: "https://cdn.example.com/hero.jpg",
    proposedAssetUrl: `${origin}proj/abc.jpg`,
    proposedAssetSource: "link" as const,
    proposedAltText: "A smiling team",
    assetMeta: {
      width: 1200,
      height: 630,
      sizeBytes: 102400,
      mime: "image/jpeg" as const,
    },
  };
}

describe("feedbackCreateSchema", () => {
  it("accepts a valid payload", () => {
    const result = feedbackCreateSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts payload without annotations", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing projectName", () => {
    const { projectName, ...rest } = validPayload;
    const result = feedbackCreateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty message", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message over 5000 chars", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      message: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      authorEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative annotation rect dimensions", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...validAnnotation,
          rect: { xPct: 0.1, yPct: 0.2, wPct: -0.5, hPct: 0.3 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("validates all four feedback types", () => {
    for (const type of ["question", "change", "bug", "other"]) {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects annotation missing fingerprint", () => {
    const { fingerprint, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects annotation missing textPrefix", () => {
    const { textPrefix, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects annotation missing textSnippet", () => {
    const { textSnippet, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects annotation missing textSuffix", () => {
    const { textSuffix, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects annotation missing neighborText", () => {
    const { neighborText, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty strings for text context fields", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...validAnnotation,
          anchor: {
            ...validAnnotation.anchor,
            textSnippet: "",
            textPrefix: "",
            textSuffix: "",
            fingerprint: "",
            neighborText: "",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("feedbackPatchSchema", () => {
  it("accepts valid resolve", () => {
    const result = feedbackPatchSchema.safeParse({
      id: "abc123",
      projectName: "test-project",
      status: "resolved",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid unresolve", () => {
    const result = feedbackPatchSchema.safeParse({
      id: "abc123",
      projectName: "test-project",
      status: "open",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = feedbackPatchSchema.safeParse({
      id: "abc123",
      status: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = feedbackPatchSchema.safeParse({ status: "resolved" });
    expect(result.success).toBe(false);
  });
});

describe("CCM-282 discriminated-union annotation schema", () => {
  it("accepts a rectangle annotation without an explicit type (defaults)", () => {
    const result = feedbackCreateSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts an explicit rectangle annotation", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, type: "rectangle" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid text_change annotation", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...validAnnotation,
          type: "text_change",
          originalText: "Hello world",
          proposedText: "Hello planet",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a text_change annotation missing proposedText", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...validAnnotation,
          type: "text_change",
          originalText: "Hello world",
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("proposedText"))).toBe(true);
    }
  });

  it("accepts a valid image_swap annotation with CCM-hosted proposed URL", () => {
    const origin = resolveCcmStorageOrigin();
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [imageSwapAnnotationFor(origin)],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an image_swap annotation with an external proposedAssetUrl", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...imageSwapAnnotationFor(DEFAULT_STORAGE_ORIGIN),
          proposedAssetUrl: "https://external.example.com/new.jpg",
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("CCM-hosted"))).toBe(true);
    }
  });

  it("rejects image_swap with unsupported MIME", () => {
    const origin = resolveCcmStorageOrigin();
    const ann = imageSwapAnnotationFor(origin);
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...ann,
          assetMeta: { ...ann.assetMeta, mime: "image/tiff" as unknown as typeof ann.assetMeta.mime },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects image_swap with oversized assetMeta.sizeBytes", () => {
    const origin = resolveCcmStorageOrigin();
    const ann = imageSwapAnnotationFor(origin);
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...ann,
          assetMeta: { ...ann.assetMeta, sizeBytes: 11 * 1024 * 1024 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("CCM-282 resolveCcmStorageOrigin", () => {
  const savedCcm = process.env.CCM_STORAGE_ORIGIN;
  const savedSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    if (savedCcm === undefined) delete process.env.CCM_STORAGE_ORIGIN;
    else process.env.CCM_STORAGE_ORIGIN = savedCcm;
    if (savedSupabase === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = savedSupabase;
  });

  it("returns the explicit CCM_STORAGE_ORIGIN when set", () => {
    process.env.CCM_STORAGE_ORIGIN = "https://assets.example.com/";
    expect(resolveCcmStorageOrigin()).toBe("https://assets.example.com/");
  });

  it("appends a trailing slash to CCM_STORAGE_ORIGIN when missing", () => {
    process.env.CCM_STORAGE_ORIGIN = "https://assets.example.com";
    expect(resolveCcmStorageOrigin()).toBe("https://assets.example.com/");
  });

  it("falls back to NEXT_PUBLIC_SUPABASE_URL + /storage path", () => {
    delete process.env.CCM_STORAGE_ORIGIN;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    expect(resolveCcmStorageOrigin()).toBe("https://proj.supabase.co/storage/v1/object/public/assets/");
  });
});

describe("CCM-282 asset request schemas", () => {
  it("accepts a valid mirror request", () => {
    const res = assetMirrorRequestSchema.safeParse({
      projectId: "proj1",
      url: "https://example.com/image.jpg",
    });
    expect(res.success).toBe(true);
  });

  it("rejects a mirror request with a malformed URL", () => {
    const res = assetMirrorRequestSchema.safeParse({ projectId: "proj1", url: "not a url" });
    expect(res.success).toBe(false);
  });

  it("accepts a valid sign-upload request", () => {
    const res = signUploadRequestSchema.safeParse({
      projectId: "proj1",
      filename: "photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 200_000,
    });
    expect(res.success).toBe(true);
  });

  it("rejects path-traversal filenames", () => {
    const res = signUploadRequestSchema.safeParse({
      projectId: "proj1",
      filename: "../../etc/passwd",
      contentType: "image/jpeg",
      sizeBytes: 200,
    });
    expect(res.success).toBe(false);
  });

  it("rejects oversized sign-upload requests (> 10 MB)", () => {
    const res = signUploadRequestSchema.safeParse({
      projectId: "proj1",
      filename: "photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 11 * 1024 * 1024,
    });
    expect(res.success).toBe(false);
  });

  it("rejects unsupported MIMEs", () => {
    const res = signUploadRequestSchema.safeParse({
      projectId: "proj1",
      filename: "photo.tiff",
      contentType: "image/tiff",
      sizeBytes: 1024,
    });
    expect(res.success).toBe(false);
  });
});

describe("formatValidationErrors", () => {
  it("formats errors as field + message pairs", () => {
    const result = feedbackCreateSchema.safeParse({ type: "invalid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toHaveProperty("field");
      expect(errors[0]).toHaveProperty("message");
    }
  });
});

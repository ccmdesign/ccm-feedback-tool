import { afterEach, describe, expect, it } from "vitest";
import { assetMirrorRequestSchema, signUploadRequestSchema } from "../src/validation/asset.js";
import {
  agentPatchSchema,
  feedbackCreateSchema,
  feedbackPatchSchema,
  formatValidationErrors,
  replyCreateSchema,
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

  it("rejects a rectangle annotation with a stray text_change field (CCM-282 P3 strict)", () => {
    // Without `.strict()`, Zod silently strips `proposedText` and this would
    // succeed. Strict branches surface the mismatch as a validation error.
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, type: "rectangle", proposedText: "sneaky" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod's `unrecognized_keys` issue lists the offending keys on a `keys`
      // property rather than in `path`. Check both the message and any `keys`.
      const issueJson = JSON.stringify(result.error.issues);
      expect(issueJson).toContain("proposedText");
    }
  });

  it("rejects a text_change annotation carrying image_swap-only assetMeta (CCM-282 P3 strict)", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...validAnnotation,
          type: "text_change",
          originalText: "a",
          proposedText: "b",
          assetMeta: { width: 10, height: 10, sizeBytes: 100, mime: "image/png" },
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

  it("throws in production when neither env var is set (CCM-282 P2 fail-closed)", () => {
    const savedNodeEnv = process.env.NODE_ENV;
    delete process.env.CCM_STORAGE_ORIGIN;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NODE_ENV = "production";
    try {
      expect(() => resolveCcmStorageOrigin()).toThrow(/production/i);
    } finally {
      if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = savedNodeEnv;
    }
  });

  it("falls back to localhost when NODE_ENV is not production (dev convenience)", () => {
    const savedNodeEnv = process.env.NODE_ENV;
    delete process.env.CCM_STORAGE_ORIGIN;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NODE_ENV = "development";
    try {
      expect(resolveCcmStorageOrigin()).toBe("http://localhost:54321/storage/v1/object/public/assets/");
    } finally {
      if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = savedNodeEnv;
    }
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

// ---------------------------------------------------------------------------
// CCM-290 — comment type, replyCreateSchema, agentPatchSchema
// ---------------------------------------------------------------------------

describe("CCM-290 feedback type + reply validation", () => {
  it("feedbackCreateSchema accepts type 'comment'", () => {
    const result = feedbackCreateSchema.safeParse({ ...validPayload, type: "comment" });
    expect(result.success).toBe(true);
  });

  it("feedbackCreateSchema still rejects unknown types", () => {
    const result = feedbackCreateSchema.safeParse({ ...validPayload, type: "totally-bogus" });
    expect(result.success).toBe(false);
  });

  it("replyCreateSchema accepts author + body", () => {
    const result = replyCreateSchema.safeParse({ author: "Alice", body: "Thanks!" });
    expect(result.success).toBe(true);
  });

  it("replyCreateSchema accepts optional authorEmail", () => {
    const result = replyCreateSchema.safeParse({
      author: "Alice",
      authorEmail: "alice@example.com",
      body: "Thanks!",
    });
    expect(result.success).toBe(true);
  });

  it("replyCreateSchema rejects empty body", () => {
    const result = replyCreateSchema.safeParse({ author: "Alice", body: "" });
    expect(result.success).toBe(false);
  });

  it("replyCreateSchema rejects body over 5000 chars", () => {
    const result = replyCreateSchema.safeParse({ author: "Alice", body: "x".repeat(5001) });
    expect(result.success).toBe(false);
  });

  it("replyCreateSchema rejects missing author", () => {
    const result = replyCreateSchema.safeParse({ body: "Hi" });
    expect(result.success).toBe(false);
  });

  it("agentPatchSchema accepts a status update", () => {
    const result = agentPatchSchema.safeParse({ status: "resolved" });
    expect(result.success).toBe(true);
  });

  it("agentPatchSchema accepts optional author", () => {
    const result = agentPatchSchema.safeParse({ status: "resolved", author: "agent-alice" });
    expect(result.success).toBe(true);
  });

  it("agentPatchSchema rejects unknown status", () => {
    const result = agentPatchSchema.safeParse({ status: "in-flight" });
    expect(result.success).toBe(false);
  });
});

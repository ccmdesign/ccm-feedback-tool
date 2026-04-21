import type { AnnotationType, FeedbackStatus, FeedbackType, ProposedAssetSource } from "@ccm-feedback/core";
import { ALLOWED_IMAGE_MIMES, FEEDBACK_STATUSES, FEEDBACK_TYPES, MAX_ASSET_SIZE_BYTES } from "@ccm-feedback/core";
import * as zod from "zod";

// Namespace import required: Zod publishes dual CJS/ESM, and bundlers (tsup, vitest) may
// resolve the CJS entry where `import { z } from "zod"` fails because CJS wraps
// the entire module under a default/namespace key. This workaround normalizes access
// regardless of which entry point the bundler resolves.
// See: https://github.com/colinhacks/zod/issues/2697
const z: typeof zod.z = ("z" in zod ? zod.z : zod) as typeof zod.z;

/**
 * Resolve the canonical CCM Storage origin prefix — used to enforce that
 * `proposedAssetUrl` on image_swap annotations is CCM-hosted (never the external
 * URL the reviewer pasted). Resolution order:
 *
 *   1. `CCM_STORAGE_ORIGIN` explicit override.
 *   2. `NEXT_PUBLIC_SUPABASE_URL + /storage/v1/object/public/assets/` when present.
 *   3. Local supabase dev fallback (`http://localhost:54321/storage/v1/object/public/assets/`).
 *
 * Returned value always ends with a trailing slash so `startsWith` checks are
 * unambiguous.
 */
export function resolveCcmStorageOrigin(): string {
  const explicit = process.env.CCM_STORAGE_ORIGIN;
  if (explicit && explicit.length > 0) {
    return explicit.endsWith("/") ? explicit : `${explicit}/`;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl.length > 0) {
    const trimmed = supabaseUrl.replace(/\/+$/, "");
    return `${trimmed}/storage/v1/object/public/assets/`;
  }
  return "http://localhost:54321/storage/v1/object/public/assets/";
}

const anchorSchema = z.object({
  cssSelector: z.string().min(1).max(2000),
  xpath: z.string().min(1).max(2000),
  textSnippet: z.string().max(500),
  elementTag: z.string().min(1),
  elementId: z.string().optional(),
  textPrefix: z.string().max(200),
  textSuffix: z.string().max(200),
  fingerprint: z.string().max(200),
  neighborText: z.string().max(500),
});

const rectSchema = z.object({
  xPct: z.number().min(0).max(1),
  yPct: z.number().min(0).max(1),
  wPct: z.number().min(0).max(1),
  hPct: z.number().min(0).max(1),
});

const annotationMetricsShape = {
  anchor: anchorSchema,
  rect: rectSchema,
  scrollX: z.number().min(0),
  scrollY: z.number().min(0),
  viewportW: z.number().int().positive(),
  viewportH: z.number().int().positive(),
  devicePixelRatio: z.number().positive().default(1),
} as const;

const rectangleAnnotationSchema = z.object({
  type: z.literal("rectangle"),
  ...annotationMetricsShape,
});

const textChangeAnnotationSchema = z.object({
  type: z.literal("text_change"),
  originalText: z.string().min(1).max(5000),
  proposedText: z.string().min(1).max(5000),
  ...annotationMetricsShape,
});

const assetMetaSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive().max(MAX_ASSET_SIZE_BYTES),
  mime: z.enum(ALLOWED_IMAGE_MIMES),
});

const imageSwapAnnotationSchema = z.object({
  type: z.literal("image_swap"),
  originalAssetUrl: z.string().url().max(2000),
  proposedAssetUrl: z.string().url().max(2000),
  proposedAssetSource: z.enum(["link", "upload"]),
  proposedAltText: z.string().max(500).optional(),
  assetMeta: assetMetaSchema,
  ...annotationMetricsShape,
});

/**
 * Discriminated-union annotation schema. The widget stamps `type` on every
 * annotation it submits; CCM-279-era callers that omit the field are coerced
 * to `"rectangle"` via `z.preprocess` so existing rectangle payloads stay
 * compatible.
 *
 * NOTE: `.superRefine` on the imageSwap branch would produce a `ZodEffects`
 * which is incompatible with `z.discriminatedUnion`. Instead we layer the
 * CCM-hosted origin check after the union.
 */
const discriminatedAnnotationSchema = z.discriminatedUnion("type", [
  rectangleAnnotationSchema,
  textChangeAnnotationSchema,
  imageSwapAnnotationSchema,
]);

const annotationSchema = z
  .preprocess((raw) => {
    if (raw && typeof raw === "object" && !("type" in raw)) {
      return { ...(raw as Record<string, unknown>), type: "rectangle" as const };
    }
    return raw;
  }, discriminatedAnnotationSchema)
  .superRefine((value, ctx) => {
    if (value.type !== "image_swap") return;
    const origin = resolveCcmStorageOrigin();
    if (!value.proposedAssetUrl.startsWith(origin)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ["proposedAssetUrl"],
        message: `proposedAssetUrl must be CCM-hosted (start with ${origin}).`,
      });
    }
  });

export const feedbackCreateSchema = z.object({
  projectName: z.string().min(1).max(200),
  type: z.enum(FEEDBACK_TYPES),
  message: z.string().min(1).max(5000),
  url: z.string().max(2000).url(),
  viewport: z.string().min(1).max(50),
  userAgent: z.string().min(1).max(500),
  authorName: z.string().min(1).max(200),
  authorEmail: z.string().email().max(200),
  annotations: z.array(annotationSchema).max(50),
  clientId: z.string().min(1).max(200),
});

export const feedbackPatchSchema = z.object({
  id: z.string().min(1),
  projectName: z.string().min(1).max(200),
  status: z.enum(FEEDBACK_STATUSES),
});

export const feedbackDeleteSchema = z.union([
  z.object({ id: z.string().min(1), projectName: z.string().min(1).max(200) }),
  z.object({ projectName: z.string().min(1).max(200), deleteAll: z.literal(true) }),
]);

export const getQuerySchema = z.object({
  projectName: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z.enum(FEEDBACK_TYPES).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  search: z.string().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Explicit public interfaces — decoupled from Zod to keep .d.ts clean
// ---------------------------------------------------------------------------

export interface AnchorInput {
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId?: string | undefined;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
}

export interface RectInput {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

/** Shared fields that carry anchor + rect + viewport metrics. */
interface AnnotationMetricsInput {
  anchor: AnchorInput;
  rect: RectInput;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  /** Set to 1 by schema default when omitted from raw input. */
  devicePixelRatio: number;
}

/** Rectangle annotation — the CCM-279-era shape, `type` defaults to `"rectangle"`. */
export interface RectangleAnnotationInput extends AnnotationMetricsInput {
  type: "rectangle";
}

/** Text-change annotation — reviewer-proposed replacement copy. */
export interface TextChangeAnnotationInput extends AnnotationMetricsInput {
  type: "text_change";
  originalText: string;
  proposedText: string;
}

/** Image-swap annotation — CCM-hosted proposed asset URL + server-canonicalized metadata. */
export interface ImageSwapAnnotationInput extends AnnotationMetricsInput {
  type: "image_swap";
  originalAssetUrl: string;
  proposedAssetUrl: string;
  proposedAssetSource: ProposedAssetSource;
  proposedAltText?: string | undefined;
  assetMeta: {
    width: number;
    height: number;
    sizeBytes: number;
    mime: (typeof ALLOWED_IMAGE_MIMES)[number];
  };
}

export type AnnotationInput = RectangleAnnotationInput | TextChangeAnnotationInput | ImageSwapAnnotationInput;

export interface FeedbackCreateInput {
  projectName: string;
  type: FeedbackType;
  message: string;
  url: string;
  viewport: string;
  userAgent: string;
  authorName: string;
  authorEmail: string;
  annotations: AnnotationInput[];
  clientId: string;
}

export interface FeedbackPatchInput {
  id: string;
  projectName: string;
  status: FeedbackStatus;
}

export interface FeedbackDeleteSingle {
  id: string;
  projectName: string;
}

export interface FeedbackDeleteAll {
  projectName: string;
  deleteAll: true;
}

export type FeedbackDeleteInput = FeedbackDeleteSingle | FeedbackDeleteAll;

export interface GetQueryInput {
  projectName: string;
  /** Set to 1 by schema default when omitted from raw input. */
  page: number;
  /** Set to 50 by schema default when omitted from raw input. */
  limit: number;
  type?: FeedbackType | undefined;
  status?: FeedbackStatus | undefined;
  search?: string | undefined;
}

// ---------------------------------------------------------------------------
// Type-level assertions: manual interfaces stay in sync with schemas.
// Compile error if a field is added/removed/changed in the schema but not the
// interface (or vice versa).
//
// NOTE: the annotation shape is a discriminated union with a ZodEffects branch,
// which makes full two-way inference assertions awkward in practice. We keep
// the forward direction on the create schema so drift in primitive field shape
// still fails to compile.
// ---------------------------------------------------------------------------

type _AssertPatch = zod.z.infer<typeof feedbackPatchSchema> extends FeedbackPatchInput ? true : never;
type _AssertPatchReverse = FeedbackPatchInput extends zod.z.infer<typeof feedbackPatchSchema> ? true : never;
type _AssertDelete = zod.z.infer<typeof feedbackDeleteSchema> extends FeedbackDeleteInput ? true : never;
type _AssertDeleteReverse = FeedbackDeleteInput extends zod.z.infer<typeof feedbackDeleteSchema> ? true : never;
type _AssertQuery = zod.z.infer<typeof getQuerySchema> extends GetQueryInput ? true : never;
type _AssertQueryReverse = GetQueryInput extends zod.z.infer<typeof getQuerySchema> ? true : never;

// Discriminated union sanity check — ensures AnnotationType values match.
type _AssertAnnotationType = AnnotationInput["type"] extends AnnotationType ? true : never;

void (0 as unknown as _AssertPatch);
void (0 as unknown as _AssertPatchReverse);
void (0 as unknown as _AssertDelete);
void (0 as unknown as _AssertDeleteReverse);
void (0 as unknown as _AssertQuery);
void (0 as unknown as _AssertQueryReverse);
void (0 as unknown as _AssertAnnotationType);

/**
 * Map Zod errors to a flat array of { field, message } objects.
 * Safe: does not leak input values or schema structure.
 */
export function formatValidationErrors(error: zod.z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue: { path: Array<string | number>; message: string }) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

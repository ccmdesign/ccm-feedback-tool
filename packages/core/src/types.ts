// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Configuration options for the CCM Feedback widget. */
export interface CcmFeedbackConfig {
  /** HTTP endpoint that receives feedbacks (e.g. '/api/feedback'). Required unless `store` is provided. */
  endpoint?: string | undefined;
  /** Required — project identifier used to scope feedbacks */
  projectName: string;
  /** Direct store for client-side mode. When set, bypasses HTTP and uses the store directly in the browser. */
  store?: CcmFeedbackStore | undefined;
  /** FAB position — defaults to 'bottom-right' */
  position?: "bottom-right" | "bottom-left";
  /** Accent color for the widget UI — defaults to '#0066ff' */
  accentColor?: string;
  /** Show the widget even in production — defaults to false */
  forceShow?: boolean;
  /** Enable debug logging of lifecycle events — defaults to false */
  debug?: boolean;
  /** Color theme — defaults to 'light' */
  theme?: "light" | "dark" | "auto";
  /** UI locale — defaults to 'en' */
  locale?: "fr" | "en" | (string & {}) | undefined;
  /**
   * Optional agent API URL — shown to developers via an "API link" pill in the
   * panel header (copy-to-clipboard). Used only for display; the widget itself
   * never calls the agent API. CCM-290.
   */
  agentApiUrl?: string | undefined;
  /** Called when the widget is skipped (production mode, mobile viewport) */
  onSkip?: (reason: "production" | "mobile") => void;

  // Events
  /** Called when the feedback panel is opened. */
  onOpen?: () => void;
  /** Called when the feedback panel is closed. */
  onClose?: () => void;
  onFeedbackSent?: (feedback: FeedbackResponse) => void;
  onError?: (error: Error) => void;
  /** Called when the user starts drawing an annotation. */
  onAnnotationStart?: () => void;
  /** Called when the user finishes drawing an annotation. */
  onAnnotationEnd?: () => void;
}

/** Instance returned by initCcmFeedback() with lifecycle methods. */
export interface CcmFeedbackInstance {
  /** Remove the widget from the DOM and clean up all listeners. */
  destroy: () => void;
  /** Open the panel programmatically */
  open: () => void;
  /** Close the panel */
  close: () => void;
  /** Reload feedbacks from server */
  refresh: () => void;
  /** Subscribe to a public widget event */
  on: <K extends keyof CcmFeedbackPublicEvents>(
    event: K,
    listener: (...args: CcmFeedbackPublicEvents[K]) => void,
  ) => () => void;
  /** Unsubscribe from a public widget event */
  off: <K extends keyof CcmFeedbackPublicEvents>(
    event: K,
    listener: (...args: CcmFeedbackPublicEvents[K]) => void,
  ) => void;
}

/** Events exposed to consumers via CcmFeedbackInstance.on / .off */
export interface CcmFeedbackPublicEvents {
  "feedback:sent": [FeedbackResponse];
  "feedback:deleted": [string];
  "panel:open": [];
  "panel:close": [];
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

/** Single source of truth for feedback types — used by both TS types and Zod schemas. */
export const FEEDBACK_TYPES = ["comment", "question", "change", "bug", "other"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

/** Source of a reply on a feedback thread. */
export const REPLY_SOURCES = ["user", "agent"] as const;
export type ReplySource = (typeof REPLY_SOURCES)[number];

/** Single source of truth for feedback statuses. */
export const FEEDBACK_STATUSES = ["open", "resolved"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

// ---------------------------------------------------------------------------
// CCM-282 — Annotation intents
// ---------------------------------------------------------------------------

/** Annotation intent discriminator values. */
export const ANNOTATION_TYPES = ["rectangle", "text_change", "image_swap"] as const;
export type AnnotationType = (typeof ANNOTATION_TYPES)[number];

/** Source of a proposed image asset. */
export const PROPOSED_ASSET_SOURCES = ["link", "upload"] as const;
export type ProposedAssetSource = (typeof PROPOSED_ASSET_SOURCES)[number];

/** Supported MIME types for image swap uploads / mirrors. */
export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/gif",
] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

/**
 * MIME types accepted by the signed-upload path (direct client PUT to Storage).
 *
 * SVG is intentionally excluded here (CCM-282 P1): the signed-upload path lets
 * the client PUT raw bytes directly to Supabase Storage, bypassing every
 * server-side check. The mirror path (`/api/v1/assets/mirror`) runs
 * `isSafeSvg()` on SVG bytes before upload; the signed-upload path has no such
 * hook. Rather than add a fragile post-upload verify step, we force all SVG
 * ingress through the mirror path (paste-a-URL) until a full DOMPurify
 * sanitizer lands.
 *
 * Callers that want "everything including SVG" should use `ALLOWED_IMAGE_MIMES`.
 */
export const UPLOAD_ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"] as const;
export type UploadAllowedImageMime = (typeof UPLOAD_ALLOWED_IMAGE_MIMES)[number];

/** Maximum uploaded / mirrored asset size in bytes (10 MB). */
export const MAX_ASSET_SIZE_BYTES = 10 * 1024 * 1024;

/** Server-canonicalized image metadata — written to `FeedbackAnnotation.assetMeta`. */
export interface AssetMeta {
  width: number;
  height: number;
  sizeBytes: number;
  mime: AllowedImageMime;
}

// ---------------------------------------------------------------------------
// Abstract Store — adapter pattern
// ---------------------------------------------------------------------------

/** Input for creating a feedback record in the store. */
export interface FeedbackCreateInput {
  projectName: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  url: string;
  viewport: string;
  userAgent: string;
  authorName: string;
  authorEmail: string;
  clientId: string;
  annotations: AnnotationCreateInput[];
}

/** Input for a single annotation when creating a feedback. */
export interface AnnotationCreateInput {
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId?: string | undefined;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  devicePixelRatio: number;
  /** CCM-282: annotation intent. Defaults to "rectangle" when omitted by rectangle-only callers. */
  type?: AnnotationType | undefined;
  /** CCM-282: text_change intent — original text content. */
  originalText?: string | undefined;
  /** CCM-282: text_change intent — proposed text content. */
  proposedText?: string | undefined;
  /** CCM-282: image_swap intent — pre-swap asset URL (snapshot, may be external). */
  originalAssetUrl?: string | undefined;
  /** CCM-282: image_swap intent — CCM-hosted mirror URL. ALWAYS on the CCM storage origin. */
  proposedAssetUrl?: string | undefined;
  /** CCM-282: image_swap intent — how the proposed asset arrived ("link" or "upload"). */
  proposedAssetSource?: ProposedAssetSource | undefined;
  /** CCM-282: image_swap intent — alt text entered by the reviewer. */
  proposedAltText?: string | undefined;
  /** CCM-282: image_swap intent — server-canonicalized image metadata. */
  assetMeta?: AssetMeta | undefined;
  /** CCM-284 — optional public URL of the persisted voice audio for this annotation. */
  audioUrl?: string | undefined;
}

/** Query parameters for fetching feedbacks. */
export interface FeedbackQuery {
  projectName: string;
  type?: FeedbackType | undefined;
  status?: FeedbackStatus | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/** Update payload for patching a feedback. */
export interface FeedbackUpdateInput {
  status: FeedbackStatus;
  resolvedAt: Date | null;
}

/** Input for creating a reply row on an existing feedback. CCM-290. */
export interface ReplyCreateInput {
  feedbackId: string;
  source: ReplySource;
  author: string;
  authorEmail?: string | undefined;
  body: string;
}

/** A persisted reply record returned by the store. CCM-290. */
export interface ReplyRecord {
  id: string;
  feedbackId: string;
  source: ReplySource;
  author: string;
  authorEmail: string | null;
  body: string;
  createdAt: Date;
}

/** A persisted feedback record returned by the store. */
export interface FeedbackRecord {
  id: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  projectName: string;
  /** Optional — hydrated by the adapter during the CCM-279 migration window. */
  projectId?: string | null;
  url: string;
  authorName: string;
  authorEmail: string;
  viewport: string;
  userAgent: string;
  clientId: string;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  annotations: AnnotationRecord[];
  /** CCM-290 — threaded reply records (oldest first). Empty when no replies. */
  replies: ReplyRecord[];
}

/** A persisted annotation record returned by the store. */
export interface AnnotationRecord {
  id: string;
  feedbackId: string;
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId: string | null;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  devicePixelRatio: number;
  createdAt: Date;
  /** Implementation status — defaults to "submitted" at DB level. */
  status?: string;
  /** Implementation agent result payload (PR URL, task URL, reasoning, etc.). */
  implementationResult?: unknown;
  /** When the latest status update was received. */
  implementationUpdatedAt?: Date | null;
  /** CCM-282: annotation intent — defaults to "rectangle". */
  type?: AnnotationType;
  originalText?: string | null;
  proposedText?: string | null;
  originalAssetUrl?: string | null;
  proposedAssetUrl?: string | null;
  proposedAssetSource?: ProposedAssetSource | null;
  proposedAltText?: string | null;
  assetMeta?: AssetMeta | null;
  /** CCM-284 — optional public URL of the persisted voice audio for this annotation. */
  audioUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Store errors — throw these from adapter implementations
// ---------------------------------------------------------------------------

/**
 * Thrown when a record is not found during update or delete.
 *
 * Handlers translate this to HTTP 404. Adapters MUST throw this (not
 * ORM-specific errors) so the handler layer remains ORM-agnostic.
 */
export class StoreNotFoundError extends Error {
  readonly code = "STORE_NOT_FOUND" as const;
  constructor(message = "Record not found") {
    super(message);
    this.name = "StoreNotFoundError";
  }
}

/**
 * Thrown when a unique constraint is violated (e.g. duplicate `clientId`).
 *
 * Handlers use this to return the existing record instead of failing.
 */
export class StoreDuplicateError extends Error {
  readonly code = "STORE_DUPLICATE" as const;
  constructor(message = "Duplicate record") {
    super(message);
    this.name = "StoreDuplicateError";
  }
}

/** Type guard — works for `StoreNotFoundError` and ORM-specific equivalents (e.g. Prisma P2025). */
export function isStoreNotFound(error: unknown): boolean {
  if (error instanceof StoreNotFoundError) return true;
  // Backwards compat: Prisma's P2025
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2025";
}

/** Type guard — works for `StoreDuplicateError` and ORM-specific equivalents (e.g. Prisma P2002). */
export function isStoreDuplicate(error: unknown): boolean {
  if (error instanceof StoreDuplicateError) return true;
  // Backwards compat: Prisma's P2002
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
}

// ---------------------------------------------------------------------------
// Store helpers — shared conversion logic for adapters
// ---------------------------------------------------------------------------

/**
 * Flatten a widget `AnnotationPayload` (nested anchor + rect) into a flat `AnnotationCreateInput`.
 *
 * Preserves the CCM-282 annotation intent discriminator and any type-specific
 * fields the widget carries for `text_change` / `image_swap`. Optional fields
 * are only set when present — keeping `exactOptionalPropertyTypes` happy.
 */
export function flattenAnnotation(ann: AnnotationPayload): AnnotationCreateInput {
  const base: AnnotationCreateInput = {
    cssSelector: ann.anchor.cssSelector,
    xpath: ann.anchor.xpath,
    textSnippet: ann.anchor.textSnippet,
    elementTag: ann.anchor.elementTag,
    elementId: ann.anchor.elementId,
    textPrefix: ann.anchor.textPrefix,
    textSuffix: ann.anchor.textSuffix,
    fingerprint: ann.anchor.fingerprint,
    neighborText: ann.anchor.neighborText,
    xPct: ann.rect.xPct,
    yPct: ann.rect.yPct,
    wPct: ann.rect.wPct,
    hPct: ann.rect.hPct,
    scrollX: ann.scrollX,
    scrollY: ann.scrollY,
    viewportW: ann.viewportW,
    viewportH: ann.viewportH,
    devicePixelRatio: ann.devicePixelRatio,
    type: ann.type ?? "rectangle",
    ...(ann.audioUrl ? { audioUrl: ann.audioUrl } : {}),
  };

  if (ann.type === "text_change") {
    if (ann.originalText !== undefined) base.originalText = ann.originalText;
    if (ann.proposedText !== undefined) base.proposedText = ann.proposedText;
  } else if (ann.type === "image_swap") {
    if (ann.originalAssetUrl !== undefined) base.originalAssetUrl = ann.originalAssetUrl;
    if (ann.proposedAssetUrl !== undefined) base.proposedAssetUrl = ann.proposedAssetUrl;
    if (ann.proposedAssetSource !== undefined) base.proposedAssetSource = ann.proposedAssetSource;
    if (ann.proposedAltText !== undefined) base.proposedAltText = ann.proposedAltText;
    if (ann.assetMeta !== undefined) base.assetMeta = ann.assetMeta;
  }

  return base;
}

/** Type guard — annotation carries a `text_change` payload. */
export function isTextChangeAnnotation(
  ann: Pick<AnnotationCreateInput, "type" | "originalText" | "proposedText">,
): ann is AnnotationCreateInput & { type: "text_change"; originalText: string; proposedText: string } {
  return ann.type === "text_change" && typeof ann.originalText === "string" && typeof ann.proposedText === "string";
}

/** Type guard — annotation carries an `image_swap` payload. */
export function isImageSwapAnnotation(
  ann: Pick<
    AnnotationCreateInput,
    "type" | "originalAssetUrl" | "proposedAssetUrl" | "proposedAssetSource" | "assetMeta"
  >,
): ann is AnnotationCreateInput & {
  type: "image_swap";
  originalAssetUrl: string;
  proposedAssetUrl: string;
  proposedAssetSource: ProposedAssetSource;
  assetMeta: AssetMeta;
} {
  return (
    ann.type === "image_swap" &&
    typeof ann.originalAssetUrl === "string" &&
    typeof ann.proposedAssetUrl === "string" &&
    (ann.proposedAssetSource === "link" || ann.proposedAssetSource === "upload") &&
    typeof ann.assetMeta === "object" &&
    ann.assetMeta !== null
  );
}

// ---------------------------------------------------------------------------
// Abstract Store — adapter pattern
// ---------------------------------------------------------------------------

/**
 * Abstract storage interface for CCM Feedback.
 *
 * Any adapter (Prisma, Drizzle, raw SQL, localStorage, etc.) implements this
 * interface. The HTTP handler and widget `StoreClient` operate against
 * `CcmFeedbackStore`, decoupled from the storage backend.
 *
 * ## Error contract
 *
 * - **`updateFeedback` / `deleteFeedback`**: throw `StoreNotFoundError` when
 *   the record does not exist.
 * - **`createFeedback`**: either return the existing record on duplicate
 *   `clientId` (idempotent) or throw `StoreDuplicateError`. The handler
 *   handles both patterns.
 * - Other methods should not throw on empty results — return empty arrays or `null`.
 */
export interface CcmFeedbackStore {
  /** Create a feedback with its annotations. Idempotent on `clientId` — return existing record on duplicate, or throw `StoreDuplicateError`. */
  createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord>;
  /** Paginated query with optional filters. Returns empty array (not error) when no results. */
  getFeedbacks(query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }>;
  /** Lookup by client-generated UUID. Returns `null` (not error) when not found. */
  findByClientId(clientId: string): Promise<FeedbackRecord | null>;
  /**
   * CCM-290 — fetch a single feedback (with annotations + replies) by id.
   * Returns `null` when no record matches. Used by the agent handler to enforce
   * cross-project isolation without paginating. Must bypass any pagination cap
   * and return the full relations graph, just like `getFeedbacks` items.
   */
  findById(id: string): Promise<FeedbackRecord | null>;
  /** Update status/resolvedAt. Throws `StoreNotFoundError` if `id` does not exist. */
  updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord>;
  /** Delete a single record. Throws `StoreNotFoundError` if `id` does not exist. */
  deleteFeedback(id: string): Promise<void>;
  /** Bulk delete all feedbacks for a project. No-op (not error) if none exist. */
  deleteAllFeedbacks(projectName: string): Promise<void>;
  /**
   * CCM-290 — append a reply to a feedback. Throws `StoreNotFoundError` when
   * `feedbackId` does not exist. The caller supplies the `source` tag
   * (`"user"` for widget submissions, `"agent"` for agent API calls).
   */
  addReply(input: ReplyCreateInput): Promise<ReplyRecord>;
  /**
   * CCM-290 — list replies for a feedback, ordered by `createdAt` ascending
   * (oldest first). Returns an empty array when the feedback has no replies.
   */
  listReplies(feedbackId: string): Promise<ReplyRecord[]>;
}

/** Payload sent from the widget to the server when submitting feedback. */
export interface FeedbackPayload {
  projectName: string;
  type: FeedbackType;
  message: string;
  url: string;
  viewport: string;
  userAgent: string;
  authorName: string;
  authorEmail: string;
  annotations: AnnotationPayload[];
  /** Client-generated UUID for deduplication */
  clientId: string;
}

// ---------------------------------------------------------------------------
// CCM-279 — Project + ReviewBatch store interfaces (siblings of CcmFeedbackStore)
// ---------------------------------------------------------------------------

/**
 * Project store contract. Implemented by the Prisma adapter. Non-Prisma
 * adapters (memory, localStorage) may leave these methods unimplemented —
 * projects are persistent configuration, not ephemeral widget state.
 */
export interface CcmProjectStore {
  createProject(input: { name: string; stagingUrl: string; implementationWebhookUrl?: string | null }): Promise<{
    id: string;
    name: string;
    stagingUrl: string;
    implementationWebhookUrl: string | null;
    createdAt: Date;
    /** Plaintext secret — shown exactly once. */
    secret: string;
  }>;
  listProjects(): Promise<
    Array<{
      id: string;
      name: string;
      stagingUrl: string;
      implementationWebhookUrl: string | null;
      hasSecret: boolean;
      createdAt: Date;
    }>
  >;
  getProject(id: string): Promise<{
    id: string;
    name: string;
    stagingUrl: string;
    implementationWebhookUrl: string | null;
    hasSecret: boolean;
    createdAt: Date;
  } | null>;
  /** Internal getter — includes the hash for dispatch-time signing. */
  getProjectWithSecret(id: string): Promise<{
    id: string;
    name: string;
    stagingUrl: string;
    implementationWebhookUrl: string | null;
    implementationWebhookSecretHash: string | null;
    createdAt: Date;
  } | null>;
  updateProject(
    id: string,
    patch: {
      name?: string;
      stagingUrl?: string;
      implementationWebhookUrl?: string | null;
    },
  ): Promise<void>;
  rotateProjectSecret(id: string): Promise<{ secret: string }>;
  verifyProjectSecret(id: string, plaintext: string): Promise<boolean>;
  deleteProject(id: string): Promise<void>;
  /**
   * CCM-290 — rotate (or initially generate) the plaintext agent token for the
   * given project. Returns the new token exactly once. This token gates the
   * agent HTTP API (`/api/v1/agent/feedback`). Plaintext-on-disk is
   * intentional (user decision); comparisons at the handler must still use a
   * timing-safe primitive.
   */
  rotateAgentToken(id: string): Promise<{ agentToken: string }>;
  /**
   * CCM-290 — look up a project by its agent token using a timing-safe
   * compare. Returns `null` when no project matches. Implementations SHOULD
   * iterate every non-null `agentToken` and use `timingSafeEqual` for each
   * comparison rather than an index-backed lookup (which leaks rough
   * existence through query timing).
   */
  findByAgentToken(token: string): Promise<{ id: string; name: string } | null>;
}

/**
 * ReviewBatch store contract. Implemented by the Prisma adapter. The dispatcher
 * operates against this interface so it can be exercised in tests without a
 * real Prisma client.
 */
export interface CcmReviewBatchStore {
  createReviewBatch(input: {
    projectId: string;
    reviewerName: string;
    reviewerEmail?: string | null;
    annotationIds: string[];
  }): Promise<{
    id: string;
    projectId: string;
    reviewerName: string;
    reviewerEmail: string | null;
    submittedAt: Date;
    annotationIds: string[];
  }>;
  getReviewBatch(id: string): Promise<{
    id: string;
    projectId: string;
    reviewerName: string;
    reviewerEmail: string | null;
    submittedAt: Date;
    dispatchStatus: string;
    dispatchAttempts: number;
    dispatchedAt: Date | null;
    nextAttemptAt: Date | null;
    dispatchLastError: string | null;
    canonicalBody: string | null;
    annotationIds: string[];
  } | null>;
  listRetryingReviewBatches(limit: number): Promise<
    Array<{
      id: string;
      projectId: string;
      submittedAt: Date;
      dispatchAttempts: number;
      nextAttemptAt: Date | null;
    }>
  >;
  updateReviewBatchDispatch(
    id: string,
    patch: {
      dispatchStatus?: string;
      dispatchAttempts?: number;
      dispatchedAt?: Date | null;
      nextAttemptAt?: Date | null;
      dispatchLastError?: string | null;
      canonicalBody?: string | null;
    },
  ): Promise<void>;
  /** Update the per-annotation status record; "newer updated_at wins" semantics. */
  applyAnnotationStatus(input: {
    annotationId: string;
    status: string;
    result: unknown;
    updatedAt: Date;
  }): Promise<{ applied: boolean }>;
  /** Load annotations by id with the parent feedback for payload assembly. */
  getAnnotationsForDispatch(ids: string[]): Promise<
    Array<{
      id: string;
      feedbackId: string;
      feedbackProjectId: string | null;
      feedbackProjectName: string;
      feedbackType: string;
      feedbackMessage: string;
      feedbackUrl: string;
      cssSelector: string;
      xpath: string;
      textSnippet: string;
      elementTag: string;
      elementId: string | null;
      textPrefix: string;
      textSuffix: string;
      fingerprint: string;
      neighborText: string;
      xPct: number;
      yPct: number;
      wPct: number;
      hPct: number;
      scrollX: number;
      scrollY: number;
      viewportW: number;
      viewportH: number;
      devicePixelRatio: number;
      createdAt: Date;
      /** CCM-282: annotation intent discriminator. */
      type?: AnnotationType;
      originalText?: string | null;
      proposedText?: string | null;
      originalAssetUrl?: string | null;
      proposedAssetUrl?: string | null;
      proposedAssetSource?: ProposedAssetSource | null;
      proposedAltText?: string | null;
      assetMeta?: AssetMeta | null;
      /** CCM-284 — optional public URL of the persisted voice audio for this annotation. */
      audioUrl?: string | null;
    }>
  >;
}

// ---------------------------------------------------------------------------
// Annotation — multi-selector anchoring (Hypothesis / W3C Web Annotation)
// ---------------------------------------------------------------------------

/** DOM anchoring data for re-attaching annotations to page elements. */
export interface AnchorData {
  /** CSS selector generated by @medv/finder — primary anchor */
  cssSelector: string;
  /** XPath — fallback 1 */
  xpath: string;
  /** First ~120 chars of element innerText — empty string if none */
  textSnippet: string;
  /** Tag name for validation (e.g. "DIV", "SECTION") */
  elementTag: string;
  /** Element id attribute if available — most stable */
  elementId?: string | undefined;
  /** ~32 chars of text before this element in document flow (disambiguation) */
  textPrefix: string;
  /** ~32 chars of text after this element in document flow (disambiguation) */
  textSuffix: string;
  /** Structural fingerprint: "childCount:siblingIdx:attrHash" */
  fingerprint: string;
  /** Text content of adjacent sibling elements (context) */
  neighborText: string;
}

/** Drawn rectangle coordinates as percentages relative to the anchor element. */
export interface RectData {
  /** X offset as fraction of anchor element width — must be in range [0, 1] */
  xPct: number;
  /** Y offset as fraction of anchor element height — must be in range [0, 1] */
  yPct: number;
  /** Width as fraction of anchor element width — must be in range [0, 1] */
  wPct: number;
  /** Height as fraction of anchor element height — must be in range [0, 1] */
  hPct: number;
}

/** Annotation data sent as part of a feedback submission. */
export interface AnnotationPayload {
  anchor: AnchorData;
  rect: RectData;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  devicePixelRatio: number;
  /** CCM-282: annotation intent — defaults to "rectangle" when omitted. */
  type?: AnnotationType | undefined;
  /** CCM-282: text_change intent — original text. */
  originalText?: string | undefined;
  /** CCM-282: text_change intent — proposed text. */
  proposedText?: string | undefined;
  /** CCM-282: image_swap intent — pre-swap asset URL (snapshot). */
  originalAssetUrl?: string | undefined;
  /** CCM-282: image_swap intent — CCM-hosted mirrored asset URL. */
  proposedAssetUrl?: string | undefined;
  /** CCM-282: image_swap intent — source of the proposed asset. */
  proposedAssetSource?: ProposedAssetSource | undefined;
  /** CCM-282: image_swap intent — reviewer-entered alt text. */
  proposedAltText?: string | undefined;
  /** CCM-282: image_swap intent — server-canonicalized image metadata. */
  assetMeta?: AssetMeta | undefined;
  /** CCM-284 — optional public URL of the persisted voice audio for this annotation. */
  audioUrl?: string | undefined;
}

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------

/** Feedback record as returned by the API (dates serialized as strings). */
export interface FeedbackResponse {
  id: string;
  projectName: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  url: string;
  viewport: string;
  userAgent: string;
  authorName: string;
  authorEmail: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  annotations: AnnotationResponse[];
  /** CCM-290 — reply records serialized for the wire. */
  replies: ReplyResponse[];
}

/** CCM-290 — reply record as returned by the API (createdAt is ISO string). */
export interface ReplyResponse {
  id: string;
  feedbackId: string;
  source: ReplySource;
  author: string;
  authorEmail: string | null;
  body: string;
  createdAt: string;
}

/** Annotation record as returned by the API. */
export interface AnnotationResponse {
  id: string;
  feedbackId: string;
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId: string | null;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  devicePixelRatio: number;
  createdAt: string;
  /** CCM-279 implementation status. */
  status?: string;
  /** CCM-279 implementation agent result payload. */
  implementationResult?: unknown;
  /** CCM-279 when the implementation agent last reported status. ISO string. */
  implementationUpdatedAt?: string | null;
  /** CCM-282: annotation intent. */
  type?: AnnotationType;
  originalText?: string | null;
  proposedText?: string | null;
  originalAssetUrl?: string | null;
  proposedAssetUrl?: string | null;
  proposedAssetSource?: ProposedAssetSource | null;
  proposedAltText?: string | null;
  assetMeta?: AssetMeta | null;
  /** CCM-284 — optional public URL of the persisted voice audio for this annotation. */
  audioUrl?: string | null;
}

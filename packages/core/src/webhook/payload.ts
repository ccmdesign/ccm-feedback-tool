/**
 * Outbound webhook payload types — spec §6.1.
 *
 * The server POSTs a WebhookPayload to a project's implementationWebhookUrl
 * every time a reviewer submits a batch. Field names mirror §6.1 verbatim so
 * implementation agents can consume the contract without a translation
 * layer. Fields use snake_case to match the spec.
 */

/** Known annotation "types" emitted by the widget. CCM-282 adds text_change + image_swap. */
export const WEBHOOK_ANNOTATION_TYPES = ["comment", "text_change", "area", "image_swap"] as const;
export type WebhookAnnotationType = (typeof WEBHOOK_ANNOTATION_TYPES)[number];

/** Canonical asset metadata emitted on `image_swap` annotations. */
export interface WebhookAssetMeta {
  width: number;
  height: number;
  size_bytes: number;
  mime: string;
}

/** Reviewer metadata. */
export interface WebhookReviewerPayload {
  name: string;
  email?: string;
}

/** Anchor information — DOM-anchored selectors used by the implementation agent. */
export interface WebhookAnnotationAnchor {
  css_selector: string;
  xpath: string;
  text_snippet: string;
  element_tag: string;
  element_id?: string;
  text_prefix: string;
  text_suffix: string;
  fingerprint: string;
  neighbor_text: string;
}

/** Rectangle normalized as fractions of the anchor element. */
export interface WebhookAnnotationRect {
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
}

/** Single annotation in an outbound webhook payload. */
export interface WebhookAnnotationPayload {
  /** Stable UUID used for idempotency across retries and callbacks. */
  id: string;
  /** Feedback type — reused from the widget's FeedbackType union (question/change/bug/other). */
  type: WebhookAnnotationType | (string & {});
  message: string;
  /** Absolute URL the reviewer was on when the annotation was captured. */
  url: string;
  /** ISO-8601 UTC timestamp of annotation creation. */
  created_at: string;
  anchor: WebhookAnnotationAnchor;
  rect: WebhookAnnotationRect;
  scroll_x: number;
  scroll_y: number;
  viewport_w: number;
  viewport_h: number;
  device_pixel_ratio: number;
  // CCM-282 — type-specific fields at annotation top level (spec §6.1).
  /** Widget-intent discriminator — "rectangle" | "text_change" | "image_swap". */
  annotation_type?: string;
  /** `text_change` — original text node content. */
  original_text?: string;
  /** `text_change` — proposed text node content. */
  proposed_text?: string;
  /** `image_swap` — pre-swap asset URL (may be external / reviewer-provided). */
  original_asset_url?: string;
  /** `image_swap` — CCM-hosted mirrored asset URL. NEVER the external source. */
  proposed_asset_url?: string;
  /** `image_swap` — how the proposed asset arrived ("link" or "upload"). */
  proposed_asset_source?: string;
  /** `image_swap` — reviewer-entered alt text (may be empty). */
  proposed_alt_text?: string;
  /** `image_swap` — server-canonicalized image metadata. */
  asset_meta?: WebhookAssetMeta;
  /**
   * CCM-284 — optional public URL of the persisted voice audio for this annotation.
   * Absent from the payload when the project did not opt into audio persistence.
   */
  audio_url?: string;
}

/** Top-level WebhookPayload — the canonical §6.1 contract. */
export interface WebhookPayload {
  schema_version: "1";
  /** Stable UUID for the review batch. */
  review_id: string;
  project_id: string;
  project_name: string;
  submitted_at: string;
  reviewer: WebhookReviewerPayload;
  annotations: WebhookAnnotationPayload[];
}

/** Input used by the builder to assemble a WebhookPayload. */
export interface WebhookPayloadBuilderInput {
  reviewId: string;
  projectId: string;
  projectName: string;
  submittedAt: Date | string;
  reviewer: { name: string; email?: string | null };
  annotations: Array<{
    id: string;
    type: string;
    message: string;
    url: string;
    createdAt: Date | string;
    anchor: {
      cssSelector: string;
      xpath: string;
      textSnippet: string;
      elementTag: string;
      elementId?: string | null;
      textPrefix: string;
      textSuffix: string;
      fingerprint: string;
      neighborText: string;
    };
    rect: { xPct: number; yPct: number; wPct: number; hPct: number };
    scrollX: number;
    scrollY: number;
    viewportW: number;
    viewportH: number;
    devicePixelRatio: number;
    // CCM-282 — annotation intent discriminator + type-specific fields.
    annotationType?: string | null;
    originalText?: string | null;
    proposedText?: string | null;
    originalAssetUrl?: string | null;
    proposedAssetUrl?: string | null;
    proposedAssetSource?: string | null;
    proposedAltText?: string | null;
    assetMeta?: {
      width: number;
      height: number;
      sizeBytes: number;
      mime: string;
    } | null;
    /** CCM-284 — optional public URL of the persisted voice audio for this annotation. */
    audioUrl?: string | null;
  }>;
}

function isoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  // Trust that upstream passed an ISO string.
  return value;
}

/**
 * Build a WebhookPayload from the flat shapes the adapter already hydrates
 * (Project + ReviewBatch + FeedbackAnnotation join). Normalizes dates to ISO
 * strings so the canonicalizer sees a deterministic representation.
 */
export function buildWebhookPayload(input: WebhookPayloadBuilderInput): WebhookPayload {
  return {
    schema_version: "1",
    review_id: input.reviewId,
    project_id: input.projectId,
    project_name: input.projectName,
    submitted_at: isoString(input.submittedAt),
    reviewer: {
      name: input.reviewer.name,
      ...(input.reviewer.email ? { email: input.reviewer.email } : {}),
    },
    annotations: input.annotations.map((ann) => {
      const base: WebhookAnnotationPayload = {
        id: ann.id,
        type: ann.type,
        message: ann.message,
        url: ann.url,
        created_at: isoString(ann.createdAt),
        anchor: {
          css_selector: ann.anchor.cssSelector,
          xpath: ann.anchor.xpath,
          text_snippet: ann.anchor.textSnippet,
          element_tag: ann.anchor.elementTag,
          ...(ann.anchor.elementId ? { element_id: ann.anchor.elementId } : {}),
          text_prefix: ann.anchor.textPrefix,
          text_suffix: ann.anchor.textSuffix,
          fingerprint: ann.anchor.fingerprint,
          neighbor_text: ann.anchor.neighborText,
        },
        rect: {
          x_pct: ann.rect.xPct,
          y_pct: ann.rect.yPct,
          w_pct: ann.rect.wPct,
          h_pct: ann.rect.hPct,
        },
        scroll_x: ann.scrollX,
        scroll_y: ann.scrollY,
        viewport_w: ann.viewportW,
        viewport_h: ann.viewportH,
        device_pixel_ratio: ann.devicePixelRatio,
      };

      // CCM-282 — emit annotation intent + type-specific fields at annotation top level.
      const intent = ann.annotationType ?? "rectangle";
      if (intent !== "rectangle") {
        base.annotation_type = intent;
      }

      if (intent === "text_change") {
        // Defensive: explicit empty strings are meaningful (diff of "x" -> "" is valid)
        if (typeof ann.originalText === "string") base.original_text = ann.originalText;
        if (typeof ann.proposedText === "string") base.proposed_text = ann.proposedText;
      } else if (intent === "image_swap") {
        if (ann.originalAssetUrl) base.original_asset_url = ann.originalAssetUrl;
        if (ann.proposedAssetUrl) base.proposed_asset_url = ann.proposedAssetUrl;
        if (ann.proposedAssetSource) base.proposed_asset_source = ann.proposedAssetSource;
        // Alt text is optional — omit if null/empty.
        if (ann.proposedAltText) base.proposed_alt_text = ann.proposedAltText;
        if (ann.assetMeta) {
          base.asset_meta = {
            width: ann.assetMeta.width,
            height: ann.assetMeta.height,
            size_bytes: ann.assetMeta.sizeBytes,
            mime: ann.assetMeta.mime,
          };
        }
      }

      // CCM-284 — emit audio_url at annotation top level when voice audio was persisted.
      if (ann.audioUrl) {
        base.audio_url = ann.audioUrl;
      }

      return base;
    }),
  };
}

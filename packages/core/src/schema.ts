/**
 * CCM Feedback database models — single source of truth.
 *
 * Used by:
 * - CLI to generate Prisma schema (via prisma-ast)
 * - Adapter for Zod validation
 * - Type exports
 *
 * This is a TS representation, NOT a .prisma file.
 * The CLI generates the actual Prisma schema from this definition.
 */

/** Definition of a single field in a CCM Feedback database model. */
export interface FieldDef {
  type: string;
  default?: string;
  optional?: boolean;
  relation?: {
    kind: "1-to-many" | "many-to-1";
    model: string;
    fields?: string[];
    references?: string[];
    onDelete?: string;
  };
  isId?: boolean;
  isUnique?: boolean;
  /** Prisma native type attribute (e.g. "Text" for @db.Text) — used for MySQL compatibility on long strings */
  nativeType?: string;
  /** Prisma @updatedAt attribute */
  isUpdatedAt?: boolean;
  /** Prisma list type (String[], etc.) */
  isList?: boolean;
}

/** Definition of a composite index on a CCM Feedback database model. */
export interface IndexDef {
  fields: string[];
}

/** Definition of a single CCM Feedback database model (fields + indexes). */
export interface ModelDef {
  fields: Record<string, FieldDef>;
  indexes?: IndexDef[];
}

const _CCM_FEEDBACK_MODELS = {
  Project: {
    fields: {
      id: { type: "String", isId: true, default: "cuid()" },
      name: { type: "String", isUnique: true },
      stagingUrl: { type: "String", default: '""' },
      implementationWebhookUrl: { type: "String", optional: true, nativeType: "Text" },
      implementationWebhookSecretHash: { type: "String", optional: true, nativeType: "Text" },
      createdAt: { type: "DateTime", default: "now()" },
      feedbacks: {
        type: "FeedbackItem",
        relation: { kind: "1-to-many", model: "FeedbackItem" },
      },
      reviewBatches: {
        type: "ReviewBatch",
        relation: { kind: "1-to-many", model: "ReviewBatch" },
      },
    },
    indexes: [{ fields: ["name"] }],
  },
  ReviewBatch: {
    fields: {
      id: { type: "String", isId: true, default: "cuid()" },
      projectId: { type: "String" },
      project: {
        type: "Project",
        relation: {
          kind: "many-to-1",
          model: "Project",
          fields: ["projectId"],
          references: ["id"],
          onDelete: "Cascade",
        },
      },
      reviewerName: { type: "String" },
      reviewerEmail: { type: "String", optional: true },
      submittedAt: { type: "DateTime", default: "now()" },
      dispatchStatus: { type: "String", default: '"pending"' },
      dispatchAttempts: { type: "Int", default: "0" },
      dispatchedAt: { type: "DateTime", optional: true },
      nextAttemptAt: { type: "DateTime", optional: true },
      dispatchLastError: { type: "String", optional: true, nativeType: "Text" },
      canonicalBody: { type: "String", optional: true, nativeType: "Text" },
      annotationIds: { type: "String", isList: true },
    },
    indexes: [
      { fields: ["projectId"] },
      { fields: ["dispatchStatus"] },
      { fields: ["dispatchStatus", "nextAttemptAt"] },
    ],
  },
  FeedbackItem: {
    fields: {
      id: { type: "String", isId: true, default: "cuid()" },
      projectName: { type: "String" },
      projectId: { type: "String", optional: true },
      project: {
        type: "Project",
        optional: true,
        relation: {
          kind: "many-to-1",
          model: "Project",
          fields: ["projectId"],
          references: ["id"],
          onDelete: "SetNull",
        },
      },
      type: { type: "String" },
      message: { type: "String", nativeType: "Text" },
      status: { type: "String", default: '"open"' },
      url: { type: "String" },
      viewport: { type: "String" },
      userAgent: { type: "String" },
      authorName: { type: "String" },
      authorEmail: { type: "String" },
      clientId: { type: "String", isUnique: true },
      resolvedAt: { type: "DateTime", optional: true },
      createdAt: { type: "DateTime", default: "now()" },
      updatedAt: { type: "DateTime", isUpdatedAt: true },
      annotations: {
        type: "FeedbackAnnotation",
        relation: { kind: "1-to-many", model: "FeedbackAnnotation" },
      },
    },
    indexes: [
      { fields: ["projectName"] },
      { fields: ["projectName", "status", "createdAt"] },
      { fields: ["projectId"] },
    ],
  },
  FeedbackAnnotation: {
    fields: {
      id: { type: "String", isId: true, default: "cuid()" },
      feedbackId: { type: "String" },
      feedback: {
        type: "FeedbackItem",
        relation: {
          kind: "many-to-1",
          model: "FeedbackItem",
          fields: ["feedbackId"],
          references: ["id"],
          onDelete: "Cascade",
        },
      },
      cssSelector: { type: "String", nativeType: "Text" },
      xpath: { type: "String", nativeType: "Text" },
      textSnippet: { type: "String", nativeType: "Text" },
      elementTag: { type: "String" },
      elementId: { type: "String", optional: true },
      textPrefix: { type: "String", nativeType: "Text" },
      textSuffix: { type: "String", nativeType: "Text" },
      fingerprint: { type: "String" },
      neighborText: { type: "String", nativeType: "Text" },
      xPct: { type: "Float" },
      yPct: { type: "Float" },
      wPct: { type: "Float" },
      hPct: { type: "Float" },
      scrollX: { type: "Float" },
      scrollY: { type: "Float" },
      viewportW: { type: "Int" },
      viewportH: { type: "Int" },
      devicePixelRatio: { type: "Float", default: "1" },
      createdAt: { type: "DateTime", default: "now()" },
      status: { type: "String", default: '"submitted"' },
      implementationResult: { type: "Json", optional: true },
      implementationUpdatedAt: { type: "DateTime", optional: true },
      // CCM-282: annotation intent discriminator + type-specific columns.
      type: { type: "String", default: '"rectangle"' },
      originalText: { type: "String", optional: true, nativeType: "Text" },
      proposedText: { type: "String", optional: true, nativeType: "Text" },
      originalAssetUrl: { type: "String", optional: true, nativeType: "Text" },
      proposedAssetUrl: { type: "String", optional: true, nativeType: "Text" },
      proposedAssetSource: { type: "String", optional: true },
      proposedAltText: { type: "String", optional: true, nativeType: "Text" },
      assetMeta: { type: "Json", optional: true },
      // CCM-284: optional public URL of the persisted voice audio.
      audioUrl: { type: "String", optional: true, nativeType: "Text" },
    },
    indexes: [{ fields: ["feedbackId"] }, { fields: ["status"] }, { fields: ["type"] }],
  },
} as const satisfies Record<string, ModelDef>;

export const CCM_FEEDBACK_MODELS = Object.freeze(_CCM_FEEDBACK_MODELS);

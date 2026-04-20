/**
 * Project + ReviewBatch contract types — source of truth for CCM-279.
 *
 * A Project represents one downstream client site that the widget emits
 * feedback for. Each project has an outbound webhook URL + secret pair used
 * to dispatch review batches to an implementation agent.
 *
 * A ReviewBatch is a set of annotation ids a reviewer submits in one
 * "Submit review" action. The backend dispatches the §6.1 payload to the
 * project's implementation webhook; dispatch state is persisted so retries
 * survive process restarts.
 */

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

/** Persisted Project row as returned by the store (no plaintext secret). */
export interface Project {
  id: string;
  name: string;
  stagingUrl: string;
  implementationWebhookUrl: string | null;
  /** Never includes plaintext. Shape: "scrypt:<saltBase64>:<hashBase64>". */
  implementationWebhookSecretHash: string | null;
  createdAt: Date;
}

/** Project fields safe to return from GET endpoints (public admin view). */
export interface ProjectPublic {
  id: string;
  name: string;
  stagingUrl: string;
  implementationWebhookUrl: string | null;
  /** Whether a secret is configured (not the secret itself). */
  hasSecret: boolean;
  createdAt: string;
}

/** Input for creating a project. */
export interface ProjectCreateInput {
  name: string;
  stagingUrl: string;
  implementationWebhookUrl?: string | null;
}

/** Input for patching a project. */
export interface ProjectUpdateInput {
  name?: string;
  stagingUrl?: string;
  implementationWebhookUrl?: string | null;
}

/** Response shape when a plaintext secret is minted. Only returned once. */
export interface ProjectSecretResponse {
  /** Plaintext secret — shown exactly once on create/rotate. */
  secret: string;
}

// ---------------------------------------------------------------------------
// ReviewBatch
// ---------------------------------------------------------------------------

/** Review-batch dispatch status. */
export const REVIEW_BATCH_STATUSES = ["pending", "retrying", "delivered", "failed"] as const;
export type ReviewBatchStatus = (typeof REVIEW_BATCH_STATUSES)[number];

/** Persisted ReviewBatch row. */
export interface ReviewBatchRecord {
  id: string;
  projectId: string;
  reviewerName: string;
  reviewerEmail: string | null;
  submittedAt: Date;
  dispatchStatus: ReviewBatchStatus;
  dispatchAttempts: number;
  dispatchedAt: Date | null;
  nextAttemptAt: Date | null;
  dispatchLastError: string | null;
  /** Cached canonical body so retries sign identical bytes. */
  canonicalBody: string | null;
  /** Array of FeedbackAnnotation ids participating in this batch. */
  annotationIds: string[];
}

/** Input for creating a ReviewBatch. */
export interface ReviewBatchCreateInput {
  projectId: string;
  reviewerName: string;
  reviewerEmail?: string | null;
  annotationIds: string[];
}

/** Input for updating dispatch bookkeeping. */
export interface ReviewBatchDispatchUpdate {
  dispatchStatus: ReviewBatchStatus;
  dispatchAttempts?: number;
  dispatchedAt?: Date | null;
  nextAttemptAt?: Date | null;
  dispatchLastError?: string | null;
  canonicalBody?: string | null;
}

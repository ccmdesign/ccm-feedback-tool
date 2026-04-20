/**
 * Annotation status callback payload types — spec §6.2.
 *
 * The implementation agent POSTs one of these back to
 * `/api/v1/annotations/:id/status` each time it progresses an annotation.
 */

/** Known annotation statuses — implementation agents may send custom strings. */
export const KNOWN_ANNOTATION_STATUSES = ["submitted", "acknowledged", "applied", "escalated", "rejected"] as const;

export type KnownAnnotationStatus = (typeof KNOWN_ANNOTATION_STATUSES)[number];

/** Annotation status — a known value, or an arbitrary string from a custom agent. */
export type AnnotationStatus = KnownAnnotationStatus | (string & {});

/** Optional implementation result payload attached to a status update. */
export interface ImplementationResult {
  /** Link to a merge/pull request the agent opened. */
  pr_url?: string;
  /** Link to a ticket/task created for the annotation. */
  task_url?: string;
  /** Free-form reasoning — rendered via a tooltip in the reviewer panel. */
  reasoning?: string;
  /** Arbitrary additional fields — forwards-compatible. */
  [key: string]: unknown;
}

/** Body of `POST /api/v1/annotations/:id/status`. */
export interface AnnotationStatusCallback {
  status: AnnotationStatus;
  result?: ImplementationResult;
  /** ISO-8601 UTC timestamp. Used for "newer wins" semantics. */
  updated_at: string;
}

/** Response body. */
export interface AnnotationStatusCallbackResponse {
  /** Whether the update was applied (false means an older update-at was ignored). */
  applied: boolean;
}

/** Type guard — true when the status is a known well-known value. */
export function isKnownAnnotationStatus(value: string): value is KnownAnnotationStatus {
  return (KNOWN_ANNOTATION_STATUSES as readonly string[]).includes(value);
}

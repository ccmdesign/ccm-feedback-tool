/**
 * Route-handler factories for `POST /api/v1/reviews` and
 * `POST /api/v1/annotations/:id/status`. Both match the style of the
 * existing `createCcmFeedbackHandler`.
 */

import { timingSafeEqual } from "node:crypto";
import type { ProjectStore } from "./project-store.js";
import type { ReviewBatchStore } from "./review-batch-store.js";
import type { DispatchDeps } from "./review-dispatch.js";
import { dispatchReviewBatch } from "./review-dispatch.js";
import { annotationStatusCallbackSchema } from "./validation/callback.js";
import { reviewSubmitSchema } from "./validation/review.js";
import { formatValidationErrors } from "./validation.js";

export interface ReviewsHandlerOptions {
  projectStore: ProjectStore;
  reviewBatchStore: ReviewBatchStore;
  /** Optional — replaces global fetch during tests. */
  fetch?: typeof globalThis.fetch;
  /** Optional — backoff RNG. */
  rng?: () => number;
}

/** Factory: returns a POST handler for /api/v1/reviews. */
export function createReviewsHandler(opts: ReviewsHandlerOptions) {
  return async (request: Request): Promise<Response> => {
    const body = await request.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

    const parsed = reviewSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;

    // Validate annotations exist and belong to the project (via joined feedback).
    const annotations = await opts.reviewBatchStore.getAnnotationsForDispatch(data.annotationIds);
    if (annotations.length !== data.annotationIds.length) {
      return Response.json({ error: "One or more annotations not found" }, { status: 400 });
    }
    const mismatch = annotations.find((a) => a.feedbackProjectId && a.feedbackProjectId !== data.projectId);
    if (mismatch) {
      return Response.json({ error: "Annotation does not belong to the specified project" }, { status: 400 });
    }

    const reviewerName = data.reviewer?.name ?? "Anonymous";
    const reviewerEmail = data.reviewer?.email ?? null;

    const batch = await opts.reviewBatchStore.createReviewBatch({
      projectId: data.projectId,
      reviewerName,
      reviewerEmail,
      annotationIds: data.annotationIds,
    });

    const deps: Record<string, unknown> = {};
    if (opts.fetch) deps.fetch = opts.fetch;
    if (opts.rng) deps.rng = opts.rng;
    const outcome = await dispatchReviewBatch(
      {
        projectStore: opts.projectStore,
        reviewBatchStore: opts.reviewBatchStore,
        deps: deps as DispatchDeps,
      },
      batch.id,
    );

    const status = outcome.dispatchStatus === "delivered" ? 201 : 202;
    return Response.json(
      {
        batchId: batch.id,
        dispatchStatus: outcome.dispatchStatus,
        dispatchAttempts: outcome.dispatchAttempts,
      },
      { status },
    );
  };
}

export interface AnnotationStatusHandlerOptions {
  reviewBatchStore: ReviewBatchStore;
  /** When set, requires `Authorization: Bearer <token>`. */
  callbackBearerToken?: string;
}

/** Factory: POST /api/v1/annotations/:id/status. */
export function createAnnotationStatusHandler(opts: AnnotationStatusHandlerOptions) {
  return async (request: Request, params: { id: string }): Promise<Response> => {
    // Optional bearer auth
    if (opts.callbackBearerToken) {
      const header = request.headers.get("authorization") ?? "";
      const expected = `Bearer ${opts.callbackBearerToken}`;
      if (header.length !== expected.length || !timingSafeEqual(Buffer.from(header), Buffer.from(expected))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!params.id || typeof params.id !== "string") {
      return Response.json({ error: "Missing annotation id" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });
    const parsed = annotationStatusCallbackSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 });
    }

    const { status, result, updated_at } = parsed.data;
    const updatedAt = new Date(updated_at);
    if (Number.isNaN(updatedAt.getTime())) {
      return Response.json({ error: "Invalid updated_at" }, { status: 400 });
    }

    const { applied } = await opts.reviewBatchStore.applyAnnotationStatus({
      annotationId: params.id,
      status,
      result: result ?? null,
      updatedAt,
    });

    return Response.json({ applied }, { status: 200 });
  };
}

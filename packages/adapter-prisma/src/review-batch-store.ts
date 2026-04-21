/**
 * Prisma-backed ReviewBatch + annotation-status store.
 */

import { StoreNotFoundError } from "@ccm-feedback/core";

export interface ReviewBatchPrismaClient {
  reviewBatch: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown | null>;
    update: (args: unknown) => Promise<unknown>;
  };
  feedbackAnnotation: {
    findMany: (args: unknown) => Promise<unknown[]>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
    update: (args: unknown) => Promise<unknown>;
  };
}

interface RawReviewBatchRow {
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
}

interface RawAnnotationJoin {
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
  audioUrl: string | null;
  createdAt: Date;
  feedback: {
    id: string;
    projectId: string | null;
    projectName: string;
    type: string;
    message: string;
    url: string;
  };
}

export class ReviewBatchStore {
  private prisma: ReviewBatchPrismaClient;

  constructor(prisma: ReviewBatchPrismaClient) {
    this.prisma = prisma;
  }

  async createReviewBatch(input: {
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
  }> {
    const row = (await this.prisma.reviewBatch.create({
      data: {
        projectId: input.projectId,
        reviewerName: input.reviewerName,
        reviewerEmail: input.reviewerEmail ?? null,
        annotationIds: input.annotationIds,
        dispatchStatus: "pending",
      },
    })) as RawReviewBatchRow;
    return {
      id: row.id,
      projectId: row.projectId,
      reviewerName: row.reviewerName,
      reviewerEmail: row.reviewerEmail,
      submittedAt: row.submittedAt,
      annotationIds: row.annotationIds,
    };
  }

  async getReviewBatch(id: string): Promise<RawReviewBatchRow | null> {
    return (await this.prisma.reviewBatch.findUnique({ where: { id } })) as RawReviewBatchRow | null;
  }

  async listRetryingReviewBatches(limit: number): Promise<
    Array<{
      id: string;
      projectId: string;
      submittedAt: Date;
      dispatchAttempts: number;
      nextAttemptAt: Date | null;
    }>
  > {
    const rows = (await this.prisma.reviewBatch.findMany({
      where: {
        dispatchStatus: "retrying",
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      orderBy: { nextAttemptAt: "asc" },
      take: limit,
    })) as RawReviewBatchRow[];
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      submittedAt: r.submittedAt,
      dispatchAttempts: r.dispatchAttempts,
      nextAttemptAt: r.nextAttemptAt,
    }));
  }

  async updateReviewBatchDispatch(
    id: string,
    patch: {
      dispatchStatus?: string;
      dispatchAttempts?: number;
      dispatchedAt?: Date | null;
      nextAttemptAt?: Date | null;
      dispatchLastError?: string | null;
      canonicalBody?: string | null;
    },
  ): Promise<void> {
    try {
      await this.prisma.reviewBatch.update({ where: { id }, data: patch });
    } catch (error) {
      if (isPrismaNotFound(error)) throw new StoreNotFoundError("ReviewBatch not found");
      throw error;
    }
  }

  async applyAnnotationStatus(input: {
    annotationId: string;
    status: string;
    result: unknown;
    updatedAt: Date;
  }): Promise<{ applied: boolean }> {
    // "newer updated_at wins": only update when the incoming updated_at is
    // greater than the stored value (or stored value is null).
    const { count } = await this.prisma.feedbackAnnotation.updateMany({
      where: {
        id: input.annotationId,
        OR: [{ implementationUpdatedAt: null }, { implementationUpdatedAt: { lt: input.updatedAt } }],
      },
      data: {
        status: input.status,
        implementationResult: input.result as never,
        implementationUpdatedAt: input.updatedAt,
      },
    });
    return { applied: count > 0 };
  }

  async getAnnotationsForDispatch(ids: string[]): Promise<
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
      audioUrl: string | null;
    }>
  > {
    const rows = (await this.prisma.feedbackAnnotation.findMany({
      where: { id: { in: ids } },
      include: { feedback: true },
    })) as RawAnnotationJoin[];

    return rows.map((r) => ({
      id: r.id,
      feedbackId: r.feedbackId,
      feedbackProjectId: r.feedback.projectId,
      feedbackProjectName: r.feedback.projectName,
      feedbackType: r.feedback.type,
      feedbackMessage: r.feedback.message,
      feedbackUrl: r.feedback.url,
      cssSelector: r.cssSelector,
      xpath: r.xpath,
      textSnippet: r.textSnippet,
      elementTag: r.elementTag,
      elementId: r.elementId,
      textPrefix: r.textPrefix,
      textSuffix: r.textSuffix,
      fingerprint: r.fingerprint,
      neighborText: r.neighborText,
      xPct: r.xPct,
      yPct: r.yPct,
      wPct: r.wPct,
      hPct: r.hPct,
      scrollX: r.scrollX,
      scrollY: r.scrollY,
      viewportW: r.viewportW,
      viewportH: r.viewportH,
      devicePixelRatio: r.devicePixelRatio,
      createdAt: r.createdAt,
      audioUrl: r.audioUrl ?? null,
    }));
  }
}

function isPrismaNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2025";
}

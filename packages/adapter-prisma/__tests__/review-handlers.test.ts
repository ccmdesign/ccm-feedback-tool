import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../src/project-store.js";
import { ReviewBatchStore } from "../src/review-batch-store.js";
import { forgetSigningSecret, registerSigningSecret } from "../src/review-dispatch.js";
import { createAnnotationStatusHandler, createReviewsHandler } from "../src/review-handler.js";

function makePrisma() {
  const projects = new Map<string, Record<string, unknown>>();
  const batches = new Map<string, Record<string, unknown>>();
  const annotations = new Map<string, Record<string, unknown>>();
  let pSeq = 0;
  let bSeq = 0;

  const fixedStatus = { count: 0 };

  return {
    _projects: projects,
    _batches: batches,
    _annotations: annotations,
    _lastStatusCount: fixedStatus,
    project: {
      create: vi.fn(async ({ data }) => {
        pSeq += 1;
        const row = {
          id: `proj_${pSeq}`,
          name: data.name,
          stagingUrl: data.stagingUrl ?? "",
          implementationWebhookUrl: data.implementationWebhookUrl ?? null,
          implementationWebhookSecretHash: data.implementationWebhookSecretHash ?? null,
          createdAt: new Date(),
        };
        projects.set(row.id, row);
        return row;
      }),
      findMany: vi.fn(async () => Array.from(projects.values())),
      findUnique: vi.fn(async ({ where }) => projects.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }) => {
        const row = projects.get(where.id) as Record<string, unknown>;
        Object.assign(row, data);
        return row;
      }),
      delete: vi.fn(),
    },
    reviewBatch: {
      create: vi.fn(async ({ data }) => {
        bSeq += 1;
        const row = {
          id: `batch_${bSeq}`,
          projectId: data.projectId,
          reviewerName: data.reviewerName,
          reviewerEmail: data.reviewerEmail ?? null,
          submittedAt: new Date(),
          dispatchStatus: "pending",
          dispatchAttempts: 0,
          dispatchedAt: null,
          nextAttemptAt: null,
          dispatchLastError: null,
          canonicalBody: null,
          annotationIds: data.annotationIds,
        };
        batches.set(row.id, row);
        return row;
      }),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async ({ where }) => batches.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }) => {
        const row = batches.get(where.id) as Record<string, unknown>;
        Object.assign(row, data);
        return row;
      }),
    },
    feedbackAnnotation: {
      findMany: vi.fn(async ({ where }) => {
        const ids = (where?.id?.in ?? []) as string[];
        return ids.map((id) => annotations.get(id)).filter(Boolean);
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        const row = annotations.get(where.id) as
          | (Record<string, unknown> & { implementationUpdatedAt: Date | null })
          | undefined;
        if (!row) return { count: 0 };
        const existing = row.implementationUpdatedAt;
        const incoming = data.implementationUpdatedAt as Date;
        if (existing && existing.getTime() >= incoming.getTime()) return { count: 0 };
        row.implementationUpdatedAt = incoming;
        row.status = data.status;
        row.implementationResult = data.implementationResult;
        return { count: 1 };
      }),
      update: vi.fn(),
    },
  };
}

function seedAnnotation(prisma: ReturnType<typeof makePrisma>, id: string, projectId: string, projectName: string) {
  prisma._annotations.set(id, {
    id,
    feedbackId: `fb_${id}`,
    cssSelector: "body",
    xpath: "/html/body",
    textSnippet: "",
    elementTag: "BODY",
    elementId: null,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "",
    neighborText: "",
    xPct: 0,
    yPct: 0,
    wPct: 1,
    hPct: 1,
    scrollX: 0,
    scrollY: 0,
    viewportW: 100,
    viewportH: 100,
    devicePixelRatio: 1,
    createdAt: new Date("2026-04-20T00:00:00Z"),
    implementationUpdatedAt: null,
    status: "submitted",
    implementationResult: null,
    feedback: {
      id: `fb_${id}`,
      projectId,
      projectName,
      type: "comment",
      message: "hi",
      url: "https://example.com",
    },
  });
}

describe("createReviewsHandler", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let projectStore: ProjectStore;
  let reviewBatchStore: ReviewBatchStore;

  beforeEach(() => {
    prisma = makePrisma();
    projectStore = new ProjectStore(prisma);
    reviewBatchStore = new ReviewBatchStore(prisma);
  });

  it("returns 400 for invalid JSON", async () => {
    const handler = createReviewsHandler({ projectStore, reviewBatchStore });
    const req = new Request("http://x/reviews", { method: "POST", body: "not-json" });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing fields", async () => {
    const handler = createReviewsHandler({ projectStore, reviewBatchStore });
    const req = new Request("http://x/reviews", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when an annotation belongs to a different project", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "a",
      stagingUrl: "",
      implementationWebhookUrl: "https://hook.example.com",
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann1", "other-project", "a");
    const handler = createReviewsHandler({
      projectStore,
      reviewBatchStore,
      fetch: vi.fn() as unknown as typeof fetch,
    });
    const req = new Request("http://x/reviews", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        annotationIds: ["ann1"],
        reviewer: { name: "Claudio" },
      }),
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    forgetSigningSecret(projectId);
  });

  it("returns 201 with dispatchStatus=delivered on a 2xx webhook", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "b",
      stagingUrl: "",
      implementationWebhookUrl: "https://hook.example.com",
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann2", projectId, "b");
    const fetchFn = vi.fn(async () => new Response("ok", { status: 200 }));
    const handler = createReviewsHandler({
      projectStore,
      reviewBatchStore,
      fetch: fetchFn as unknown as typeof fetch,
    });
    const req = new Request("http://x/reviews", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        annotationIds: ["ann2"],
        reviewer: { name: "Claudio" },
      }),
    });
    const res = await handler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.dispatchStatus).toBe("delivered");
    forgetSigningSecret(projectId);
  });
});

describe("createAnnotationStatusHandler", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let reviewBatchStore: ReviewBatchStore;

  beforeEach(() => {
    prisma = makePrisma();
    reviewBatchStore = new ReviewBatchStore(prisma);
    seedAnnotation(prisma, "ann1", "p1", "p");
  });

  it("applies a status update and returns { applied: true }", async () => {
    const handler = createAnnotationStatusHandler({ reviewBatchStore });
    const req = new Request("http://x/status", {
      method: "POST",
      body: JSON.stringify({
        status: "applied",
        result: { pr_url: "https://example.com/pull/1" },
        updated_at: "2026-04-20T00:00:00.000Z",
      }),
    });
    const res = await handler(req, { id: "ann1" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied).toBe(true);
  });

  it("ignores an older update and returns { applied: false }", async () => {
    const handler = createAnnotationStatusHandler({ reviewBatchStore });
    const first = new Request("http://x/status", {
      method: "POST",
      body: JSON.stringify({ status: "applied", updated_at: "2026-04-20T00:00:00.000Z" }),
    });
    await handler(first, { id: "ann1" });
    const older = new Request("http://x/status", {
      method: "POST",
      body: JSON.stringify({ status: "rejected", updated_at: "2026-04-19T00:00:00.000Z" }),
    });
    const res = await handler(older, { id: "ann1" });
    const body = await res.json();
    expect(body.applied).toBe(false);
  });

  it("requires bearer token when configured", async () => {
    const handler = createAnnotationStatusHandler({
      reviewBatchStore,
      callbackBearerToken: "top-secret",
    });
    const req = new Request("http://x/status", {
      method: "POST",
      body: JSON.stringify({ status: "applied", updated_at: "2026-04-20T00:00:00.000Z" }),
    });
    const res = await handler(req, { id: "ann1" });
    expect(res.status).toBe(401);
  });

  it("allows bearer token when correct", async () => {
    const handler = createAnnotationStatusHandler({
      reviewBatchStore,
      callbackBearerToken: "top-secret",
    });
    const req = new Request("http://x/status", {
      method: "POST",
      headers: { authorization: "Bearer top-secret" },
      body: JSON.stringify({ status: "applied", updated_at: "2026-04-20T00:00:00.000Z" }),
    });
    const res = await handler(req, { id: "ann1" });
    expect(res.status).toBe(200);
  });

  it("rejects malformed body", async () => {
    const handler = createAnnotationStatusHandler({ reviewBatchStore });
    const req = new Request("http://x/status", { method: "POST", body: "not-json" });
    const res = await handler(req, { id: "ann1" });
    expect(res.status).toBe(400);
  });

  it("rejects a body missing updated_at", async () => {
    const handler = createAnnotationStatusHandler({ reviewBatchStore });
    const req = new Request("http://x/status", {
      method: "POST",
      body: JSON.stringify({ status: "applied" }),
    });
    const res = await handler(req, { id: "ann1" });
    expect(res.status).toBe(400);
  });

  it("accepts custom status strings", async () => {
    const handler = createAnnotationStatusHandler({ reviewBatchStore });
    const req = new Request("http://x/status", {
      method: "POST",
      body: JSON.stringify({ status: "in_review", updated_at: "2026-04-20T00:00:00.000Z" }),
    });
    const res = await handler(req, { id: "ann1" });
    expect(res.status).toBe(200);
  });
});

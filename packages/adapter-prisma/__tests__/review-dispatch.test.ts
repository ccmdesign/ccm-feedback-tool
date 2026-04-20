import { verifyWebhook } from "@ccm-feedback/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../src/project-store.js";
import { ReviewBatchStore } from "../src/review-batch-store.js";
import {
  dispatchReviewBatch,
  forgetSigningSecret,
  processPendingReviewBatches,
  registerSigningSecret,
} from "../src/review-dispatch.js";

function makePrisma() {
  const projects = new Map<
    string,
    {
      id: string;
      name: string;
      stagingUrl: string;
      implementationWebhookUrl: string | null;
      implementationWebhookSecretHash: string | null;
      createdAt: Date;
    }
  >();
  const batches = new Map<
    string,
    {
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
  >();
  const annotations = new Map<string, unknown>();

  let pSeq = 0;
  let bSeq = 0;

  return {
    _projects: projects,
    _batches: batches,
    _annotations: annotations,
    project: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        pSeq += 1;
        const row = {
          id: `proj_${pSeq}`,
          name: String(data.name),
          stagingUrl: String(data.stagingUrl ?? ""),
          implementationWebhookUrl: (data.implementationWebhookUrl ?? null) as string | null,
          implementationWebhookSecretHash: (data.implementationWebhookSecretHash ?? null) as string | null,
          createdAt: new Date(),
        };
        projects.set(row.id, row);
        return row;
      }),
      findMany: vi.fn(async () => Array.from(projects.values())),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => projects.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = projects.get(where.id);
        if (!row) throw Object.assign(new Error(), { code: "P2025" });
        Object.assign(row, data);
        return row;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        projects.delete(where.id);
        return { id: where.id };
      }),
    },
    reviewBatch: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        bSeq += 1;
        const row = {
          id: `batch_${bSeq}`,
          projectId: String(data.projectId),
          reviewerName: String(data.reviewerName),
          reviewerEmail: (data.reviewerEmail ?? null) as string | null,
          submittedAt: new Date(),
          dispatchStatus: "pending",
          dispatchAttempts: 0,
          dispatchedAt: null as Date | null,
          nextAttemptAt: null as Date | null,
          dispatchLastError: null as string | null,
          canonicalBody: null as string | null,
          annotationIds: (data.annotationIds as string[]) ?? [],
        };
        batches.set(row.id, row);
        return row;
      }),
      findMany: vi.fn(async ({ where, take }: { where: Record<string, unknown>; take?: number }) => {
        const list = Array.from(batches.values()).filter((b) => {
          if (where.dispatchStatus && b.dispatchStatus !== where.dispatchStatus) return false;
          return true;
        });
        return list.slice(0, take ?? list.length);
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => batches.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = batches.get(where.id);
        if (!row) throw Object.assign(new Error(), { code: "P2025" });
        Object.assign(row, data);
        return row;
      }),
    },
    feedbackAnnotation: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
        return where.id.in.map((id) => annotations.get(id)).filter(Boolean);
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
      update: vi.fn(),
    },
  };
}

function seedAnnotation(store: ReturnType<typeof makePrisma>, id: string, projectId: string, projectName: string) {
  store._annotations.set(id, {
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
    feedback: {
      id: `fb_${id}`,
      projectId,
      projectName,
      type: "comment",
      message: "hello",
      url: "https://example.com",
    },
  });
}

describe("dispatchReviewBatch", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let projectStore: ProjectStore;
  let reviewBatchStore: ReviewBatchStore;

  beforeEach(() => {
    prisma = makePrisma();
    projectStore = new ProjectStore(prisma);
    reviewBatchStore = new ReviewBatchStore(prisma);
  });

  it("sends signed headers to the project's webhook on a 200", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "demo",
      stagingUrl: "",
      implementationWebhookUrl: "https://hook.example.com/webhook",
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann1", projectId, "demo");
    const batch = await reviewBatchStore.createReviewBatch({
      projectId,
      reviewerName: "Claudio",
      annotationIds: ["ann1"],
    });

    const fetchFn = vi.fn(async () => new Response("ok", { status: 200 }));
    const outcome = await dispatchReviewBatch(
      { projectStore, reviewBatchStore, deps: { fetch: fetchFn as unknown as typeof fetch } },
      batch.id,
    );

    expect(outcome.dispatchStatus).toBe("delivered");
    expect(fetchFn).toHaveBeenCalledOnce();
    const call = fetchFn.mock.calls[0];
    const url = call[0];
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("https://hook.example.com/webhook");
    expect(headers["X-CCM-Signature"]).toMatch(/^t=\d+,v1=[0-9a-f]+$/);
    expect(headers["X-CCM-Signature-SHA256"]).toMatch(/^sha256=[0-9a-f]+$/);

    // Outbound body is verifiable with the project secret
    const body = String(init.body);
    expect(
      verifyWebhook({
        body,
        secret,
        header: headers["X-CCM-Signature"],
      }),
    ).toBe(true);
    forgetSigningSecret(projectId);
  });

  it("marks the batch as retrying on a non-2xx response", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "demo2",
      stagingUrl: "",
      implementationWebhookUrl: "https://hook.example.com/webhook",
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann2", projectId, "demo2");
    const batch = await reviewBatchStore.createReviewBatch({
      projectId,
      reviewerName: "Claudio",
      annotationIds: ["ann2"],
    });
    const fetchFn = vi.fn(async () => new Response("boom", { status: 500 }));
    const outcome = await dispatchReviewBatch(
      { projectStore, reviewBatchStore, deps: { fetch: fetchFn as unknown as typeof fetch, rng: () => 0.5 } },
      batch.id,
    );
    expect(outcome.dispatchStatus).toBe("retrying");
    const stored = await reviewBatchStore.getReviewBatch(batch.id);
    expect(stored?.dispatchStatus).toBe("retrying");
    expect(stored?.dispatchAttempts).toBe(1);
    expect(stored?.nextAttemptAt).toBeTruthy();
    forgetSigningSecret(projectId);
  });

  it("skips dispatch for projects with no webhook URL (marks delivered no-op)", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "silent",
      stagingUrl: "",
      implementationWebhookUrl: null,
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann3", projectId, "silent");
    const batch = await reviewBatchStore.createReviewBatch({
      projectId,
      reviewerName: "Claudio",
      annotationIds: ["ann3"],
    });
    const fetchFn = vi.fn();
    const outcome = await dispatchReviewBatch(
      { projectStore, reviewBatchStore, deps: { fetch: fetchFn as unknown as typeof fetch } },
      batch.id,
    );
    expect(outcome.dispatchStatus).toBe("delivered");
    expect(fetchFn).not.toHaveBeenCalled();
    const stored = await reviewBatchStore.getReviewBatch(batch.id);
    expect(stored?.dispatchLastError).toBe("no-webhook-configured");
    forgetSigningSecret(projectId);
  });

  it("re-dispatches retrying batches via processPendingReviewBatches", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "rerun",
      stagingUrl: "",
      implementationWebhookUrl: "https://hook.example.com/webhook",
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann4", projectId, "rerun");
    const batch = await reviewBatchStore.createReviewBatch({
      projectId,
      reviewerName: "Claudio",
      annotationIds: ["ann4"],
    });
    // First attempt — fail.
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls += 1;
      return new Response("", { status: calls === 1 ? 500 : 200 });
    });
    await dispatchReviewBatch(
      { projectStore, reviewBatchStore, deps: { fetch: fetchFn as unknown as typeof fetch, rng: () => 0.5 } },
      batch.id,
    );
    // Second attempt via processPendingReviewBatches — success.
    const { processed } = await processPendingReviewBatches(
      { projectStore, reviewBatchStore, deps: { fetch: fetchFn as unknown as typeof fetch, rng: () => 0.5 } },
      { limit: 5 },
    );
    expect(processed).toBe(1);
    const stored = await reviewBatchStore.getReviewBatch(batch.id);
    expect(stored?.dispatchStatus).toBe("delivered");
    forgetSigningSecret(projectId);
  });

  it("marks a 4xx response as failed without scheduling a retry", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "client-err",
      stagingUrl: "",
      implementationWebhookUrl: "https://hook.example.com/webhook",
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann-4xx", projectId, "client-err");
    const batch = await reviewBatchStore.createReviewBatch({
      projectId,
      reviewerName: "Claudio",
      annotationIds: ["ann-4xx"],
    });
    const fetchFn = vi.fn(async () => new Response("bad request", { status: 400 }));
    const outcome = await dispatchReviewBatch(
      { projectStore, reviewBatchStore, deps: { fetch: fetchFn as unknown as typeof fetch, rng: () => 0.5 } },
      batch.id,
    );
    expect(outcome.dispatchStatus).toBe("failed");
    expect(outcome.dispatchAttempts).toBe(1);
    expect(outcome.error).toBe("http-400");
    const stored = await reviewBatchStore.getReviewBatch(batch.id);
    expect(stored?.dispatchStatus).toBe("failed");
    expect(stored?.dispatchAttempts).toBe(1);
    expect(stored?.nextAttemptAt).toBeFalsy();
    expect(stored?.dispatchLastError).toBe("http-400");
    forgetSigningSecret(projectId);
  });

  it("retries on 429 (Too Many Requests) — transient despite being 4xx", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "rate-limited",
      stagingUrl: "",
      implementationWebhookUrl: "https://hook.example.com/webhook",
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann-429", projectId, "rate-limited");
    const batch = await reviewBatchStore.createReviewBatch({
      projectId,
      reviewerName: "Claudio",
      annotationIds: ["ann-429"],
    });
    const fetchFn = vi.fn(async () => new Response("slow down", { status: 429 }));
    const outcome = await dispatchReviewBatch(
      { projectStore, reviewBatchStore, deps: { fetch: fetchFn as unknown as typeof fetch, rng: () => 0.5 } },
      batch.id,
    );
    expect(outcome.dispatchStatus).toBe("retrying");
    const stored = await reviewBatchStore.getReviewBatch(batch.id);
    expect(stored?.dispatchStatus).toBe("retrying");
    expect(stored?.dispatchAttempts).toBe(1);
    expect(stored?.nextAttemptAt).toBeTruthy();
    forgetSigningSecret(projectId);
  });

  it("retries on 408 (Request Timeout) — transient despite being 4xx", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "timeout-4xx",
      stagingUrl: "",
      implementationWebhookUrl: "https://hook.example.com/webhook",
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann-408", projectId, "timeout-4xx");
    const batch = await reviewBatchStore.createReviewBatch({
      projectId,
      reviewerName: "Claudio",
      annotationIds: ["ann-408"],
    });
    const fetchFn = vi.fn(async () => new Response("timeout", { status: 408 }));
    const outcome = await dispatchReviewBatch(
      { projectStore, reviewBatchStore, deps: { fetch: fetchFn as unknown as typeof fetch, rng: () => 0.5 } },
      batch.id,
    );
    expect(outcome.dispatchStatus).toBe("retrying");
    forgetSigningSecret(projectId);
  });

  it("re-uses the cached canonical body across retries (idempotency)", async () => {
    const { id: projectId, secret } = await projectStore.createProject({
      name: "idem",
      stagingUrl: "",
      implementationWebhookUrl: "https://hook.example.com/webhook",
    });
    registerSigningSecret(projectId, secret);
    seedAnnotation(prisma, "ann5", projectId, "idem");
    const batch = await reviewBatchStore.createReviewBatch({
      projectId,
      reviewerName: "Claudio",
      annotationIds: ["ann5"],
    });
    let firstBody: string | undefined;
    let secondBody: string | undefined;
    let n = 0;
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
      n += 1;
      const b = String(init?.body);
      if (n === 1) firstBody = b;
      else secondBody = b;
      return new Response("", { status: n === 1 ? 500 : 200 });
    });
    await dispatchReviewBatch(
      { projectStore, reviewBatchStore, deps: { fetch: fetchFn as unknown as typeof fetch, rng: () => 0.5 } },
      batch.id,
    );
    await processPendingReviewBatches({
      projectStore,
      reviewBatchStore,
      deps: { fetch: fetchFn as unknown as typeof fetch, rng: () => 0.5 },
    });
    expect(firstBody).toBeDefined();
    expect(secondBody).toBeDefined();
    expect(firstBody).toBe(secondBody);
    forgetSigningSecret(projectId);
  });
});

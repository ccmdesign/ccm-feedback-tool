import { describe, expect, it } from "vitest";
import { backfillProjectIds } from "../lib/backfill-project-id-core.mjs";

/**
 * Tiny in-memory Prisma mock that mirrors only the subset of methods the
 * backfill helper exercises. This avoids introducing an in-memory Postgres
 * dependency and keeps the test deterministic.
 */
function makeMockPrisma(initialFeedbacks) {
  const feedbacks = initialFeedbacks.map((f) => ({ ...f }));
  const projects = new Map(); // name -> { id, createdAt }
  let idCounter = 0;

  return {
    _feedbacks: feedbacks,
    _projects: projects,
    feedbackItem: {
      async findMany({ distinct }) {
        if (distinct?.includes("projectName")) {
          const seen = new Set();
          const out = [];
          for (const f of feedbacks) {
            if (!seen.has(f.projectName)) {
              seen.add(f.projectName);
              out.push({ projectName: f.projectName });
            }
          }
          return out;
        }
        return feedbacks.map((f) => ({ projectName: f.projectName }));
      },
      async updateMany({ where, data }) {
        let count = 0;
        for (const f of feedbacks) {
          if (f.projectName === where.projectName && (f.projectId == null || where.projectId === null)) {
            if (f.projectId == null) {
              f.projectId = data.projectId;
              count += 1;
            }
          }
        }
        return { count };
      },
    },
    project: {
      async upsert({ where, create }) {
        const existing = projects.get(where.name);
        if (existing) {
          return { id: existing.id, name: where.name, createdAt: existing.createdAt };
        }
        idCounter += 1;
        const id = `proj_${idCounter}`;
        const createdAt = new Date();
        projects.set(where.name, { id, createdAt });
        return { id, name: where.name, stagingUrl: create.stagingUrl, createdAt };
      },
    },
  };
}

describe("backfillProjectIds", () => {
  it("creates one Project per distinct projectName and fills projectId", async () => {
    const mock = makeMockPrisma([
      { id: "f1", projectName: "alpha", projectId: null },
      { id: "f2", projectName: "alpha", projectId: null },
      { id: "f3", projectName: "beta", projectId: null },
    ]);
    const result = await backfillProjectIds(mock);

    expect(result.projectsTotal).toBe(2);
    expect(result.projectsCreated).toBe(2);
    expect(result.feedbacksUpdated).toBe(3);
    expect(mock._feedbacks.filter((f) => f.projectId == null).length).toBe(0);
    const alphaId = mock._feedbacks.find((f) => f.projectName === "alpha")?.projectId;
    const betaId = mock._feedbacks.find((f) => f.projectName === "beta")?.projectId;
    expect(alphaId).toBeDefined();
    expect(betaId).toBeDefined();
    expect(alphaId).not.toBe(betaId);
  });

  it("is idempotent: running twice produces no duplicate rows or changes", async () => {
    const mock = makeMockPrisma([
      { id: "f1", projectName: "alpha", projectId: null },
      { id: "f2", projectName: "beta", projectId: null },
    ]);
    await backfillProjectIds(mock);
    const second = await backfillProjectIds(mock);

    expect(mock._projects.size).toBe(2);
    expect(second.feedbacksUpdated).toBe(0);
  });

  it("handles an empty database without errors", async () => {
    const mock = makeMockPrisma([]);
    const result = await backfillProjectIds(mock);
    expect(result.projectsTotal).toBe(0);
    expect(result.feedbacksUpdated).toBe(0);
  });

  it("handles feedback with empty-string projectName", async () => {
    const mock = makeMockPrisma([{ id: "f1", projectName: "", projectId: null }]);
    const result = await backfillProjectIds(mock);
    expect(result.projectsTotal).toBe(1);
    expect(result.feedbacksUpdated).toBe(1);
  });
});

/**
 * CCM-290 — smoke tests for `/api/v1/agent/feedback/:id` (GET + PATCH).
 *
 * Asserts that the route module forwards `context.params` to the factory —
 * catches the "forgot await context.params" class of regression.
 */

import type { ProjectStore } from "@ccm-feedback/adapter-prisma";
import type { CcmFeedbackStore, FeedbackRecord, FeedbackUpdateInput } from "@ccm-feedback/core";
import { describe, expect, it, vi } from "vitest";

function makeRecord(id: string, projectName: string): FeedbackRecord {
  return {
    id,
    type: "bug",
    message: "boom",
    status: "open",
    projectName,
    url: "https://example.com",
    authorName: "a",
    authorEmail: "a@t",
    viewport: "1x1",
    userAgent: "t",
    clientId: id,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    annotations: [],
    replies: [],
  };
}

class FakeStore implements Partial<CcmFeedbackStore> {
  records: FeedbackRecord[] = [makeRecord("fb-1", "demo"), makeRecord("fb-2", "other")];
  async findById(id: string): Promise<FeedbackRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }
  async updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
    const rec = this.records.find((r) => r.id === id);
    if (!rec) throw new Error("not found");
    rec.status = data.status;
    rec.resolvedAt = data.resolvedAt;
    return rec;
  }
}

const fakeStore = new FakeStore();
const fakeProjectStore: Pick<ProjectStore, "findByAgentToken"> = {
  findByAgentToken: async (token: string) => (token === "SECRET" ? { id: "p1", name: "demo" } : null),
};

vi.mock("@/lib/store", () => ({ resolveStore: async () => fakeStore }));
vi.mock("@/lib/ccm-stores", () => ({
  resolveProjectStores: async () => ({ projectStore: fakeProjectStore }),
}));

describe("/api/v1/agent/feedback/:id route", () => {
  it("exports GET, PATCH, and OPTIONS", async () => {
    const mod = await import("../route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.PATCH).toBe("function");
    expect(typeof mod.OPTIONS).toBe("function");
  });

  it("GET with valid token returns the owned feedback", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request("http://t/api/v1/agent/feedback/fb-1?token=SECRET"), {
      params: Promise.resolve({ id: "fb-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("GET with no token returns 401", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request("http://t/api/v1/agent/feedback/fb-1"), {
      params: Promise.resolve({ id: "fb-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET across projects returns 404 (no existence leak)", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request("http://t/api/v1/agent/feedback/fb-2?token=SECRET"), {
      params: Promise.resolve({ id: "fb-2" }),
    });
    expect(res.status).toBe(404);
  });

  it("PATCH updates owned feedback", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(
      new Request("http://t/api/v1/agent/feedback/fb-1?token=SECRET", {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      }),
      { params: Promise.resolve({ id: "fb-1" }) },
    );
    expect(res.status).toBe(200);
  });
});

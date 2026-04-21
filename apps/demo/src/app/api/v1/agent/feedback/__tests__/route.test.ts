/**
 * CCM-290 — smoke tests for `/api/v1/agent/feedback` (list).
 *
 * Catches the class of wiring bug where the route module invokes the wrong
 * handler method or drops a context param (CCM-277 regression pattern).
 * Mocks the two resolver modules so the route runs without a database.
 */

import type { ProjectStore } from "@ccm-feedback/adapter-prisma";
import type { CcmFeedbackStore, FeedbackQuery, FeedbackRecord } from "@ccm-feedback/core";
import { describe, expect, it, vi } from "vitest";

class FakeStore implements Partial<CcmFeedbackStore> {
  feedbacks: FeedbackRecord[] = [];
  async getFeedbacks(_query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }> {
    return { feedbacks: this.feedbacks, total: this.feedbacks.length };
  }
}

const fakeStore = new FakeStore();
const fakeProjectStore: Pick<ProjectStore, "findByAgentToken"> = {
  findByAgentToken: async (token: string) => (token === "SECRET" ? { id: "p1", name: "demo" } : null),
};

vi.mock("@/lib/store", () => ({
  resolveStore: async () => fakeStore,
}));
vi.mock("@/lib/ccm-stores", () => ({
  resolveProjectStores: async () => ({ projectStore: fakeProjectStore }),
}));

describe("/api/v1/agent/feedback route", () => {
  it("exports GET and OPTIONS", async () => {
    const mod = await import("../route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.OPTIONS).toBe("function");
  });

  it("GET with valid token returns 200", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request("http://t/api/v1/agent/feedback?token=SECRET"));
    expect(res.status).toBe(200);
  });

  it("GET with no token returns 401", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request("http://t/api/v1/agent/feedback"));
    expect(res.status).toBe(401);
  });

  it("OPTIONS returns 204", async () => {
    const { OPTIONS } = await import("../route");
    const res = await OPTIONS(new Request("http://t/api/v1/agent/feedback", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
  });
});

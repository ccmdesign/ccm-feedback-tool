/**
 * CCM-290 — smoke tests for `/api/v1/agent/feedback/:id/replies` (POST agent reply).
 *
 * Smoke test that the route tags new replies with source:"agent" (the key
 * agent-API invariant) and that the wrapping respects context.params.
 */

import type { ProjectStore } from "@ccm-feedback/adapter-prisma";
import type { CcmFeedbackStore, FeedbackRecord, ReplyCreateInput, ReplyRecord } from "@ccm-feedback/core";
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
  records: FeedbackRecord[] = [makeRecord("fb-1", "demo")];
  replies: ReplyRecord[] = [];
  async findById(id: string): Promise<FeedbackRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }
  async addReply(input: ReplyCreateInput): Promise<ReplyRecord> {
    const reply: ReplyRecord = {
      id: `r-${this.replies.length + 1}`,
      feedbackId: input.feedbackId,
      source: input.source,
      author: input.author,
      authorEmail: input.authorEmail ?? null,
      body: input.body,
      createdAt: new Date(),
    };
    this.replies.push(reply);
    return reply;
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

describe("/api/v1/agent/feedback/:id/replies route", () => {
  it("exports POST and OPTIONS", async () => {
    const mod = await import("../route");
    expect(typeof mod.POST).toBe("function");
    expect(typeof mod.OPTIONS).toBe("function");
  });

  it('POST tags the reply with source:"agent"', async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://t/api/v1/agent/feedback/fb-1/replies?token=SECRET", {
        method: "POST",
        body: JSON.stringify({ author: "agent-alice", body: "fixed" }),
      }),
      { params: Promise.resolve({ id: "fb-1" }) },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { source: string; author: string };
    expect(body.source).toBe("agent");
    expect(body.author).toBe("agent-alice");
  });

  it("POST without token returns 401", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://t/api/v1/agent/feedback/fb-1/replies", {
        method: "POST",
        body: JSON.stringify({ author: "a", body: "b" }),
      }),
      { params: Promise.resolve({ id: "fb-1" }) },
    );
    expect(res.status).toBe(401);
  });
});

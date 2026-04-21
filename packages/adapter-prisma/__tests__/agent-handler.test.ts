/**
 * CCM-290 — agent handler behaviour tests.
 *
 * Uses a minimal hand-rolled in-test `CcmFeedbackStore` so the test does not
 * depend on `@ccm-feedback/adapter-memory` (and the adapter-prisma package
 * does not acquire a cross-package devDependency just for tests). The
 * project store is also a minimal fake — `ProjectStore`-shaped, covering
 * only the subset the handler calls.
 */

import {
  type CcmFeedbackStore,
  type FeedbackCreateInput,
  type FeedbackQuery,
  type FeedbackRecord,
  type FeedbackUpdateInput,
  type ReplyCreateInput,
  type ReplyRecord,
  StoreNotFoundError,
} from "@ccm-feedback/core";
import { describe, expect, it } from "vitest";
import { createCcmAgentFeedbackHandler } from "../src/agent-handler.js";
import type { ProjectStore } from "../src/project-store.js";

class FakeStore implements CcmFeedbackStore {
  private feedbacks: FeedbackRecord[] = [];
  private replies: ReplyRecord[] = [];
  private n = 0;

  async createFeedback(data: FeedbackCreateInput): Promise<FeedbackRecord> {
    const id = `fb-${++this.n}`;
    const now = new Date();
    const record: FeedbackRecord = {
      id,
      type: data.type,
      message: data.message,
      status: data.status,
      projectName: data.projectName,
      url: data.url,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      viewport: data.viewport,
      userAgent: data.userAgent,
      clientId: data.clientId,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      annotations: [],
      replies: [],
    };
    this.feedbacks.unshift(record);
    return record;
  }
  async getFeedbacks(query: FeedbackQuery): Promise<{ feedbacks: FeedbackRecord[]; total: number }> {
    const results = this.feedbacks.filter((f) => f.projectName === query.projectName);
    return { feedbacks: results, total: results.length };
  }
  async findByClientId(_clientId: string): Promise<FeedbackRecord | null> {
    return null;
  }
  async findById(id: string): Promise<FeedbackRecord | null> {
    return this.feedbacks.find((f) => f.id === id) ?? null;
  }
  async updateFeedback(id: string, data: FeedbackUpdateInput): Promise<FeedbackRecord> {
    const fb = this.feedbacks.find((f) => f.id === id);
    if (!fb) throw new StoreNotFoundError();
    fb.status = data.status;
    fb.resolvedAt = data.resolvedAt;
    fb.updatedAt = new Date();
    return fb;
  }
  async deleteFeedback(_id: string): Promise<void> {
    throw new Error("not used in this test");
  }
  async deleteAllFeedbacks(_name: string): Promise<void> {
    throw new Error("not used in this test");
  }
  async addReply(input: ReplyCreateInput): Promise<ReplyRecord> {
    const parent = this.feedbacks.find((f) => f.id === input.feedbackId);
    if (!parent) throw new StoreNotFoundError();
    const reply: ReplyRecord = {
      id: `r-${++this.n}`,
      feedbackId: input.feedbackId,
      source: input.source,
      author: input.author,
      authorEmail: input.authorEmail ?? null,
      body: input.body,
      createdAt: new Date(),
    };
    this.replies.push(reply);
    parent.replies = [...parent.replies, reply];
    return reply;
  }
  async listReplies(feedbackId: string): Promise<ReplyRecord[]> {
    return this.replies.filter((r) => r.feedbackId === feedbackId);
  }
}

function seedFeedback(store: FakeStore, projectName: string, overrides: { clientId: string }) {
  return store.createFeedback({
    projectName,
    type: "bug",
    message: "Something broke",
    status: "open",
    url: "https://example.com",
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Alice",
    authorEmail: "alice@test.com",
    clientId: overrides.clientId,
    annotations: [],
  });
}

function fakeProjectStore(projects: Array<{ id: string; name: string; agentToken: string }>): ProjectStore {
  return {
    findByAgentToken: async (token: string) => {
      const hit = projects.find((p) => p.agentToken === token);
      return hit ? { id: hit.id, name: hit.name } : null;
    },
  } as unknown as ProjectStore;
}

function buildHandler(tokenProjects: Array<{ id: string; name: string; agentToken: string }>) {
  const store = new FakeStore();
  const projectStore = fakeProjectStore(tokenProjects);
  const handler = createCcmAgentFeedbackHandler({ store, projectStore });
  return { store, handler };
}

describe("createCcmAgentFeedbackHandler", () => {
  describe("authentication", () => {
    it("rejects list with no token", async () => {
      const { handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const res = await handler.listFeedback(new Request("http://t/api/v1/agent/feedback"));
      expect(res.status).toBe(401);
    });

    it("rejects list with wrong token", async () => {
      const { handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const res = await handler.listFeedback(new Request("http://t/api/v1/agent/feedback?token=NOPE"));
      expect(res.status).toBe(401);
    });

    it("accepts list with valid token and returns empty list for empty project", async () => {
      const { handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const res = await handler.listFeedback(new Request("http://t/api/v1/agent/feedback?token=SECRET"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { feedbacks: unknown[]; total: number };
      expect(body.total).toBe(0);
      expect(body.feedbacks).toHaveLength(0);
    });
  });

  describe("list + get", () => {
    it("lists feedbacks for the token's project", async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      await seedFeedback(store, "demo", { clientId: "c1" });
      await seedFeedback(store, "demo", { clientId: "c2" });
      await seedFeedback(store, "other", { clientId: "c3" });

      const res = await handler.listFeedback(new Request("http://t/api/v1/agent/feedback?token=SECRET"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { total: number };
      expect(body.total).toBe(2);
    });

    it("getFeedback returns the feedback when it belongs to the token's project", async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const fb = await seedFeedback(store, "demo", { clientId: "c1" });

      const res = await handler.getFeedback(new Request(`http://t/api/v1/agent/feedback/${fb.id}?token=SECRET`), {
        id: fb.id,
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string };
      expect(body.id).toBe(fb.id);
    });

    it("getFeedback returns 404 for a cross-project id (no existence leak)", async () => {
      const { store, handler } = buildHandler([
        { id: "p1", name: "demo", agentToken: "SECRET" },
        { id: "p2", name: "other", agentToken: "OTHER" },
      ]);
      const otherFb = await seedFeedback(store, "other", { clientId: "c1" });

      const res = await handler.getFeedback(new Request(`http://t/api/v1/agent/feedback/${otherFb.id}?token=SECRET`), {
        id: otherFb.id,
      });
      expect(res.status).toBe(404);
    });

    it("getFeedback returns 404 for an unknown id", async () => {
      const { handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const res = await handler.getFeedback(new Request("http://t/api/v1/agent/feedback/nope?token=SECRET"), {
        id: "nope",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("patchFeedback", () => {
    it("updates status to resolved and sets resolvedAt", async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const fb = await seedFeedback(store, "demo", { clientId: "c1" });

      const res = await handler.patchFeedback(
        new Request(`http://t/api/v1/agent/feedback/${fb.id}?token=SECRET`, {
          method: "PATCH",
          body: JSON.stringify({ status: "resolved" }),
        }),
        { id: fb.id },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; resolvedAt: string | null };
      expect(body.status).toBe("resolved");
      expect(body.resolvedAt).not.toBeNull();
    });

    it("echoes optional author but does NOT persist it", async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const fb = await seedFeedback(store, "demo", { clientId: "c1" });

      const res = await handler.patchFeedback(
        new Request(`http://t/api/v1/agent/feedback/${fb.id}?token=SECRET`, {
          method: "PATCH",
          body: JSON.stringify({ status: "resolved", author: "agent-alice" }),
        }),
        { id: fb.id },
      );
      const body = (await res.json()) as { author?: string; authorName: string };
      expect(body.author).toBe("agent-alice");
      // The feedback's stored authorName is unchanged — author is NOT persisted.
      expect(body.authorName).toBe("Alice");
    });

    it("rejects invalid body with 400", async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const fb = await seedFeedback(store, "demo", { clientId: "c1" });
      const res = await handler.patchFeedback(
        new Request(`http://t/api/v1/agent/feedback/${fb.id}?token=SECRET`, {
          method: "PATCH",
          body: JSON.stringify({ status: "bogus" }),
        }),
        { id: fb.id },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("addReply", () => {
    it('appends a reply tagged source:"agent"', async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const fb = await seedFeedback(store, "demo", { clientId: "c1" });

      const res = await handler.addReply(
        new Request(`http://t/api/v1/agent/feedback/${fb.id}/replies?token=SECRET`, {
          method: "POST",
          body: JSON.stringify({ author: "agent-alice", body: "fixed" }),
        }),
        { id: fb.id },
      );
      expect(res.status).toBe(201);
      const body = (await res.json()) as { source: string; author: string; body: string };
      expect(body.source).toBe("agent");
      expect(body.author).toBe("agent-alice");
      expect(body.body).toBe("fixed");

      const replies = await store.listReplies(fb.id);
      expect(replies).toHaveLength(1);
      expect(replies[0]?.source).toBe("agent");
    });

    it("returns 400 for an empty body", async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const fb = await seedFeedback(store, "demo", { clientId: "c1" });
      const res = await handler.addReply(
        new Request(`http://t/api/v1/agent/feedback/${fb.id}/replies?token=SECRET`, {
          method: "POST",
          body: JSON.stringify({ author: "agent-alice", body: "" }),
        }),
        { id: fb.id },
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when replying across projects", async () => {
      const { store, handler } = buildHandler([
        { id: "p1", name: "demo", agentToken: "SECRET" },
        { id: "p2", name: "other", agentToken: "OTHER" },
      ]);
      const otherFb = await seedFeedback(store, "other", { clientId: "c1" });
      const res = await handler.addReply(
        new Request(`http://t/api/v1/agent/feedback/${otherFb.id}/replies?token=SECRET`, {
          method: "POST",
          body: JSON.stringify({ author: "agent-alice", body: "hi" }),
        }),
        { id: otherFb.id },
      );
      expect(res.status).toBe(404);
    });
  });

  // CCM-290 P1 regression — ownership check must bypass the 100-row pagination
  // cap. With >100 feedbacks seeded, the oldest (page 2+) must still be
  // reachable via GET/PATCH/addReply.
  describe("ownership check beyond pagination cap", () => {
    async function seedMany(store: FakeStore, projectName: string, count: number): Promise<string[]> {
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const fb = await seedFeedback(store, projectName, { clientId: `c-${i}` });
        ids.push(fb.id);
      }
      return ids;
    }

    it("GET succeeds for a feedback older than the first page (>100)", async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const ids = await seedMany(store, "demo", 101);
      const oldestId = ids[0]!; // first seeded — oldest in createdAt order
      const res = await handler.getFeedback(new Request(`http://t/api/v1/agent/feedback/${oldestId}?token=SECRET`), {
        id: oldestId,
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string };
      expect(body.id).toBe(oldestId);
    });

    it("PATCH succeeds for a feedback older than the first page (>100)", async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const ids = await seedMany(store, "demo", 101);
      const oldestId = ids[0]!;
      const res = await handler.patchFeedback(
        new Request(`http://t/api/v1/agent/feedback/${oldestId}?token=SECRET`, {
          method: "PATCH",
          body: JSON.stringify({ status: "resolved" }),
        }),
        { id: oldestId },
      );
      expect(res.status).toBe(200);
    });

    it("addReply succeeds for a feedback older than the first page (>100)", async () => {
      const { store, handler } = buildHandler([{ id: "p1", name: "demo", agentToken: "SECRET" }]);
      const ids = await seedMany(store, "demo", 101);
      const oldestId = ids[0]!;
      const res = await handler.addReply(
        new Request(`http://t/api/v1/agent/feedback/${oldestId}/replies?token=SECRET`, {
          method: "POST",
          body: JSON.stringify({ author: "agent-alice", body: "old but reachable" }),
        }),
        { id: oldestId },
      );
      expect(res.status).toBe(201);
    });
  });
});

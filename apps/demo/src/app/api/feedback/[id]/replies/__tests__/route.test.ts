/**
 * CCM-290 — smoke tests for the widget-side `/api/feedback/:id/replies` route.
 *
 * Covers: GET returns [] (no auth, widget-facing), POST tags reply with
 * source:"user", POST with no body → 400, POST to unknown id → 404.
 *
 * Import note: `StoreNotFoundError` comes from `@ccm-feedback/adapter-prisma`
 * (not `@ccm-feedback/core`). The route catches `instanceof StoreNotFoundError`
 * against the adapter-prisma bundled class; tsup's `noExternal` bundles core
 * into adapter-prisma so the adapter-prisma copy has a distinct class identity
 * from core's source copy at runtime. Throwing core's class in the fake store
 * would miss the instanceof check and surface as 500.
 */

import { StoreNotFoundError } from "@ccm-feedback/adapter-prisma";
import type { CcmFeedbackStore, ReplyCreateInput, ReplyRecord } from "@ccm-feedback/core";
import { describe, expect, it, vi } from "vitest";

class FakeStore implements Partial<CcmFeedbackStore> {
  replies: ReplyRecord[] = [];
  async listReplies(feedbackId: string): Promise<ReplyRecord[]> {
    return this.replies.filter((r) => r.feedbackId === feedbackId);
  }
  async addReply(input: ReplyCreateInput): Promise<ReplyRecord> {
    if (input.feedbackId === "missing") throw new StoreNotFoundError("Feedback not found");
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

vi.mock("@/lib/store", () => ({ resolveStore: async () => fakeStore }));

describe("widget /api/feedback/:id/replies route", () => {
  it("exports GET and POST", async () => {
    const mod = await import("../route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });

  it("GET returns an empty array for an unknown feedback (no 404 leak)", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request("http://t/api/feedback/unknown/replies"), {
      params: Promise.resolve({ id: "unknown" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toEqual([]);
  });

  it('POST tags the reply with source:"user"', async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://t/api/feedback/fb-1/replies", {
        method: "POST",
        body: JSON.stringify({ author: "user-alice", body: "thanks!" }),
      }),
      { params: Promise.resolve({ id: "fb-1" }) },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { source: string };
    expect(body.source).toBe("user");
  });

  it("POST with invalid body returns 400", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://t/api/feedback/fb-1/replies", {
        method: "POST",
        body: JSON.stringify({ author: "", body: "" }),
      }),
      { params: Promise.resolve({ id: "fb-1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("POST to a missing feedback returns 404", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://t/api/feedback/missing/replies", {
        method: "POST",
        body: JSON.stringify({ author: "a", body: "b" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });
});

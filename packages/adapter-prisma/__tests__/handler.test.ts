import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCcmFeedbackHandler } from "../src/index.js";
import { validAnnotation, validPayloadNoAnnotations } from "./fixtures.js";

function mockPrisma() {
  return {
    feedbackItem: {
      create: vi.fn().mockResolvedValue({
        id: "fb-1",
        ...validPayloadNoAnnotations,
        status: "open",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        annotations: [],
      }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi
        .fn()
        .mockResolvedValue({ id: "fb-1", status: "resolved", resolvedAt: new Date().toISOString(), annotations: [] }),
      delete: vi.fn().mockResolvedValue({ id: "fb-1" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

describe("createCcmFeedbackHandler", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let handler: ReturnType<typeof createCcmFeedbackHandler>;

  beforeEach(() => {
    prisma = mockPrisma();
    handler = createCcmFeedbackHandler({ prisma });
  });

  describe("POST", () => {
    it("creates a feedback with valid payload", async () => {
      const req = new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify(validPayloadNoAnnotations),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(201);
      expect(prisma.feedbackItem.create).toHaveBeenCalledOnce();
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/api/feedback", {
        method: "POST",
        body: "not json",
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing required fields", async () => {
      const req = new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({ type: "bug" }),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it("returns 400 for invalid email", async () => {
      const req = new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({ ...validPayloadNoAnnotations, authorEmail: "not-email" }),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
    });

    it("handles duplicate clientId gracefully", async () => {
      prisma.feedbackItem.create.mockRejectedValue({ code: "P2002" });
      prisma.feedbackItem.findUnique.mockResolvedValue({ id: "fb-1", ...validPayloadNoAnnotations });
      const req = new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify(validPayloadNoAnnotations),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(201);
    });

    it("returns 500 on unexpected DB error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      prisma.feedbackItem.create.mockRejectedValue(new Error("DB down"));
      const req = new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify(validPayloadNoAnnotations),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(500);
      consoleSpy.mockRestore();
    });

    it("maps annotation anchor fields to Prisma create", async () => {
      const payloadWithAnnotation = {
        ...validPayloadNoAnnotations,
        annotations: [validAnnotation],
      };

      const req = new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify(payloadWithAnnotation),
      });

      await handler.POST(req);

      expect(prisma.feedbackItem.create).toHaveBeenCalledOnce();
      const createArg = prisma.feedbackItem.create.mock.calls[0][0] as {
        data: { annotations: { create: Array<Record<string, unknown>> } };
      };
      const flatAnnotation = createArg.data.annotations.create[0];

      expect(flatAnnotation.cssSelector).toBe("div.main > section:nth-child(2)");
      expect(flatAnnotation.xpath).toBe("/html/body/div[1]/section[2]");
      expect(flatAnnotation.textSnippet).toBe("Welcome to our platform");
      expect(flatAnnotation.elementTag).toBe("SECTION");
      expect(flatAnnotation.elementId).toBe("hero");
      expect(flatAnnotation.textPrefix).toBe("Navigation links here");
      expect(flatAnnotation.textSuffix).toBe("Learn more about us");
      expect(flatAnnotation.fingerprint).toBe("3:1:a1b2c3");
      expect(flatAnnotation.neighborText).toBe("Previous section | Next section");
      expect(flatAnnotation.xPct).toBe(0.1);
      expect(flatAnnotation.yPct).toBe(0.2);
      expect(flatAnnotation.wPct).toBe(0.5);
      expect(flatAnnotation.hPct).toBe(0.3);
      expect(flatAnnotation.scrollX).toBe(0);
      expect(flatAnnotation.scrollY).toBe(150);
      expect(flatAnnotation.viewportW).toBe(1920);
      expect(flatAnnotation.viewportH).toBe(1080);
      expect(flatAnnotation.devicePixelRatio).toBe(2);
      // CCM-284 — audioUrl is absent when not supplied by the widget
      expect(flatAnnotation.audioUrl).toBeUndefined();
    });

    // CCM-284 — audioUrl on annotation is persisted when supplied
    it("persists audioUrl on the annotation when provided", async () => {
      const payload = {
        ...validPayloadNoAnnotations,
        annotations: [{ ...validAnnotation, audioUrl: "https://storage.example.com/audio/proj/uuid.webm" }],
      };
      const req = new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(201);
      const createArg = prisma.feedbackItem.create.mock.calls[0][0] as {
        data: { annotations: { create: Array<Record<string, unknown>> } };
      };
      expect(createArg.data.annotations.create[0].audioUrl).toBe("https://storage.example.com/audio/proj/uuid.webm");
    });

    // CCM-284 — invalid audioUrl is rejected at validation time
    it("rejects annotation with invalid audioUrl", async () => {
      const payload = {
        ...validPayloadNoAnnotations,
        annotations: [{ ...validAnnotation, audioUrl: "not-a-url" }],
      };
      const req = new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET", () => {
    it("returns feedbacks for a project", async () => {
      prisma.feedbackItem.findMany.mockResolvedValue([]);
      prisma.feedbackItem.count.mockResolvedValue(0);
      const req = new Request("http://localhost/api/feedback?projectName=test");
      const res = await handler.GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("feedbacks");
      expect(body).toHaveProperty("total");
    });

    it("returns 400 without projectName", async () => {
      const req = new Request("http://localhost/api/feedback");
      const res = await handler.GET(req);
      expect(res.status).toBe(400);
    });

    it("rejects limit > 100 via Zod validation", async () => {
      const req = new Request("http://localhost/api/feedback?projectName=test&limit=999");
      const res = await handler.GET(req);
      expect(res.status).toBe(400);
    });

    it("applies type and status filters", async () => {
      prisma.feedbackItem.findMany.mockResolvedValue([]);
      prisma.feedbackItem.count.mockResolvedValue(0);
      const req = new Request("http://localhost/api/feedback?projectName=test&type=bug&status=open");
      await handler.GET(req);
      const callArgs = prisma.feedbackItem.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(callArgs.where.type).toBe("bug");
      expect(callArgs.where.status).toBe("open");
    });
  });

  describe("PATCH", () => {
    it("resolves a feedback", async () => {
      prisma.feedbackItem.findUnique.mockResolvedValue({ id: "fb-1", projectName: "test-project" });
      prisma.feedbackItem.update.mockResolvedValue({
        id: "fb-1",
        projectName: "test-project",
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        annotations: [],
      });
      const req = new Request("http://localhost/api/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "fb-1", projectName: "test-project", status: "resolved" }),
      });
      const res = await handler.PATCH(req);
      expect(res.status).toBe(200);
      const updateArgs = prisma.feedbackItem.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(updateArgs.data.status).toBe("resolved");
      expect(updateArgs.data.resolvedAt).toBeInstanceOf(Date);
    });

    it("unresolves a feedback (clears resolvedAt)", async () => {
      prisma.feedbackItem.findUnique.mockResolvedValue({ id: "fb-1", projectName: "test-project" });
      prisma.feedbackItem.update.mockResolvedValue({
        id: "fb-1",
        projectName: "test-project",
        status: "open",
        resolvedAt: null,
        annotations: [],
      });
      const req = new Request("http://localhost/api/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "fb-1", projectName: "test-project", status: "open" }),
      });
      await handler.PATCH(req);
      const updateArgs = prisma.feedbackItem.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(updateArgs.data.resolvedAt).toBeNull();
    });

    it("returns 404 when feedback belongs to a different project", async () => {
      prisma.feedbackItem.findUnique.mockResolvedValue({ id: "fb-1", projectName: "other-project" });
      const req = new Request("http://localhost/api/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "fb-1", projectName: "test-project", status: "resolved" }),
      });
      const res = await handler.PATCH(req);
      expect(res.status).toBe(404);
      expect(prisma.feedbackItem.update).not.toHaveBeenCalled();
    });

    it("returns 404 when feedback does not exist", async () => {
      prisma.feedbackItem.findUnique.mockResolvedValue(null);
      const req = new Request("http://localhost/api/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "nonexistent", projectName: "test-project", status: "resolved" }),
      });
      const res = await handler.PATCH(req);
      expect(res.status).toBe(404);
      expect(prisma.feedbackItem.update).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid status", async () => {
      const req = new Request("http://localhost/api/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id: "fb-1", projectName: "test-project", status: "pending" }),
      });
      const res = await handler.PATCH(req);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("deletes a single feedback by id", async () => {
      prisma.feedbackItem.findUnique.mockResolvedValue({ id: "fb-1", projectName: "test-project" });
      const req = new Request("http://localhost/api/feedback", {
        method: "DELETE",
        body: JSON.stringify({ id: "fb-1", projectName: "test-project" }),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(200);
      expect(prisma.feedbackItem.delete).toHaveBeenCalledWith({ where: { id: "fb-1" } });
    });

    it("deletes all feedbacks for a project", async () => {
      const req = new Request("http://localhost/api/feedback", {
        method: "DELETE",
        body: JSON.stringify({ projectName: "test", deleteAll: true }),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(200);
      expect(prisma.feedbackItem.deleteMany).toHaveBeenCalledWith({ where: { projectName: "test" } });
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/api/feedback", {
        method: "DELETE",
        body: "not json",
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for empty body", async () => {
      const req = new Request("http://localhost/api/feedback", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when feedback not found (P2025)", async () => {
      prisma.feedbackItem.findUnique.mockResolvedValue({ id: "nonexistent", projectName: "test-project" });
      prisma.feedbackItem.delete.mockRejectedValue({ code: "P2025" });
      const req = new Request("http://localhost/api/feedback", {
        method: "DELETE",
        body: JSON.stringify({ id: "nonexistent", projectName: "test-project" }),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected DB error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      prisma.feedbackItem.findUnique.mockResolvedValue({ id: "fb-1", projectName: "test-project" });
      prisma.feedbackItem.delete.mockRejectedValue(new Error("DB down"));
      const req = new Request("http://localhost/api/feedback", {
        method: "DELETE",
        body: JSON.stringify({ id: "fb-1", projectName: "test-project" }),
      });
      const res = await handler.DELETE(req);
      expect(res.status).toBe(500);
      consoleSpy.mockRestore();
    });
  });
});

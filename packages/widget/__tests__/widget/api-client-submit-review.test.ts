import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../src/api-client.js";

describe("ApiClient.submitReview", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("POSTs to /api/v1/reviews relative to the feedback endpoint", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ batchId: "b1", dispatchStatus: "delivered", dispatchAttempts: 1 }), {
        status: 201,
      }),
    );
    const client = new ApiClient("/api/feedback", "demo");
    const result = await client.submitReview({
      projectId: "proj_1",
      annotationIds: ["a", "b"],
      reviewer: { name: "Claudio" },
    });

    expect(result.batchId).toBe("b1");
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/v1/reviews");
    expect(call[1].method).toBe("POST");
    expect(JSON.parse(call[1].body as string).annotationIds).toEqual(["a", "b"]);
  });

  it("throws on a non-2xx", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("bad", { status: 400 }));
    const client = new ApiClient("/api/feedback", "demo");
    await expect(
      client.submitReview({ projectId: "p", annotationIds: ["a"], reviewer: { name: "x" } }),
    ).rejects.toThrow(/400/);
  });
});

/**
 * CCM-284 — ApiClient.transcribe() tests.
 *
 * Focus: URL derivation, FormData shape, and error propagation. Avoids real
 * network by stubbing globalThis.fetch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../src/api-client.js";

describe("ApiClient.transcribe", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("POSTs multipart to /api/v1/transcribe relative to the feedback endpoint", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ cleaned_text: "Hello.", raw_text: "um hello", audio_url: "https://s/a.webm" }), {
        status: 200,
      }),
    );

    const client = new ApiClient("/api/feedback", "demo");
    const audio = new Blob(["x"], { type: "audio/webm" });
    const result = await client.transcribe({
      audio,
      selector: "button.submit",
      surroundingText: "Submit",
      projectName: "demo",
    });

    expect(result.cleaned_text).toBe("Hello.");
    expect(result.audio_url).toBe("https://s/a.webm");

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/v1/transcribe");
    expect(call[1].method).toBe("POST");
    const body = call[1].body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("selector")).toBe("button.submit");
    expect(body.get("surroundingText")).toBe("Submit");
    expect(body.get("projectName")).toBe("demo");
    expect(body.get("audio")).toBeInstanceOf(Blob);
  });

  it("derives the URL when the endpoint is an absolute URL", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ cleaned_text: "ok", raw_text: "ok" }), { status: 200 }),
    );
    const client = new ApiClient("https://example.com/api/feedback", "demo");
    await client.transcribe({
      audio: new Blob(["x"], { type: "audio/webm" }),
      selector: "",
      surroundingText: "",
      projectName: "demo",
    });
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("https://example.com/api/v1/transcribe");
  });

  it("throws on non-2xx response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("bad", { status: 502 }));
    const client = new ApiClient("/api/feedback", "demo");
    await expect(
      client.transcribe({
        audio: new Blob(["x"], { type: "audio/webm" }),
        selector: "",
        surroundingText: "",
        projectName: "demo",
      }),
    ).rejects.toThrow(/502/);
  });
});

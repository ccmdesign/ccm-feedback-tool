import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioStorage, CleanupClient, WhisperClient } from "../src/transcribe-clients.js";
import { createTranscribeHandler } from "../src/transcribe-handler.js";

function makeAudioFile({ size = 128, mime = "audio/webm;codecs=opus" } = {}): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], "voice.webm", { type: mime });
}

function makeForm(opts: {
  audio?: File | null;
  selector?: string;
  surroundingText?: string;
  projectName?: string | null;
}): FormData {
  const form = new FormData();
  if (opts.audio) form.append("audio", opts.audio);
  if (opts.selector !== undefined) form.append("selector", opts.selector);
  if (opts.surroundingText !== undefined) form.append("surroundingText", opts.surroundingText);
  if (opts.projectName !== undefined && opts.projectName !== null) form.append("projectName", opts.projectName);
  return form;
}

function makeRequest(form: FormData, origin?: string): Request {
  const init: RequestInit = { method: "POST", body: form };
  if (origin) init.headers = { Origin: origin };
  return new Request("http://localhost/api/v1/transcribe", init);
}

describe("createTranscribeHandler", () => {
  let whisper: WhisperClient & { transcribe: ReturnType<typeof vi.fn> };
  let cleanup: CleanupClient & { clean: ReturnType<typeof vi.fn> };
  let storage: AudioStorage & { upload: ReturnType<typeof vi.fn> };
  let logger: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    whisper = { transcribe: vi.fn().mockResolvedValue("um the the button doesn't work you know") } as never;
    cleanup = { clean: vi.fn().mockResolvedValue("The button doesn't work.") } as never;
    storage = {
      upload: vi.fn().mockResolvedValue("https://storage.example.com/audio/p/uuid.webm"),
    } as never;
    logger = { warn: vi.fn(), error: vi.fn() };
  });

  // Happy path — no storage dep → cleaned + raw returned, no audio_url
  it("returns cleaned_text + raw_text on happy path without storage", async () => {
    const handler = createTranscribeHandler({ whisper, cleanup, logger });
    const form = makeForm({
      audio: makeAudioFile(),
      selector: "button.submit",
      surroundingText: "Submit review",
      projectName: "demo",
    });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { cleaned_text: string; raw_text: string; audio_url?: string };
    expect(body.cleaned_text).toBe("The button doesn't work.");
    expect(body.raw_text).toBe("um the the button doesn't work you know");
    expect(body.audio_url).toBeUndefined();
    expect(whisper.transcribe).toHaveBeenCalledOnce();
    expect(cleanup.clean).toHaveBeenCalledOnce();
    // Handler must forward the context verbatim to the cleanup client.
    expect(cleanup.clean).toHaveBeenCalledWith({
      rawText: "um the the button doesn't work you know",
      projectName: "demo",
      selector: "button.submit",
      surroundingText: "Submit review",
    });
  });

  // Happy path — with storage dep → audio_url populated
  it("includes audio_url when storage is wired", async () => {
    const handler = createTranscribeHandler({ whisper, cleanup, storage, logger });
    const form = makeForm({ audio: makeAudioFile(), projectName: "demo" });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { audio_url?: string };
    expect(body.audio_url).toBe("https://storage.example.com/audio/p/uuid.webm");
    expect(storage.upload).toHaveBeenCalledOnce();
    // Fell back to projectName as the id because no projectStore was injected.
    const call = storage.upload.mock.calls[0][0] as { projectId: string; mime: string };
    expect(call.projectId).toBe("demo");
    expect(call.mime).toBe("audio/webm;codecs=opus");
  });

  // Happy path — with projectStore, storage sees the internal id, not the name
  it("resolves projectId via projectStore when wired", async () => {
    const projectStore = { findByName: vi.fn().mockResolvedValue({ id: "proj_42" }) };
    const handler = createTranscribeHandler({ whisper, cleanup, storage, projectStore, logger });
    const form = makeForm({ audio: makeAudioFile(), projectName: "demo" });
    await handler.POST(makeRequest(form));
    const call = storage.upload.mock.calls[0][0] as { projectId: string };
    expect(call.projectId).toBe("proj_42");
    expect(projectStore.findByName).toHaveBeenCalledWith("demo");
  });

  // Edge — missing audio
  it("returns 400 when 'audio' field is missing", async () => {
    const handler = createTranscribeHandler({ whisper, cleanup, logger });
    const form = makeForm({ projectName: "demo" });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(400);
    expect(whisper.transcribe).not.toHaveBeenCalled();
  });

  // Edge — missing projectName
  it("returns 400 when 'projectName' is missing", async () => {
    const handler = createTranscribeHandler({ whisper, cleanup, logger });
    const form = makeForm({ audio: makeAudioFile() });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(400);
  });

  // Edge — oversized blob
  it("returns 413 when audio exceeds maxAudioBytes", async () => {
    const handler = createTranscribeHandler({ whisper, cleanup, maxAudioBytes: 100, logger });
    const form = makeForm({ audio: makeAudioFile({ size: 500 }), projectName: "demo" });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(413);
  });

  // Edge — unsupported mime
  it("returns 415 for unsupported audio mime", async () => {
    const handler = createTranscribeHandler({ whisper, cleanup, logger });
    const form = makeForm({
      audio: makeAudioFile({ mime: "audio/ogg" }),
      projectName: "demo",
    });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(415);
    expect(whisper.transcribe).not.toHaveBeenCalled();
  });

  // Error — Whisper throws → 502, no partial data
  it("returns 502 when Whisper throws", async () => {
    whisper.transcribe.mockRejectedValue(new Error("openai down"));
    const handler = createTranscribeHandler({ whisper, cleanup, logger });
    const form = makeForm({ audio: makeAudioFile(), projectName: "demo" });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(502);
    expect(cleanup.clean).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  // Error — cleanup throws → 200 with cleaned === raw (graceful degrade)
  it("returns 200 with cleaned_text === raw_text when cleanup throws", async () => {
    cleanup.clean.mockRejectedValue(new Error("openrouter down"));
    const handler = createTranscribeHandler({ whisper, cleanup, logger });
    const form = makeForm({ audio: makeAudioFile(), projectName: "demo" });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { cleaned_text: string; raw_text: string };
    expect(body.cleaned_text).toBe(body.raw_text);
    expect(logger.warn).toHaveBeenCalled();
  });

  // Edge — cleanup returns empty string → cleaned_text falls back to rawText
  it("falls back to rawText when cleanup returns empty", async () => {
    cleanup.clean.mockResolvedValue("   ");
    const handler = createTranscribeHandler({ whisper, cleanup, logger });
    const form = makeForm({ audio: makeAudioFile(), projectName: "demo" });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { cleaned_text: string; raw_text: string };
    expect(body.cleaned_text).toBe(body.raw_text);
  });

  // Error — storage throws with flag on → 500 (don't silently drop)
  it("returns 500 when storage throws", async () => {
    storage.upload.mockRejectedValue(new Error("bucket denied"));
    const handler = createTranscribeHandler({ whisper, cleanup, storage, logger });
    const form = makeForm({ audio: makeAudioFile(), projectName: "demo" });
    const res = await handler.POST(makeRequest(form));
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  // CORS — preflight reflects allowed origins
  it("OPTIONS reflects Origin when it matches allowedOrigins", () => {
    const handler = createTranscribeHandler({
      whisper,
      cleanup,
      allowedOrigins: ["https://app.example.com"],
      logger,
    });
    const req = new Request("http://localhost/api/v1/transcribe", {
      method: "OPTIONS",
      headers: { Origin: "https://app.example.com" },
    });
    const res = handler.OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
  });

  it("OPTIONS omits CORS headers for unlisted origin", () => {
    const handler = createTranscribeHandler({
      whisper,
      cleanup,
      allowedOrigins: ["https://app.example.com"],
      logger,
    });
    const req = new Request("http://localhost/api/v1/transcribe", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example.com" },
    });
    const res = handler.OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

/**
 * Thin Whisper + Cleanup + Storage adapters over the `openai` SDK and a
 * generic storage driver. The transcribe handler depends on these interfaces
 * (not on the OpenAI SDK directly), so tests can inject deterministic fakes.
 *
 * CCM-284 — voice comment pipeline.
 */

import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Cleanup context shared by handler + clients
// ---------------------------------------------------------------------------

export interface CleanupContext {
  rawText: string;
  projectName: string;
  selector: string;
  surroundingText: string;
}

// ---------------------------------------------------------------------------
// Whisper client interface + implementation
// ---------------------------------------------------------------------------

/** Injected by the transcribe handler — turns audio into raw text. */
export interface WhisperClient {
  transcribe(file: File): Promise<string>;
}

export interface WhisperClientOptions {
  /** OpenAI API key (the `openai` SDK also reads OPENAI_API_KEY automatically). */
  apiKey: string;
  /** Transcription model — defaults to `whisper-1`. */
  model?: string;
  /** Override for tests. */
  openai?: OpenAI;
}

/** Build a production Whisper client backed by the official `openai` SDK. */
export function createWhisperClient(opts: WhisperClientOptions): WhisperClient {
  const client = opts.openai ?? new OpenAI({ apiKey: opts.apiKey });
  const model = opts.model ?? "whisper-1";
  return {
    async transcribe(file) {
      const res = await client.audio.transcriptions.create({ file, model });
      // The SDK returns an object with a `text` field when response_format is
      // "json" (default). Guard against string responses from experimental modes.
      if (typeof res === "string") return res;
      return (res as { text?: string }).text ?? "";
    },
  };
}

// ---------------------------------------------------------------------------
// Cleanup client interface + implementation
// ---------------------------------------------------------------------------

/**
 * Cleanup system prompt — pinned as a constant so the regression test in
 * Unit 4 can import and assert against it. Keep terse; cleanup quality drifts
 * when prompts get verbose.
 */
export const CLEANUP_SYSTEM_PROMPT = [
  "You are a transcription cleanup assistant.",
  "You receive a raw speech-to-text transcript and page context.",
  "Your job: remove disfluencies, normalize punctuation, fix obvious transcription errors where the page context makes the intent clear.",
  "Preserve meaning; do not embellish, do not add content, do not interpret or rewrite for clarity.",
  "Return the cleaned transcript as plain text with no quotes or framing.",
].join(" ");

/** Build the OpenAI chat messages for the cleanup call. Exported for the Unit 4 test. */
export function buildCleanupMessages(ctx: CleanupContext): Array<{ role: "system" | "user"; content: string }> {
  const userBlock = [
    `project_name: ${ctx.projectName}`,
    `selector: ${ctx.selector}`,
    `surrounding_text: ${ctx.surroundingText}`,
    `raw_transcript: ${ctx.rawText}`,
  ].join("\n");
  return [
    { role: "system", content: CLEANUP_SYSTEM_PROMPT },
    { role: "user", content: userBlock },
  ];
}

/** Injected by the transcribe handler — returns cleaned text given raw + context. */
export interface CleanupClient {
  clean(ctx: CleanupContext): Promise<string>;
}

export interface CleanupClientOptions {
  /** OpenRouter API key. */
  apiKey: string;
  /** OpenRouter base URL — defaults to `https://openrouter.ai/api/v1`. */
  baseURL?: string;
  /**
   * Cleanup model slug. OpenRouter rotates DeepSeek slugs, so the production
   * default is overridable via env. Default pins DeepSeek V3.2 Exp (the cheapest
   * capable cleanup model at time of writing — 2026-04-20).
   */
  model?: string;
  /** Low by default — we want stability, not creativity. */
  temperature?: number;
  /** Override for tests. */
  openai?: OpenAI;
}

/** Build a production cleanup client pointed at OpenRouter via the OpenAI SDK. */
export function createCleanupClient(opts: CleanupClientOptions): CleanupClient {
  const model = opts.model ?? "deepseek/deepseek-chat-v3.1:free";
  const temperature = opts.temperature ?? 0.2;
  const client =
    opts.openai ??
    new OpenAI({
      apiKey: opts.apiKey,
      baseURL: opts.baseURL ?? "https://openrouter.ai/api/v1",
    });
  return {
    async clean(ctx) {
      const messages = buildCleanupMessages(ctx);
      const res = await client.chat.completions.create({
        model,
        temperature,
        messages,
      });
      const content = res.choices[0]?.message?.content ?? "";
      return content.trim();
    },
  };
}

// ---------------------------------------------------------------------------
// Audio storage interface + minimal Supabase adapter
// ---------------------------------------------------------------------------

/** Injected by the transcribe handler — uploads audio and returns a public URL. */
export interface AudioStorage {
  upload(input: { projectId: string; audio: File; mime: string }): Promise<string>;
}

/**
 * Minimal Supabase Storage client shape used by `createAudioStorage`.
 * Matches the `@supabase/supabase-js` v2 `storage.from(bucket)` returned object
 * without importing the SDK — keeps this package free of a hard supabase dep.
 */
export interface SupabaseStorageLike {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: File | Blob | ArrayBuffer | Buffer,
        options?: { contentType?: string; upsert?: boolean },
      ): Promise<{ data: { path: string } | null; error: { message: string } | null }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
    };
  };
}

export interface AudioStorageOptions {
  supabase: SupabaseStorageLike;
  /** Bucket name — default `audio`. */
  bucket?: string;
  /** UUID generator — default `crypto.randomUUID()`. Injectable for tests. */
  randomUUID?: () => string;
}

/** Pick a file extension from a mime string. */
export function extensionForMime(mime: string): string {
  if (mime.startsWith("audio/mp4")) return "mp4";
  if (mime.startsWith("audio/webm")) return "webm";
  if (mime.startsWith("audio/ogg")) return "ogg";
  if (mime.startsWith("audio/wav") || mime.startsWith("audio/wave")) return "wav";
  // Conservative fallback — keep the original mime's subtype.
  const subtype = mime.split("/")[1] ?? "bin";
  return subtype.replace(/[^a-z0-9]/gi, "");
}

/** Build a Supabase-backed audio storage adapter. */
export function createAudioStorage(opts: AudioStorageOptions): AudioStorage {
  const bucket = opts.bucket ?? "audio";
  const uuid = opts.randomUUID ?? (() => globalThis.crypto.randomUUID());
  return {
    async upload({ projectId, audio, mime }) {
      const ext = extensionForMime(mime);
      const path = `${projectId}/${uuid()}.${ext}`;
      const { error } = await opts.supabase.storage
        .from(bucket)
        .upload(path, audio, { contentType: mime, upsert: false });
      if (error) throw new Error(`[ccm-feedback] audio upload failed: ${error.message}`);
      const { data } = opts.supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },
  };
}

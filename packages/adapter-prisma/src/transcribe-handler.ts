/**
 * POST /api/v1/transcribe — multipart handler that runs Whisper, then cleanup,
 * then (optionally) uploads the raw audio to persistent storage.
 *
 * CCM-284 — voice comment pipeline.
 *
 * Single-route design: the widget gets one round-trip. Cleanup failures
 * degrade gracefully to `cleaned_text === raw_text`; Whisper and storage
 * failures surface as HTTP errors.
 */

import type { ProjectStore } from "./project-store.js";
import type { AudioStorage, CleanupClient, WhisperClient } from "./transcribe-clients.js";

/** Resolves `projectName` to the internal UUID the storage path needs. */
export interface TranscribeProjectStore {
  /** Must return at least `{ id }` for the named project, or `null`. */
  findByName(name: string): Promise<{ id: string } | null>;
}

export interface TranscribeHandlerOptions {
  whisper: WhisperClient;
  cleanup: CleanupClient;
  /** When set, raw audio is uploaded and the response carries `audio_url`. */
  storage?: AudioStorage;
  /** Optional lookup from `projectName` → internal id for the storage path. */
  projectStore?: TranscribeProjectStore;
  /** Max audio size in bytes — default 5MB. */
  maxAudioBytes?: number;
  /** Allowed upload mime prefixes — default `["audio/webm", "audio/mp4"]`. */
  allowedMimes?: string[];
  /** Override console — injectable for tests. */
  logger?: { warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  /** Allowed CORS origins — when set, validates the Origin header. */
  allowedOrigins?: string[] | undefined;
}

export interface TranscribeResponseBody {
  cleaned_text: string;
  raw_text: string;
  audio_url?: string;
}

const DEFAULT_MAX_BYTES = 5_000_000;
const DEFAULT_ALLOWED_MIMES = ["audio/webm", "audio/mp4"];

function buildCorsHeaders(request: Request, allowedOrigins: string[] | undefined): Record<string, string> {
  if (!allowedOrigins) return {};
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(response: Response, corsHeaders: Record<string, string>): Response {
  for (const [key, value] of Object.entries(corsHeaders)) response.headers.set(key, value);
  return response;
}

function mimeIsAllowed(mime: string, allowed: string[]): boolean {
  for (const prefix of allowed) {
    if (mime === prefix || mime.startsWith(`${prefix};`)) return true;
  }
  return false;
}

/**
 * Normalize a string for safe use as a single storage path segment.
 * Strips slashes, control chars, and collapses whitespace so a raw
 * `projectName` (free-form user input) can't escape its bucket subdirectory
 * or produce empty segments. Falls back to `"unknown-project"` when the
 * result is empty after sanitization.
 */
function sanitizePathSegment(value: string): string {
  const cleaned = value
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : "unknown-project";
}

/**
 * Build the async POST handler. Exposes an accompanying OPTIONS function for
 * CORS preflight, mirroring the shape used by `createCcmFeedbackHandler`.
 */
export function createTranscribeHandler(opts: TranscribeHandlerOptions) {
  const maxBytes = opts.maxAudioBytes ?? DEFAULT_MAX_BYTES;
  const allowed = opts.allowedMimes ?? DEFAULT_ALLOWED_MIMES;
  const log = opts.logger ?? console;

  async function POST(request: Request): Promise<Response> {
    const corsHeaders = buildCorsHeaders(request, opts.allowedOrigins);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return withCors(Response.json({ error: "Expected multipart/form-data body" }, { status: 400 }), corsHeaders);
    }

    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return withCors(
        Response.json({ error: "Missing 'audio' file field in multipart form" }, { status: 400 }),
        corsHeaders,
      );
    }
    const selector = String(form.get("selector") ?? "");
    const surroundingText = String(form.get("surroundingText") ?? "");
    const projectName = String(form.get("projectName") ?? "");
    if (!projectName) {
      return withCors(
        Response.json({ error: "Missing 'projectName' field in multipart form" }, { status: 400 }),
        corsHeaders,
      );
    }

    if (audio.size > maxBytes) {
      return withCors(
        Response.json({ error: `Audio too large (max ${maxBytes} bytes)` }, { status: 413 }),
        corsHeaders,
      );
    }

    const mime = audio.type || "application/octet-stream";
    if (!mimeIsAllowed(mime, allowed)) {
      return withCors(Response.json({ error: `Unsupported audio mime '${mime}'` }, { status: 415 }), corsHeaders);
    }

    // 1. Whisper — hard failure returns 502, no partial data leaks.
    let rawText: string;
    try {
      rawText = await opts.whisper.transcribe(audio);
    } catch (error) {
      log.error("[ccm-feedback] Whisper transcription failed:", error);
      return withCors(Response.json({ error: "Transcription failed" }, { status: 502 }), corsHeaders);
    }

    // 2. Cleanup — graceful degradation: cleaned_text falls back to rawText.
    let cleanedText = rawText;
    try {
      const candidate = await opts.cleanup.clean({ rawText, projectName, selector, surroundingText });
      if (candidate.trim().length > 0) cleanedText = candidate;
    } catch (error) {
      log.warn("[ccm-feedback] Cleanup pass failed, returning raw transcript:", error);
    }

    // 3. Optional storage — flag-on failure surfaces as 500 (no silent drop).
    let audioUrl: string | undefined;
    if (opts.storage) {
      try {
        // Resolve the internal project id if a store is wired; otherwise
        // fall back to a sanitized projectName as the path segment so the
        // upload still works in simple deployments without leaking path
        // separators or other filesystem-sensitive characters.
        let projectId: string;
        if (opts.projectStore) {
          const found = await opts.projectStore.findByName(projectName);
          projectId = found ? found.id : sanitizePathSegment(projectName);
        } else {
          projectId = sanitizePathSegment(projectName);
        }
        audioUrl = await opts.storage.upload({ projectId, audio, mime });
      } catch (error) {
        log.error("[ccm-feedback] Audio storage upload failed:", error);
        return withCors(Response.json({ error: "Audio storage failed" }, { status: 500 }), corsHeaders);
      }
    }

    const body: TranscribeResponseBody = {
      cleaned_text: cleanedText,
      raw_text: rawText,
      ...(audioUrl ? { audio_url: audioUrl } : {}),
    };
    return withCors(Response.json(body, { status: 200 }), corsHeaders);
  }

  function OPTIONS(request: Request): Response {
    const corsHeaders = buildCorsHeaders(request, opts.allowedOrigins);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return { POST, OPTIONS };
}

// ---------------------------------------------------------------------------
// Adapter for the production ProjectStore → TranscribeProjectStore contract
// ---------------------------------------------------------------------------

/**
 * Wrap a production `ProjectStore` so it satisfies the lighter-weight
 * `TranscribeProjectStore` contract. The real `ProjectStore` doesn't expose a
 * direct name lookup — consumers iterate `listProjects()`. This wrapper does
 * that once per call. Volume on transcribe is low enough that caching is a
 * follow-up optimization, not a blocker.
 */
export function adaptProjectStore(store: ProjectStore): TranscribeProjectStore {
  return {
    async findByName(name: string) {
      const projects = await store.listProjects();
      const match = projects.find((p) => p.name === name);
      return match ? { id: match.id } : null;
    },
  };
}

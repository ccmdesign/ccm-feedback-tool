import type {
  AllowedImageMime,
  AssetMeta,
  FeedbackPayload,
  FeedbackResponse,
  FeedbackStatus,
  FeedbackType,
  ReplyResponse,
} from "@ccm-feedback/core";

/** CCM-282 — result of a mirror or signed-upload request. */
export interface MirrorAssetResponse {
  proposedAssetUrl: string;
  assetMeta: AssetMeta | null;
  alreadyMirrored?: boolean;
}

export interface SignUploadResponse {
  signedUrl: string;
  token: string;
  path: string;
  proposedAssetUrl: string;
  contentType: AllowedImageMime;
  expiresInSeconds: number;
}

/**
 * Abstract client interface used by the widget internals.
 *
 * `ApiClient` (HTTP mode) and `StoreClient` (direct store mode) both satisfy
 * this interface, allowing the widget to work identically in either mode.
 */
export interface WidgetClient {
  sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse>;
  getFeedbacks(
    projectName: string,
    options?: { page?: number; limit?: number; type?: FeedbackType; status?: FeedbackStatus; search?: string },
  ): Promise<{ feedbacks: FeedbackResponse[]; total: number }>;
  resolveFeedback(id: string, resolved: boolean): Promise<FeedbackResponse>;
  deleteFeedback(id: string): Promise<void>;
  deleteAllFeedbacks(projectName: string): Promise<void>;
  /**
   * CCM-279: submit a review batch for downstream dispatch.
   * HTTP clients POST to `/api/v1/reviews`; store clients throw.
   */
  submitReview?(input: {
    projectId: string;
    annotationIds: string[];
    reviewer?: { name: string; email?: string };
  }): Promise<{ batchId: string; dispatchStatus: string; dispatchAttempts: number }>;
  /**
   * CCM-282: mirror an external asset URL into CCM storage.
   * HTTP clients POST to `/api/v1/assets/mirror`; store clients throw.
   */
  mirrorAsset?(input: { projectId: string; url: string }): Promise<MirrorAssetResponse>;
  /**
   * CCM-282: request a short-lived signed upload URL for direct-to-Storage PUT.
   * HTTP clients POST to `/api/v1/assets/sign-upload`; store clients throw.
   */
  signUpload?(input: {
    projectId: string;
    filename: string;
    contentType: AllowedImageMime;
    sizeBytes: number;
  }): Promise<SignUploadResponse>;
  /**
   * CCM-284: transcribe a voice recording to cleaned comment text.
   * HTTP clients POST multipart to `/api/v1/transcribe`; store clients throw
   * (voice dictation requires server keys).
   */
  transcribe?(input: {
    audio: Blob;
    selector: string;
    surroundingText: string;
    projectName: string;
  }): Promise<{ cleaned_text: string; raw_text: string; audio_url?: string }>;
  /** CCM-290 — list replies on a feedback. */
  listReplies(id: string): Promise<ReplyResponse[]>;
  /** CCM-290 — append a user reply on a feedback. `source` is fixed to "user". */
  addReply(id: string, input: { author: string; authorEmail?: string; body: string }): Promise<ReplyResponse>;
}

const MAX_RETRIES = 3;
const TIMEOUT_MS = 10_000;
const RETRY_QUEUE_KEY = "ccm_feedback_retry_queue";
const MAX_QUEUE_SIZE = 20;

// ---------------------------------------------------------------------------
// Core fetch with retry + exponential backoff + jitter
// ---------------------------------------------------------------------------

async function resilientFetch(url: string, init: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Don't retry client errors (4xx) — only server errors (5xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      if (attempt === retries) return response;
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === retries) throw error;
    }

    // Exponential backoff with jitter: 1s, 2s, 4s + random ±500ms
    const baseDelay = 1000 * 2 ** attempt;
    const jitter = Math.random() * 1000 - 500;
    await new Promise((r) => setTimeout(r, baseDelay + jitter));
  }

  throw new Error("Max retries exceeded");
}

// ---------------------------------------------------------------------------
// Retry queue — persist failed feedbacks for retry on next page load
// ---------------------------------------------------------------------------

type RetryEntry = { endpoint: string; payload: FeedbackPayload };

const LOCK_NAME = "ccm_feedback_retry_queue";

/**
 * Acquire a Web Lock to serialize cross-tab access to the retry queue.
 * Falls back to running the callback without locking on older browsers.
 */
async function withRetryLock<T>(callback: () => T | Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, () => callback());
  }
  return callback();
}

function queueForRetry(endpoint: string, payload: FeedbackPayload): void {
  // Fire-and-forget — we don't want to block the caller on the lock
  void withRetryLock(() => {
    try {
      const raw = localStorage.getItem(RETRY_QUEUE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const queue: RetryEntry[] = Array.isArray(parsed) ? (parsed as RetryEntry[]) : [];

      // Cap queue size to prevent unbounded localStorage growth
      if (queue.length >= MAX_QUEUE_SIZE) {
        queue.shift(); // Drop oldest entry
      }

      queue.push({ endpoint, payload });
      localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // localStorage full or unavailable — silently drop
    }
  });
}

export async function flushRetryQueue(endpoint: string): Promise<void> {
  await withRetryLock(async () => {
    try {
      const raw = localStorage.getItem(RETRY_QUEUE_KEY);
      if (!raw) return;

      const parsed: unknown = JSON.parse(raw);
      const queue: RetryEntry[] = Array.isArray(parsed) ? (parsed as RetryEntry[]) : [];

      const toRetry = queue.filter((e) => e.endpoint === endpoint);
      if (toRetry.length === 0) return;

      // Process items sequentially to avoid overwhelming the server
      const failed: RetryEntry[] = [];
      for (const entry of toRetry) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry.payload),
          });
          if (!res.ok) {
            failed.push(entry);
          }
        } catch {
          failed.push(entry);
        }
      }

      // Rebuild queue: keep unrelated entries + failed retries
      const remaining = queue.filter((e) => e.endpoint !== endpoint).concat(failed);
      if (remaining.length > 0) {
        localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(RETRY_QUEUE_KEY);
      }
    } catch {
      // Ignore — localStorage may be unavailable
    }
  });
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export class ApiClient {
  constructor(
    private readonly endpoint: string,
    private readonly projectName: string,
  ) {}

  async sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    try {
      const response = await resilientFetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to send feedback: ${response.status} ${text}`);
      }

      return (await response.json()) as FeedbackResponse; // Server validates via Zod
    } catch (error) {
      queueForRetry(this.endpoint, payload);
      throw error;
    }
  }

  async getFeedbacks(
    projectName: string,
    options?: {
      page?: number;
      limit?: number;
      type?: FeedbackType;
      status?: FeedbackStatus;
      search?: string;
    },
  ): Promise<{ feedbacks: FeedbackResponse[]; total: number }> {
    const params = new URLSearchParams({ projectName });
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.type) params.set("type", options.type);
    if (options?.status) params.set("status", options.status);
    if (options?.search) params.set("search", options.search);

    const response = await resilientFetch(`${this.endpoint}?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feedbacks: ${response.status}`);
    }

    return (await response.json()) as { feedbacks: FeedbackResponse[]; total: number }; // Server validates via Zod
  }

  async resolveFeedback(id: string, resolved: boolean): Promise<FeedbackResponse> {
    const response = await resilientFetch(this.endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, projectName: this.projectName, status: resolved ? "resolved" : "open" }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update feedback: ${response.status}`);
    }

    return (await response.json()) as FeedbackResponse; // Server validates via Zod
  }

  async deleteFeedback(id: string): Promise<void> {
    const response = await resilientFetch(this.endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, projectName: this.projectName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete feedback: ${response.status}`);
    }
  }

  async deleteAllFeedbacks(projectName: string): Promise<void> {
    const response = await resilientFetch(this.endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, deleteAll: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete all feedbacks: ${response.status}`);
    }
  }

  /**
   * CCM-279 — submit a review batch. The dispatcher signs + POSTs the §6.1
   * payload to the project's configured implementation webhook.
   *
   * Resolves against `${baseUrl}/api/v1/reviews` where `baseUrl` is derived
   * from the widget's `endpoint` config (strip `/api/feedback` suffix if
   * present, else fall back to the site origin).
   */
  async submitReview(input: {
    projectId: string;
    annotationIds: string[];
    reviewer?: { name: string; email?: string };
  }): Promise<{ batchId: string; dispatchStatus: string; dispatchAttempts: number }> {
    const base = this.endpoint.replace(/\/api\/feedback\/?$/, "");
    const url = `${base || ""}/api/v1/reviews`;
    const response = await resilientFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Failed to submit review: ${response.status} ${text}`);
    }
    return (await response.json()) as { batchId: string; dispatchStatus: string; dispatchAttempts: number };
  }

  /** Rebuild the `/api/v1/...` URL from the widget's feedback endpoint. */
  private v1Url(path: string): string {
    const base = this.endpoint.replace(/\/api\/feedback\/?$/, "");
    return `${base || ""}/api/v1/${path.replace(/^\//, "")}`;
  }

  /** CCM-282 — mirror an external image URL into the CCM Storage bucket. */
  async mirrorAsset(input: { projectId: string; url: string }): Promise<MirrorAssetResponse> {
    const response = await resilientFetch(this.v1Url("assets/mirror"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`mirror failed: ${response.status} ${text}`);
    }
    return (await response.json()) as MirrorAssetResponse;
  }

  /** CCM-282 — request a short-lived signed upload URL. */
  async signUpload(input: {
    projectId: string;
    filename: string;
    contentType: AllowedImageMime;
    sizeBytes: number;
  }): Promise<SignUploadResponse> {
    const response = await resilientFetch(this.v1Url("assets/sign-upload"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`sign-upload failed: ${response.status} ${text}`);
    }
    return (await response.json()) as SignUploadResponse;
  }

  /**
   * CCM-284 — upload a voice recording and receive cleaned transcript.
   *
   * URL derivation mirrors `submitReview`: strip `/api/feedback` from the
   * widget endpoint and append `/api/v1/transcribe`. Non-retryable: a 5xx
   * would still be surfaced to the user as an inline error (they can press
   * mic again), so we use a bare `fetch` rather than `resilientFetch`.
   */
  /**
   * CCM-290 — list replies for a feedback.
   *
   * Routes to `${endpointBase}/api/feedback/:id/replies` (GET). `endpointBase`
   * is the widget's `endpoint` config with a trailing `/api/feedback` removed
   * (parallels the `submitReview` / `v1Url` derivation).
   */
  async listReplies(id: string): Promise<ReplyResponse[]> {
    const response = await resilientFetch(`${this.endpoint}/${encodeURIComponent(id)}/replies`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Failed to list replies: ${response.status}`);
    }
    return (await response.json()) as ReplyResponse[];
  }

  /**
   * CCM-290 — append a user reply. The widget is session-trusted, so author
   * + optional email come from the current identity; `source` is always
   * `"user"` server-side (the agent API has its own route factory).
   */
  async addReply(id: string, input: { author: string; authorEmail?: string; body: string }): Promise<ReplyResponse> {
    const response = await resilientFetch(`${this.endpoint}/${encodeURIComponent(id)}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Failed to add reply: ${response.status} ${text}`);
    }
    return (await response.json()) as ReplyResponse;
  }

  async transcribe(input: {
    audio: Blob;
    selector: string;
    surroundingText: string;
    projectName: string;
  }): Promise<{ cleaned_text: string; raw_text: string; audio_url?: string }> {
    const base = this.endpoint.replace(/\/api\/feedback\/?$/, "");
    const url = `${base || ""}/api/v1/transcribe`;
    const form = new FormData();
    form.append("audio", input.audio, "voice.webm");
    form.append("selector", input.selector);
    form.append("surroundingText", input.surroundingText);
    form.append("projectName", input.projectName);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { method: "POST", body: form, signal: controller.signal });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Failed to transcribe: ${response.status} ${text}`);
      }
      return (await response.json()) as { cleaned_text: string; raw_text: string; audio_url?: string };
    } finally {
      clearTimeout(timeout);
    }
  }
}

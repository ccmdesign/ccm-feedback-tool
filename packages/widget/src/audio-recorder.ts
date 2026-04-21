/**
 * CCM-284 — thin wrapper over the browser MediaRecorder API.
 *
 * Owns the MediaStream + MediaRecorder lifecycle. Guarantees the stream
 * tracks are released on every exit path (stop, cancel, error) so the OS
 * mic indicator is never left on.
 */

/** Mime strings the recorder prefers, in order. */
const MIME_PREFERENCE = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
] as const;

/** Hard cap on recording duration (ms) — prevents accidental runaway sessions. */
export const MAX_RECORD_MS = 60_000;

/** Pick the best-supported mime for the current browser. */
export function pickSupportedMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mime of MIME_PREFERENCE) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

/** Returns true when this browser can record audio in one of our accepted mimes. */
export function isMediaRecorderSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") return false;
  return pickSupportedMime() !== null;
}

/**
 * Check the current microphone permission state without prompting the user.
 *
 * Returns `'denied'` only when the Permissions API is available AND reports
 * denial. Any other outcome (including no Permissions API at all, as on Safari)
 * returns `'unknown'` — the caller should render the button and let
 * `getUserMedia` fail loudly.
 */
export async function queryMicrophonePermission(): Promise<"denied" | "granted" | "prompt" | "unknown"> {
  const anyNavigator = navigator as Navigator & {
    permissions?: {
      query(descriptor: { name: string }): Promise<{ state: "denied" | "granted" | "prompt" }>;
    };
  };
  if (!anyNavigator.permissions?.query) return "unknown";
  try {
    const result = await anyNavigator.permissions.query({ name: "microphone" });
    return result.state;
  } catch {
    return "unknown";
  }
}

export type RecorderState = "idle" | "recording" | "stopping";

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private state: RecorderState = "idle";
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingResolve: ((blob: Blob) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;

  /** Current recorder state. */
  getState(): RecorderState {
    return this.state;
  }

  /**
   * Request mic permission + start a recording session. Throws with a typed
   * Error on permission denial or unsupported-browser cases.
   */
  async start(): Promise<void> {
    if (this.state !== "idle") throw new Error("AudioRecorder busy");
    if (!isMediaRecorderSupported()) throw new Error("MediaRecorder not supported");

    const mime = pickSupportedMime();
    if (!mime) throw new Error("No supported audio mime");

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    try {
      this.recorder = new MediaRecorder(this.stream, { mimeType: mime });
    } catch (error) {
      this.releaseStream();
      throw error instanceof Error ? error : new Error(String(error));
    }
    this.chunks = [];
    this.state = "recording";

    this.recorder.addEventListener("dataavailable", (event) => {
      const data = (event as BlobEvent).data;
      if (data && data.size > 0) this.chunks.push(data);
    });
    this.recorder.addEventListener("error", (event) => {
      const err = (event as Event & { error?: Error }).error ?? new Error("MediaRecorder error");
      this.bail(err);
    });
    this.recorder.addEventListener("stop", () => {
      const mimeType = this.recorder?.mimeType ?? mime;
      const blob = new Blob(this.chunks, { type: mimeType });
      this.releaseStream();
      this.state = "idle";
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      this.pendingReject = null;
      resolve?.(blob);
    });

    this.recorder.start();
    this.autoStopTimer = setTimeout(() => {
      if (this.state === "recording") this.stop().catch(() => undefined);
    }, MAX_RECORD_MS);
  }

  /**
   * Stop the active recording and resolve with the final audio Blob.
   * Safe to call when state is `'recording'`; no-op when idle.
   */
  stop(): Promise<Blob> {
    if (this.state !== "recording" || !this.recorder) {
      return Promise.reject(new Error("Not recording"));
    }
    this.state = "stopping";
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
    return new Promise<Blob>((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.recorder?.stop();
    });
  }

  /**
   * Abort the session without resolving. Releases tracks immediately.
   * Safe to call from any state — used by the popup on cancel/destroy.
   */
  cancel(): void {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
    try {
      if (this.recorder && this.state !== "idle") this.recorder.stop();
    } catch {
      // ignore — recorder may already be stopped
    }
    this.releaseStream();
    this.state = "idle";
    const reject = this.pendingReject;
    this.pendingResolve = null;
    this.pendingReject = null;
    reject?.(new Error("cancelled"));
  }

  private bail(error: Error): void {
    this.releaseStream();
    this.state = "idle";
    const reject = this.pendingReject;
    this.pendingResolve = null;
    this.pendingReject = null;
    reject?.(error);
  }

  private releaseStream(): void {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) {
      try {
        track.stop();
      } catch {
        // ignore
      }
    }
    this.stream = null;
    this.recorder = null;
  }
}

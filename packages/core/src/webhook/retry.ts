/**
 * Retry backoff math for the outbound dispatcher.
 *
 * Shape matches the spec §6.3 guarantee ("failed webhook deliveries are
 * retried with exponential backoff for up to 24h"). The scheduled function
 * runs every 5 minutes; this math tells it when each batch is eligible.
 */

/** Options for `backoffDelay`. */
export interface BackoffOptions {
  /** Base seconds for attempt 0. Default 60. */
  baseSeconds?: number;
  /** +/- seconds of uniform jitter. Default 30. */
  jitterSeconds?: number;
  /** Max seconds for a single delay. Default 3600 (1h). */
  maxSeconds?: number;
  /** RNG for deterministic tests. Defaults to `Math.random`. */
  rng?: () => number;
}

const DEFAULT_BASE = 60;
const DEFAULT_JITTER = 30;
const DEFAULT_MAX = 3600;
const MAX_ATTEMPTS = 10;
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Compute the delay (in seconds) before the next attempt, given how many
 * attempts have already been made.
 *
 * `attempts` is zero-based — `backoffDelay(0)` is the delay after the first
 * failure (before attempt 1). Formula:
 *   delay = clamp(base * 2**attempts, 0, max) + jitter([-j, +j])
 */
export function backoffDelay(attempts: number, opts?: BackoffOptions): number {
  if (!Number.isFinite(attempts) || attempts < 0) {
    throw new Error("[ccm-feedback] backoffDelay: attempts must be >= 0");
  }
  const base = opts?.baseSeconds ?? DEFAULT_BASE;
  const jitter = opts?.jitterSeconds ?? DEFAULT_JITTER;
  const maxSeconds = opts?.maxSeconds ?? DEFAULT_MAX;
  const rng = opts?.rng ?? Math.random;
  const raw = Math.min(base * 2 ** attempts, maxSeconds);
  const noise = (rng() * 2 - 1) * jitter;
  return Math.max(0, raw + noise);
}

/** Input for `shouldStopRetry`. */
export interface ShouldStopRetryInput {
  submittedAt: Date;
  attempts: number;
  nowMs?: number;
  maxAttempts?: number;
  maxWindowMs?: number;
}

/**
 * Return `true` when the batch should be marked `failed` and stop retrying.
 * Stop conditions: `attempts >= maxAttempts` (default 10) OR
 * `now - submittedAt >= maxWindowMs` (default 24h).
 */
export function shouldStopRetry(input: ShouldStopRetryInput): boolean {
  const maxAttempts = input.maxAttempts ?? MAX_ATTEMPTS;
  const maxWindow = input.maxWindowMs ?? RETRY_WINDOW_MS;
  if (input.attempts >= maxAttempts) return true;
  const now = input.nowMs ?? Date.now();
  const elapsed = now - input.submittedAt.getTime();
  return elapsed >= maxWindow;
}

/** Convenience: return a concrete next attempt time given the current state. */
export function nextAttemptAt(input: { now: Date; attempts: number; options?: BackoffOptions }): Date {
  const delaySeconds = backoffDelay(input.attempts, input.options);
  return new Date(input.now.getTime() + delaySeconds * 1000);
}

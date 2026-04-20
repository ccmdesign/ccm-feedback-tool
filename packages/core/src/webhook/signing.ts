/**
 * HMAC-SHA256 signing + verification for outbound webhooks.
 *
 * Header format (Stripe-style):
 *   X-CCM-Signature: t=<unix-seconds>,v1=<hex>
 * Plus a legacy body-only header for spec §6.1 compatibility:
 *   X-CCM-Signature-SHA256: sha256=<hex>
 *
 * Verification:
 *   - Reconstruct signed = `<ts>.<body>` and HMAC with the project secret.
 *   - `timingSafeEqual` the recomputed hex against the header's v1= value.
 *   - Reject when |now - ts| > toleranceSeconds.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalize } from "./canonicalization.js";

/** Input for `signWebhook`. */
export interface SignWebhookInput {
  /** Payload to sign. Serialized via `canonicalize` before hashing. */
  payload: unknown;
  /** Project webhook secret — plaintext. */
  secret: string;
  /** Unix timestamp in seconds. Defaults to `Math.floor(Date.now() / 1000)`. */
  timestamp?: number;
}

/** Result of `signWebhook`. */
export interface SignWebhookResult {
  /** Canonical JSON body bytes (what the server transmits and the verifier re-hashes). */
  body: string;
  /** Unix timestamp used in the signature. */
  timestamp: number;
  /** HTTP headers to attach to the outbound POST. */
  headers: {
    /** Stripe-style timestamp-prefixed v1 signature. */
    "X-CCM-Signature": string;
    /** Spec §6.1-compat body-only sha256 header. */
    "X-CCM-Signature-SHA256": string;
  };
}

/** Input for `verifyWebhook`. */
export interface VerifyWebhookInput {
  /** The exact bytes the server hashed (already canonicalized). */
  body: string;
  /** Project webhook secret — plaintext. */
  secret: string;
  /** The value of the `X-CCM-Signature` header from the incoming request. */
  header: string;
  /** Seconds of allowed clock skew. Defaults to 300. */
  toleranceSeconds?: number;
  /** Override for testing — defaults to `Math.floor(Date.now() / 1000)`. */
  nowSeconds?: number;
}

function hmacHex(secret: string, input: string): string {
  return createHmac("sha256", secret).update(input).digest("hex");
}

/**
 * Sign a webhook payload. Returns the canonical body bytes + headers.
 *
 * The caller POSTs `body` as the HTTP body and attaches `headers` to the
 * request. For retries, re-sign with the same canonical body (cached) so
 * the v1 hex changes only when the timestamp changes.
 */
export function signWebhook(input: SignWebhookInput): SignWebhookResult {
  const body = typeof input.payload === "string" ? input.payload : canonicalize(input.payload);
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
  const v1 = hmacHex(input.secret, `${timestamp}.${body}`);
  const bodyOnly = hmacHex(input.secret, body);
  return {
    body,
    timestamp,
    headers: {
      "X-CCM-Signature": `t=${timestamp},v1=${v1}`,
      "X-CCM-Signature-SHA256": `sha256=${bodyOnly}`,
    },
  };
}

/** Parse `t=<ts>,v1=<hex>` into its parts. Returns `null` on malformed input. */
function parseHeader(header: string): { timestamp: number; v1: string } | null {
  // Reject whitespace leniency in the middle — be strict so fixtures are portable.
  const parts = header.split(",").map((p) => p.trim());
  let ts: number | null = null;
  let v1: string | null = null;
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) return null;
    const k = part.slice(0, eq);
    const v = part.slice(eq + 1);
    if (k === "t") {
      const n = Number.parseInt(v, 10);
      if (!Number.isFinite(n)) return null;
      ts = n;
    } else if (k === "v1") {
      if (!/^[0-9a-f]+$/i.test(v)) return null;
      v1 = v.toLowerCase();
    }
  }
  if (ts === null || v1 === null) return null;
  return { timestamp: ts, v1 };
}

/**
 * Verify an incoming webhook signature.
 *
 * Returns `true` when the signature matches and the timestamp is within
 * tolerance; `false` otherwise. Never throws on bad input — callers can
 * branch on a single boolean.
 */
export function verifyWebhook(input: VerifyWebhookInput): boolean {
  const tolerance = input.toleranceSeconds ?? 300;
  const parsed = parseHeader(input.header);
  if (!parsed) return false;

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > tolerance) return false;

  const expectedHex = hmacHex(input.secret, `${parsed.timestamp}.${input.body}`);
  const a = Buffer.from(expectedHex, "hex");
  const b = Buffer.from(parsed.v1, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

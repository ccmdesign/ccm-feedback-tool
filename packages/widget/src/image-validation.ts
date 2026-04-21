import { MAX_ASSET_SIZE_BYTES, UPLOAD_ALLOWED_IMAGE_MIMES } from "@ccm-feedback/core";

export type ImageValidationError =
  | { kind: "size" }
  | { kind: "mime" }
  | { kind: "url" }
  | { kind: "generic"; message: string };

/**
 * Client-side file validator. Order: size → MIME. Returns `null` on success or
 * a structured error object that the UI surfaces with the localized string.
 *
 * Zero-byte files are rejected up front — they waste a signed-upload round-trip,
 * land as orphans in Storage (because the server-side Zod schema requires
 * `sizeBytes > 0`), and never surface a useful annotation.
 *
 * CCM-282 P1: SVG is rejected client-side to mirror the server-side
 * signed-upload allowlist. Reviewers can still submit SVGs by pasting a URL
 * (that path runs `isSafeSvg()` before the server uploads the bytes).
 */
export function validateFileBeforeUpload(file: File): ImageValidationError | null {
  if (file.size <= 0) return { kind: "size" };
  if (file.size > MAX_ASSET_SIZE_BYTES) return { kind: "size" };
  if (!(UPLOAD_ALLOWED_IMAGE_MIMES as readonly string[]).includes(file.type)) return { kind: "mime" };
  return null;
}

/**
 * Validate a pasted URL shape. Rejects malformed URLs, non-https (except
 * localhost), and `data:` URIs. Returns `null` on success.
 *
 * CCM-282 P1 (defense-in-depth): also reject obviously-private IP literals
 * client-side so the mirror endpoint doesn't have to round-trip attacker
 * probes. This is NOT a security boundary — the server-side SSRF guard in
 * `assertSafeMirrorUrl` is authoritative and performs DNS resolution.
 */
export function validateUrlBeforePaste(input: string): ImageValidationError | null {
  if (!input || typeof input !== "string") return { kind: "url" };
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { kind: "url" };
  }
  if (url.protocol === "data:") return { kind: "url" };
  const hostname = url.hostname.toLowerCase();
  const isLocalhostLike = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
  if (url.protocol !== "https:" && !isLocalhostLike) return { kind: "url" };

  // Reject obvious private / link-local / metadata-service literals even when
  // the server mirrors the same list — fewer round-trips, clearer feedback.
  if (url.protocol === "https:" && isObviouslyPrivateHostLiteral(hostname)) {
    return { kind: "url" };
  }
  return null;
}

function isObviouslyPrivateHostLiteral(hostname: string): boolean {
  // Bracketed IPv6 — URL.hostname strips brackets, but be defensive.
  if (hostname === "::1" || hostname === "0:0:0:0:0:0:0:1") return true;
  if (hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80:")) return true;
  // IPv4 literals only; everything else is DNS.
  if (!/^[0-9.]+$/.test(hostname)) return false;
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number.parseInt(p, 10));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const a = nums[0] ?? 0;
  const b = nums[1] ?? 0;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

import { ALLOWED_IMAGE_MIMES, MAX_ASSET_SIZE_BYTES } from "@ccm-feedback/core";

export type ImageValidationError =
  | { kind: "size" }
  | { kind: "mime" }
  | { kind: "url" }
  | { kind: "generic"; message: string };

/**
 * Client-side file validator. Order: size → MIME. Returns `null` on success or
 * a structured error object that the UI surfaces with the localized string.
 */
export function validateFileBeforeUpload(file: File): ImageValidationError | null {
  if (file.size > MAX_ASSET_SIZE_BYTES) return { kind: "size" };
  if (!(ALLOWED_IMAGE_MIMES as readonly string[]).includes(file.type)) return { kind: "mime" };
  return null;
}

/**
 * Validate a pasted URL shape. Rejects malformed URLs, non-https (except
 * localhost), and `data:` URIs. Returns `null` on success.
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
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".local");
  if (url.protocol !== "https:" && !isLocalhost) return { kind: "url" };
  return null;
}

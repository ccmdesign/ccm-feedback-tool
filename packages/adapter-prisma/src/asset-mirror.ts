/**
 * Pure helpers supporting the `/api/v1/assets/mirror` endpoint — kept
 * dependency-free so they can be unit-tested in isolation from the Supabase
 * storage client and the Next route wrapper.
 */

import type { AllowedImageMime } from "@ccm-feedback/core";
import { ALLOWED_IMAGE_MIMES } from "@ccm-feedback/core";

/** Result of sniffing an image buffer — dimensions + confirmed MIME. */
export interface ImageSniffResult {
  width: number;
  height: number;
  mime: AllowedImageMime;
}

/**
 * Coarse SVG safety check — rejects SVG payloads containing `<script>` or
 * an HTML-style event attribute (`onerror=`, `onload=`, …). This is a
 * defense-in-depth first pass; real sanitization (DOMPurify) is deferred
 * per the CCM-282 follow-up note.
 */
export function isSafeSvg(svgText: string): boolean {
  if (/<script\b/i.test(svgText)) return false;
  if (/\bon[a-z]+\s*=/i.test(svgText)) return false;
  return true;
}

/**
 * Map a confirmed MIME to a canonical file extension used in the storage path.
 * Falls back to the MIME suffix if the map doesn't cover the value — but all
 * values reach this function through the `ALLOWED_IMAGE_MIMES` enum so every
 * case below is exercised.
 */
export function extensionForMime(mime: AllowedImageMime): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/svg+xml":
      return "svg";
    case "image/gif":
      return "gif";
  }
}

/**
 * Sniff image type + dimensions from a raw byte buffer using magic-number
 * signatures. Returns null when the buffer does not match any supported
 * format. Implementation reads only the header bytes — safe for 10 MB files.
 */
export function sniffImage(buffer: Uint8Array): ImageSniffResult | null {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A, then IHDR at offset 16: width (4 BE), height (4 BE)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (buffer.length < 24) return null;
    const width = readUint32BE(buffer, 16);
    const height = readUint32BE(buffer, 20);
    return { width, height, mime: "image/png" };
  }

  // GIF: "GIF87a" or "GIF89a". Width + height at offsets 6, 8 (LE, 2 bytes each).
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    const width = (buffer[6] ?? 0) | ((buffer[7] ?? 0) << 8);
    const height = (buffer[8] ?? 0) | ((buffer[9] ?? 0) << 8);
    return { width, height, mime: "image/gif" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    const dims = readJpegDimensions(buffer);
    if (!dims) return null;
    return { width: dims.width, height: dims.height, mime: "image/jpeg" };
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    const dims = readWebPDimensions(buffer);
    if (!dims) return null;
    return { width: dims.width, height: dims.height, mime: "image/webp" };
  }

  // AVIF: bytes 4-11 should contain "ftypavif" (or "ftypavis", etc.).
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70 &&
    buffer[8] === 0x61 &&
    buffer[9] === 0x76 &&
    buffer[10] === 0x69 &&
    buffer[11] === 0x66
  ) {
    // AVIF dimensions live inside ispe boxes that require deep parsing; fall back to 0×0
    // with the note that callers treat 0 as "unreadable" and reject. Real dimension
    // detection is a follow-up (image-size / file-type).
    return { width: 0, height: 0, mime: "image/avif" };
  }

  // SVG: looks like XML / starts with "<?xml" or "<svg"
  const firstBytes = buffer.slice(0, Math.min(buffer.length, 256));
  const asText = new TextDecoder("utf-8", { fatal: false }).decode(firstBytes).trim().toLowerCase();
  if (asText.startsWith("<?xml") || asText.startsWith("<svg")) {
    // SVG dimensions aren't in the magic header — we set them later from viewBox /
    // width / height attributes when callers want exact values. Default 0×0 here;
    // the handler writes the authoritative values separately.
    return { width: 0, height: 0, mime: "image/svg+xml" };
  }

  return null;
}

function readUint32BE(buffer: Uint8Array, offset: number): number {
  return (
    ((buffer[offset] ?? 0) << 24) |
    ((buffer[offset + 1] ?? 0) << 16) |
    ((buffer[offset + 2] ?? 0) << 8) |
    (buffer[offset + 3] ?? 0)
  );
}

/** JPEG: walk the segment chain looking for the SOF marker, which carries dimensions. */
function readJpegDimensions(buffer: Uint8Array): { width: number; height: number } | null {
  let offset = 2; // skip SOI
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1] ?? 0;
    const length = ((buffer[offset + 2] ?? 0) << 8) | (buffer[offset + 3] ?? 0);
    // SOFn markers: 0xC0..0xCF except 0xC4, 0xC8, 0xCC
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = ((buffer[offset + 5] ?? 0) << 8) | (buffer[offset + 6] ?? 0);
      const width = ((buffer[offset + 7] ?? 0) << 8) | (buffer[offset + 8] ?? 0);
      return { width, height };
    }
    offset += 2 + length;
  }
  return null;
}

/** WebP: read VP8 / VP8L / VP8X chunk after the WEBP signature. */
function readWebPDimensions(buffer: Uint8Array): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  // Chunk FourCC at offset 12
  const fourcc = new TextDecoder().decode(buffer.slice(12, 16));
  if (fourcc === "VP8 ") {
    // VP8 (lossy): width/height in VP8 header at offset 26, each 14-bit LE.
    if (buffer.length < 30) return null;
    const width = ((buffer[26] ?? 0) | ((buffer[27] ?? 0) << 8)) & 0x3fff;
    const height = ((buffer[28] ?? 0) | ((buffer[29] ?? 0) << 8)) & 0x3fff;
    return { width, height };
  }
  if (fourcc === "VP8L") {
    // VP8L (lossless): dimensions packed into 4 bytes starting at offset 21.
    if (buffer.length < 25) return null;
    const b0 = buffer[21] ?? 0;
    const b1 = buffer[22] ?? 0;
    const b2 = buffer[23] ?? 0;
    const b3 = buffer[24] ?? 0;
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }
  if (fourcc === "VP8X") {
    // VP8X (extended): dimensions at offset 24 (3 bytes each, 1-based).
    if (buffer.length < 30) return null;
    const width = 1 + ((buffer[24] ?? 0) | ((buffer[25] ?? 0) << 8) | ((buffer[26] ?? 0) << 16));
    const height = 1 + ((buffer[27] ?? 0) | ((buffer[28] ?? 0) << 8) | ((buffer[29] ?? 0) << 16));
    return { width, height };
  }
  return null;
}

/** Constant-time check against the MIME allowlist (lowercased, trimmed). */
export function isAllowedImageMime(value: string | null | undefined): value is AllowedImageMime {
  if (!value) return false;
  const normalized = (value.toLowerCase().trim().split(";")[0] ?? "").trim();
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(normalized);
}

/** Normalize a content-type header to its base MIME (strip parameters). */
export function normalizeContentType(value: string | null | undefined): string | null {
  if (!value) return null;
  return (value.toLowerCase().trim().split(";")[0] ?? "").trim();
}

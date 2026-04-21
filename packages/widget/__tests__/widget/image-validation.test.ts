// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { validateFileBeforeUpload, validateUrlBeforePaste } from "../../src/image-validation.js";

// Minimal File polyfill covering only `.size` + `.type` (jsdom's constructor suffices).

function makeFile(size: number, type: string, name = "test.jpg"): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

describe("validateFileBeforeUpload", () => {
  it("accepts a 1 MB JPEG", () => {
    expect(validateFileBeforeUpload(makeFile(1024 * 1024, "image/jpeg"))).toBeNull();
  });

  it("rejects an 11 MB file", () => {
    const err = validateFileBeforeUpload(makeFile(11 * 1024 * 1024, "image/jpeg"));
    expect(err?.kind).toBe("size");
  });

  it("rejects a zero-byte file", () => {
    const err = validateFileBeforeUpload(makeFile(0, "image/jpeg"));
    expect(err?.kind).toBe("size");
  });

  it("rejects unsupported MIMEs", () => {
    const err = validateFileBeforeUpload(makeFile(1024, "image/tiff"));
    expect(err?.kind).toBe("mime");
  });

  it("accepts all upload-allowed MIMEs", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]) {
      expect(validateFileBeforeUpload(makeFile(2048, type))).toBeNull();
    }
  });

  it("rejects image/svg+xml on the upload path (CCM-282 P1 — SVG must go through mirror)", () => {
    // Direct-PUT uploads skip the server sanitizer; SVG is routed through the
    // mirror path instead, which runs isSafeSvg() before storage.
    const err = validateFileBeforeUpload(makeFile(2048, "image/svg+xml"));
    expect(err?.kind).toBe("mime");
  });
});

describe("validateUrlBeforePaste", () => {
  it("accepts a valid https URL", () => {
    expect(validateUrlBeforePaste("https://example.com/a.jpg")).toBeNull();
  });

  it("rejects data: URIs", () => {
    expect(validateUrlBeforePaste("data:image/png;base64,AAA")?.kind).toBe("url");
  });

  it("rejects malformed URLs", () => {
    expect(validateUrlBeforePaste("not a url")?.kind).toBe("url");
  });

  it("accepts http://localhost URLs", () => {
    expect(validateUrlBeforePaste("http://localhost:3000/a.jpg")).toBeNull();
  });

  it("rejects plain http:// for non-localhost", () => {
    expect(validateUrlBeforePaste("http://evil.example.com/a.jpg")?.kind).toBe("url");
  });
});

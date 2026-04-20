import { describe, expect, it } from "vitest";
import { canonicalize } from "../src/webhook/canonicalization.js";
import { signWebhook, verifyWebhook } from "../src/webhook/signing.js";

const FIXTURE_SECRET = "s3cret-dontleak";
const FIXTURE_PAYLOAD = { a: 1, b: [1, 2], nested: { z: true, y: 42 } };

describe("signWebhook", () => {
  it("returns both signature headers", () => {
    const result = signWebhook({ payload: FIXTURE_PAYLOAD, secret: FIXTURE_SECRET, timestamp: 1_700_000_000 });
    expect(result.headers["X-CCM-Signature"]).toMatch(/^t=1700000000,v1=[0-9a-f]+$/);
    expect(result.headers["X-CCM-Signature-SHA256"]).toMatch(/^sha256=[0-9a-f]+$/);
  });

  it("uses the canonicalized body (key-sorted) as signed input", () => {
    const a = signWebhook({ payload: { b: 1, a: 2 }, secret: FIXTURE_SECRET, timestamp: 111 });
    const b = signWebhook({ payload: { a: 2, b: 1 }, secret: FIXTURE_SECRET, timestamp: 111 });
    expect(a.body).toBe(b.body);
    expect(a.headers["X-CCM-Signature"]).toBe(b.headers["X-CCM-Signature"]);
  });

  it("produces identical body bytes to standalone canonicalize()", () => {
    const result = signWebhook({ payload: FIXTURE_PAYLOAD, secret: FIXTURE_SECRET, timestamp: 123 });
    expect(result.body).toBe(canonicalize(FIXTURE_PAYLOAD));
  });
});

describe("verifyWebhook — round trips", () => {
  it("verifies a freshly-signed payload", () => {
    const signed = signWebhook({ payload: FIXTURE_PAYLOAD, secret: FIXTURE_SECRET });
    expect(
      verifyWebhook({
        body: signed.body,
        secret: FIXTURE_SECRET,
        header: signed.headers["X-CCM-Signature"],
        nowSeconds: signed.timestamp,
      }),
    ).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const signed = signWebhook({ payload: FIXTURE_PAYLOAD, secret: FIXTURE_SECRET });
    expect(
      verifyWebhook({
        body: signed.body,
        secret: "different-secret",
        header: signed.headers["X-CCM-Signature"],
        nowSeconds: signed.timestamp,
      }),
    ).toBe(false);
  });

  it("rejects a modified body", () => {
    const signed = signWebhook({ payload: FIXTURE_PAYLOAD, secret: FIXTURE_SECRET });
    expect(
      verifyWebhook({
        body: `${signed.body} `,
        secret: FIXTURE_SECRET,
        header: signed.headers["X-CCM-Signature"],
        nowSeconds: signed.timestamp,
      }),
    ).toBe(false);
  });

  it("rejects timestamps outside tolerance", () => {
    const signed = signWebhook({ payload: FIXTURE_PAYLOAD, secret: FIXTURE_SECRET, timestamp: 1000 });
    expect(
      verifyWebhook({
        body: signed.body,
        secret: FIXTURE_SECRET,
        header: signed.headers["X-CCM-Signature"],
        nowSeconds: 1000 + 301,
        toleranceSeconds: 300,
      }),
    ).toBe(false);
  });

  it("accepts timestamps exactly at tolerance", () => {
    const signed = signWebhook({ payload: FIXTURE_PAYLOAD, secret: FIXTURE_SECRET, timestamp: 1000 });
    expect(
      verifyWebhook({
        body: signed.body,
        secret: FIXTURE_SECRET,
        header: signed.headers["X-CCM-Signature"],
        nowSeconds: 1000 + 300,
        toleranceSeconds: 300,
      }),
    ).toBe(true);
  });
});

describe("verifyWebhook — malformed headers", () => {
  const body = canonicalize(FIXTURE_PAYLOAD);
  const common = { body, secret: FIXTURE_SECRET, nowSeconds: 1_700_000_000 };

  it("rejects a header missing t=", () => {
    expect(verifyWebhook({ ...common, header: "v1=abcdef" })).toBe(false);
  });

  it("rejects a header missing v1=", () => {
    expect(verifyWebhook({ ...common, header: "t=1700000000" })).toBe(false);
  });

  it("rejects a header with non-numeric timestamp", () => {
    expect(verifyWebhook({ ...common, header: "t=abc,v1=deadbeef" })).toBe(false);
  });

  it("rejects a header with non-hex v1", () => {
    expect(verifyWebhook({ ...common, header: "t=1700000000,v1=nothex!!" })).toBe(false);
  });

  it("rejects an empty header", () => {
    expect(verifyWebhook({ ...common, header: "" })).toBe(false);
  });
});

describe("secret rotation invalidates prior signatures", () => {
  it("a signature produced with the old secret no longer verifies under the new secret", () => {
    const signed = signWebhook({ payload: FIXTURE_PAYLOAD, secret: "old-secret" });
    expect(
      verifyWebhook({
        body: signed.body,
        secret: "new-secret",
        header: signed.headers["X-CCM-Signature"],
        nowSeconds: signed.timestamp,
      }),
    ).toBe(false);
  });
});

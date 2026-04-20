import { describe, expect, it } from "vitest";
import { generateSecret, hashSecret, verifySecret } from "../src/secret.js";

describe("generateSecret", () => {
  it("returns a URL-safe base64 string", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  it("never returns the same value twice", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).not.toBe(b);
  });
});

describe("hashSecret + verifySecret", () => {
  it("round-trips a plaintext", async () => {
    const plaintext = generateSecret();
    const hash = await hashSecret(plaintext);
    expect(await verifySecret(plaintext, hash)).toBe(true);
  });

  it("rejects wrong plaintext", async () => {
    const hash = await hashSecret("correct");
    expect(await verifySecret("wrong", hash)).toBe(false);
  });

  it("produces different hashes for the same input (random salt)", async () => {
    const h1 = await hashSecret("same");
    const h2 = await hashSecret("same");
    expect(h1).not.toBe(h2);
  });

  it("returns false on malformed hash (too few parts)", async () => {
    expect(await verifySecret("plain", "onlyonepart")).toBe(false);
    expect(await verifySecret("plain", "algo:salt")).toBe(false);
  });

  it("returns false on wrong algorithm prefix", async () => {
    const parts = (await hashSecret("plain")).split(":");
    const rebuilt = `argon2:${parts[1]}:${parts[2]}`;
    expect(await verifySecret("plain", rebuilt)).toBe(false);
  });

  it("includes a scrypt prefix", async () => {
    const hash = await hashSecret("x");
    expect(hash.startsWith("scrypt:")).toBe(true);
  });
});

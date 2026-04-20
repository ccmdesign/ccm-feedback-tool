/**
 * Project webhook secret hashing — zero-dep `node:crypto.scrypt`.
 *
 * Hash format: "scrypt:<saltBase64>:<hashBase64>"
 *
 * Why scrypt and not argon2id: scrypt is built into Node, has no native peer
 * dep, and is sufficient for secrets carrying 256 bits of randomness. If
 * profiling ever shows admin create-project latency is an issue, swap to
 * argon2id in a follow-up ticket — the hash prefix is versioned for that
 * purpose.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (password: string | Buffer, salt: Buffer, keylen: number) => Promise<Buffer>;

const SALT_LEN = 16;
const KEY_LEN = 64;
const ALGO = "scrypt";
/** Generate a plaintext secret (URL-safe, ~43 chars). */
export function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

/** Hash a plaintext secret. Never return plaintext from any store method. */
export async function hashSecret(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = await scrypt(plaintext, salt, KEY_LEN);
  return `${ALGO}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

/** Constant-time verify — returns false on any malformed hash or mismatch. */
export async function verifySecret(plaintext: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const algo = parts[0];
  const saltB64 = parts[1];
  const hashB64 = parts[2];
  if (algo !== ALGO || !saltB64 || !hashB64) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, "base64");
    expected = Buffer.from(hashB64, "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length !== KEY_LEN) return false;
  const actual = await scrypt(plaintext, salt, KEY_LEN);
  if (actual.length !== expected.length) return false;
  try {
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Canonical JSON serialization — key-sorted, no whitespace.
 *
 * Any verifier (JS, Python, Go) must reproduce these exact bytes given the
 * same input. Rules:
 * - Object keys are sorted lexicographically (UTF-16 code units, same as
 *   `Array.prototype.sort` default ordering).
 * - Arrays preserve their source order.
 * - `undefined` values are dropped (same as `JSON.stringify` default).
 * - `Date` is NOT supported; callers must normalize dates to ISO strings.
 *   The builder in `./payload.ts` handles this for the webhook payload shape.
 */

/** A `JSON.stringify` replacer that sorts object keys at every depth. */
function sortedKeysReplacer(_key: string, value: unknown): unknown {
  if (value === null) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = source[k];
  }
  return out;
}

/**
 * Serialize a value to canonical JSON bytes.
 *
 * Deterministic across runtimes: recursively sorts object keys, preserves
 * array order, and drops `undefined` values. No trailing newline; no
 * whitespace.
 */
export function canonicalize(value: unknown): string {
  const result = JSON.stringify(value, sortedKeysReplacer);
  if (typeof result !== "string") {
    throw new Error("[ccm-feedback] canonicalize: value is not JSON-serializable");
  }
  return result;
}

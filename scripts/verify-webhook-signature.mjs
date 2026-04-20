#!/usr/bin/env bun
/**
 * Verify a CCM webhook signature against a payload file.
 *
 * Usage:
 *   bun scripts/verify-webhook-signature.mjs <payload-file-or-->   \
 *                                             <secret>              \
 *                                             --header "t=<ts>,v1=<hex>"
 *
 * `<payload-file>` may be `-` to read the payload from stdin. Exits 0 on a
 * valid signature, 1 otherwise. Prints the first 200 chars of the signed
 * body when verification fails, for visual diff.
 */

import { readFileSync } from "node:fs";
import { canonicalize, verifyWebhook } from "../packages/core/src/index.ts";

function usage() {
  console.error(
    'Usage: bun scripts/verify-webhook-signature.mjs <payload-file-or--> <secret> --header "t=<ts>,v1=<hex>"',
  );
}

const args = process.argv.slice(2);
const payloadArg = args[0];
const secret = args[1];
const headerIdx = args.indexOf("--header");
const header = headerIdx >= 0 ? args[headerIdx + 1] : undefined;

if (!payloadArg || !secret || !header) {
  usage();
  process.exit(1);
}

const raw = payloadArg === "-" ? await new Response(process.stdin).text() : readFileSync(payloadArg, "utf8");

let canonical;
try {
  const parsed = JSON.parse(raw);
  canonical = canonicalize(parsed);
} catch {
  // Assume raw is already canonical JSON (e.g. captured from a webhook log).
  canonical = raw;
}

const ok = verifyWebhook({ body: canonical, secret, header });
if (ok) {
  console.log("[verify-webhook] OK");
  process.exit(0);
}

console.error("[verify-webhook] FAILED");
console.error(`  body (first 200): ${canonical.slice(0, 200)}`);
process.exit(1);

#!/usr/bin/env bun
/**
 * Stub implementation agent — POSTs acknowledged → applied to the callback
 * endpoint. Used in E2E + manual smoke.
 *
 * Usage:
 *   bun scripts/stub-callback-agent.mjs <annotation-id> [--base-url http://localhost:3000]
 */

const args = process.argv.slice(2);
const annotationId = args[0];
const baseUrlIdx = args.indexOf("--base-url");
const baseUrl = baseUrlIdx >= 0 ? args[baseUrlIdx + 1] : "http://localhost:3000";

if (!annotationId) {
  console.error("Usage: bun scripts/stub-callback-agent.mjs <annotation-id> [--base-url <origin>]");
  process.exit(1);
}

async function post(status, result) {
  const res = await fetch(`${baseUrl}/api/v1/annotations/${annotationId}/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      status,
      ...(result ? { result } : {}),
      updated_at: new Date().toISOString(),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[stub-callback] ${status} -> ${res.status}`, body);
    process.exit(1);
  }
  console.log(`[stub-callback] ${status} -> 200`, body);
}

await post("acknowledged");
await new Promise((r) => setTimeout(r, 2000));
await post("applied", {
  pr_url: "https://github.com/ccmdesign/demo/pull/42",
  reasoning: "Applied via stub agent",
});

console.log("[stub-callback] done");

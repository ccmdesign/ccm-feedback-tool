---
priority: p1
status: ready
origin: ce-code-review autofix (CCM-282)
run_id: 20260420-204032-85e065a3
---

# CCM-282 — SSRF: `/api/v1/assets/mirror` lacks a private-network / file:// blocklist

## Severity: P1 (security — server-side request forgery)

## File

- `packages/adapter-prisma/src/asset-mirror-handler.ts` (line 98 — HEAD fetch, line 122 — GET fetch)
- `packages/adapter-prisma/src/validation/asset.ts` (`assetMirrorRequestSchema`)

## Problem

`createAssetMirrorHandler` accepts a caller-supplied `url` and `fetch()`es it
server-side. The only URL validation is `z.string().url().max(2000)` — shape
only. There is no guard against:

- `file://` URIs (local filesystem reads)
- `http://localhost` / `http://127.0.0.1` / `http://[::1]`
- RFC 1918 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- Link-local `169.254.0.0/16` — includes the AWS/GCP/Azure instance-metadata
  service at `169.254.169.254` and IMDSv1 token endpoints
- Carrier-grade NAT `100.64.0.0/10`
- Loopback IPv6 `::1`, `fc00::/7` (unique local), `fe80::/10` (link-local)
- DNS rebinding — a hostname that resolves to a public IP at HEAD time and a
  private IP at GET time

Exploitability on Netlify is reduced (functions run in Netlify's sandbox, not
directly on an EC2 metadata-reachable instance) but not zero:

- Anyone with a valid `projectId` can probe internal network topology by
  sending URLs and observing 4xx / 5xx codes and timing.
- A reviewer who knows a coworker's private Storage endpoint URL can confirm
  whether a specific asset exists by pasting its URL into the mirror endpoint
  and observing success vs. failure.
- File-URI reads (`file:///etc/passwd`, `file:///.env`) — behaviour depends on
  the underlying `fetch` implementation. Node 20+ `fetch` (undici) refuses
  `file:` by default, but enabling `allowFileURLs` or swapping to `node-fetch`
  in a future refactor would regress silently.
- Follow-up `CCM_STORAGE_ORIGIN` CDN deployments may eventually run this
  function in a VPC with private-network reachability — the lack of guard
  rails would then become directly exploitable.

## Evidence

```ts
// packages/adapter-prisma/src/validation/asset.ts
export const assetMirrorRequestSchema = z.object({
  projectId: z.string().min(1).max(200),
  url: z.string().url().max(2000),   // shape only — no host / protocol / IP guard
});

// packages/adapter-prisma/src/asset-mirror-handler.ts  line 98
headResponse = await fetchFn(url, { method: "HEAD", signal: headController.signal });
```

## Why this is P1

- Reaches actual `fetch()` against attacker-controlled URLs with no network
  boundary check. Classic SSRF pattern.
- The plan's Risks table already flags SVG sanitization as a known gap, but
  does NOT mention SSRF — this one slipped.
- Netlify's sandbox blunts the blast radius today; the mitigation is still
  cheap and lives at the right layer (server input validation).

## Recommended fix

Add a pre-fetch `assertSafeMirrorUrl(url)` helper in `asset-mirror.ts` that
the handler calls before HEAD/GET:

1. Parse `new URL(url)` (the Zod `.url()` already guarantees it parses).
2. Reject any `protocol` that isn't `https:` (or allow `http:` only when
   `url.hostname` ends in `.local` / `localhost` AND `NODE_ENV !== "production"`
   for dev convenience — match `validateUrlBeforePaste` in the widget).
3. Reject hostnames that resolve to / literally are:
   - `localhost`, `127.0.0.1`, `::1`
   - any IPv4 in `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `100.64/10`,
     `0.0.0.0/8`, `224.0.0.0/4` (multicast), `240.0.0.0/4` (reserved)
   - any IPv6 in `fc00::/7`, `fe80::/10`
4. For hostnames (not literal IPs), resolve via `dns.promises.lookup` and
   apply the same block — or accept that DNS rebinding is an accepted risk
   and document the mitigation (a separate follow-up can add SSRF-safe DNS
   pinning).
5. Return a structured 400 with `error: "url-not-allowed"` on rejection.

```ts
// Suggested skeleton — place in asset-mirror.ts
export function isPrivateOrUnsafeHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return true;
  // Literal IPv4 checks (regex or `net.isIP`).
  if (/^127\./.test(lower)) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(lower)) return true;
  if (/^0\./.test(lower)) return true;
  if (lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:")) return true;
  return false;
}

export function assertSafeMirrorUrl(raw: string): void {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw Object.assign(new Error("unsupported-protocol"), { status: 400 });
  }
  if (isPrivateOrUnsafeHost(url.hostname)) {
    throw Object.assign(new Error("url-not-allowed"), { status: 400 });
  }
}
```

Follow-up ticket to add DNS pinning once a real SSRF-library dependency is
acceptable (e.g. `ssrf-req-filter`, `ipaddr.js`). Current regex approach is
~90% coverage and fails-closed for exact literals.

## Acceptance

- A new unit test in `asset-mirror.test.ts` asserts rejection for each
  blocked host class (`file://`, `http://127.0.0.1`, `http://10.0.0.1`,
  `http://169.254.169.254`, `http://[::1]`).
- The handler test suite stays green for the existing happy paths.
- The widget `validateUrlBeforePaste` client-side reject mirrors the new
  server reject list (defense in depth).

## Not fixed in autofix because

SSRF mitigation changes server-side behaviour on attacker-shaped inputs.
Needs human sign-off on the exact blocklist (which ranges to allow for dev
vs. prod), DNS-rebinding policy, and whether to ship the regex-based guard
now or wait for the `ipaddr.js` dependency.

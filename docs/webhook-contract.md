# CCM Feedback — webhook contract (v1)

Outbound payload shape, signature algorithm, and callback semantics for
implementation agents consuming reviews from CCM Feedback.

## Outbound payload (`POST` to `project.implementationWebhookUrl`)

Content-Type: `application/json`. Body is key-sorted canonical JSON.

```json
{
  "schema_version": "1",
  "review_id": "batch_abc123",
  "project_id": "proj_xyz",
  "project_name": "demo",
  "submitted_at": "2026-04-20T12:00:00.000Z",
  "reviewer": { "name": "Claudio", "email": "claudio@ccmdesign.ca" },
  "annotations": [
    {
      "id": "ann_1",
      "type": "comment",
      "message": "Increase spacing",
      "url": "https://staging.example.com/home",
      "created_at": "2026-04-20T11:59:00.000Z",
      "anchor": {
        "css_selector": "body > main",
        "xpath": "/html/body/main",
        "text_snippet": "hello",
        "element_tag": "MAIN",
        "element_id": "main",
        "text_prefix": "",
        "text_suffix": "",
        "fingerprint": "1:0:h",
        "neighbor_text": ""
      },
      "rect": { "x_pct": 0.1, "y_pct": 0.2, "w_pct": 0.3, "h_pct": 0.4 },
      "scroll_x": 0,
      "scroll_y": 0,
      "viewport_w": 1920,
      "viewport_h": 1080,
      "device_pixel_ratio": 2
    }
  ]
}
```

## Signature headers

Both headers are sent on every outbound request:

```
X-CCM-Signature: t=<unix-ts>,v1=<hex>
X-CCM-Signature-SHA256: sha256=<hex>
```

- `X-CCM-Signature` — Stripe-style timestamp-prefixed HMAC-SHA256. Signed
  input: `<ts>.<body>`. Mitigates replay via timestamp tolerance
  (default 300 seconds).
- `X-CCM-Signature-SHA256` — body-only HMAC-SHA256 (hex) for legacy-shape
  compatibility with the original spec §6.1. No replay protection on this
  header alone.

## Canonicalization

The signer produces canonical JSON: keys sorted lexicographically at every
depth, arrays preserve order, no whitespace. Verifiers MUST reproduce the
same bytes — writing `JSON.stringify` without a sorted replacer will
produce a different body for identically-shaped objects.

Reference implementation (JavaScript/TypeScript) lives in
`packages/core/src/webhook/canonicalization.ts`.

## Verification snippets

### Node.js

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(body: string, secret: string, header: string): boolean {
  const match = /t=(\d+),v1=([0-9a-f]+)/.exec(header);
  if (!match) return false;
  const [, ts, v1] = match;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
}
```

### Python

```python
import hmac, hashlib, time, re

def verify(body: str, secret: str, header: str) -> bool:
    m = re.match(r"^t=(\d+),v1=([0-9a-f]+)$", header)
    if not m:
        return False
    ts, v1 = m.group(1), m.group(2)
    if abs(time.time() - int(ts)) > 300:
        return False
    expected = hmac.new(secret.encode(), f"{ts}.{body}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)
```

### Go

```go
import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
  "regexp"
  "strconv"
  "time"
)

var headerRe = regexp.MustCompile(`^t=(\d+),v1=([0-9a-f]+)$`)

func verify(body, secret, header string) bool {
  m := headerRe.FindStringSubmatch(header)
  if m == nil { return false }
  ts, _ := strconv.ParseInt(m[1], 10, 64)
  if abs(time.Now().Unix() - ts) > 300 { return false }
  h := hmac.New(sha256.New, []byte(secret))
  h.Write([]byte(m[1] + "." + body))
  expected := hex.EncodeToString(h.Sum(nil))
  return hmac.Equal([]byte(expected), []byte(m[2]))
}
```

## Secret rotation

Rotating a project's secret (admin UI → project → Rotate secret) replaces
the stored hash atomically. Any in-flight dispatch signs with the new
secret as soon as the rotation completes. Old signatures cannot be
verified under the new secret.

## Callback — `POST /api/v1/annotations/:id/status`

```json
{
  "status": "applied",
  "result": {
    "pr_url": "https://github.com/ccmdesign/demo/pull/42",
    "task_url": "https://linear.app/ccm/issue/CCM-999",
    "reasoning": "Applied via auto-merge"
  },
  "updated_at": "2026-04-20T12:05:00.000Z"
}
```

- `status` can be one of `submitted | acknowledged | applied | escalated | rejected`, or any custom string your agent emits.
- `updated_at` must be an ISO-8601 UTC timestamp. Older updates are ignored (idempotent); newer updates overwrite.
- `result` is optional. Any JSON object; the reviewer UI renders `pr_url`, `task_url`, and `reasoning`.
- Auth: anonymous by default. Set `CCM_CALLBACK_BEARER_TOKEN` to require
  `Authorization: Bearer <token>`.

## Retry semantics

- First attempt is synchronous with the `POST /api/v1/reviews` request.
- HTTP response classification:
  - **2xx** → delivered.
  - **4xx** (except `408 Request Timeout` and `429 Too Many Requests`) →
    `failed` immediately. These are permanent client-side errors (bad URL,
    bad signature, schema mismatch, gone) where retrying will not change
    the outcome.
  - **5xx**, `408`, `429`, timeouts, and network errors → `retrying`.
- The scheduled function (`apps/demo/netlify/functions/dispatch-retry.mts`)
  wakes every 5 minutes (UTC), selects retry-eligible batches, and
  re-dispatches.
- Retries stop at 10 attempts or 24h from `submittedAt`, whichever comes first.
- Retries sign the same canonical body bytes (cached on the row) — only
  the timestamp changes.

## Where to start

- Cross-link: `docs/spec.md §6` — original prose contract.
- Tests: `packages/core/__tests__/webhook-signing.test.ts`.
- Verifier: `bun scripts/verify-webhook-signature.mjs <payload.json> <secret> --header "<X-CCM-Signature>"`.

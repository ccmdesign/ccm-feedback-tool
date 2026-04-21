---
priority: p2
status: ready
origin: ce-code-review autofix (CCM-282)
run_id: 20260420-204032-85e065a3
---

# CCM-282 — `resolveCcmStorageOrigin` falls back to localhost when env unset in production

## Severity: P2 (validation bypass in mis-configured production)

## File

- `packages/adapter-prisma/src/validation.ts` (lines 24-35 — `resolveCcmStorageOrigin`)

## Problem

`resolveCcmStorageOrigin()` resolution order:

1. `CCM_STORAGE_ORIGIN` env var (explicit).
2. `NEXT_PUBLIC_SUPABASE_URL + /storage/v1/object/public/assets/`.
3. Hard-coded fallback: `http://localhost:54321/storage/v1/object/public/assets/`.

In production, the third case is reachable if the deployment is misconfigured
(env vars missing). If that happens:

- The `feedbackCreateSchema` `superRefine` check on `proposedAssetUrl` will
  accept only URLs starting with `http://localhost:54321/...`.
- An attacker who knows the fallback can submit an `image_swap` annotation
  with `proposedAssetUrl: "http://localhost:54321/storage/v1/object/public/assets/...evil..."`
  — which passes validation.
- Worse: in that misconfigured state, the mirror/sign-upload endpoints also
  fall back to the same localhost prefix, so the `proposedAssetUrl` returned
  by the server is itself localhost-prefixed. The downstream webhook consumer
  receives localhost URLs that don't resolve from outside the server host.

This is unreachable in a correctly-configured production deployment, but the
fallback is a classic fail-open default. Prefer fail-closed: throw if neither
env var is set AND `NODE_ENV === "production"`.

## Recommended fix

```ts
export function resolveCcmStorageOrigin(): string {
  const explicit = process.env.CCM_STORAGE_ORIGIN;
  if (explicit && explicit.length > 0) {
    return explicit.endsWith("/") ? explicit : `${explicit}/`;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl.length > 0) {
    const trimmed = supabaseUrl.replace(/\/+$/, "");
    return `${trimmed}/storage/v1/object/public/assets/`;
  }
  // Fail-closed in production — misconfiguration must not silently degrade
  // validation to accepting localhost URLs.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CCM_STORAGE_ORIGIN or NEXT_PUBLIC_SUPABASE_URL must be set in production. Refusing to fall back to localhost.",
    );
  }
  return "http://localhost:54321/storage/v1/object/public/assets/";
}
```

Alternative: keep the fallback but prefix the default with a sentinel that
could never match a real reviewer-submitted URL (e.g. `https://unconfigured.invalid/`),
so validation fails-closed even on misconfiguration.

## Acceptance

- Unit test: with `NODE_ENV=production` and no env vars, the function
  throws.
- Existing dev-default test (`DEFAULT_STORAGE_ORIGIN = "http://localhost:54321/..."`)
  continues to pass when `NODE_ENV` is unset or `development`.
- The two handlers that consume this (`asset-mirror-handler.ts`,
  `asset-sign-upload-handler.ts`) already surface 5xx on unexpected
  exceptions, so the throw surfaces as a 500 — better than the silent
  localhost default.

## Not fixed in autofix because

Changes runtime behaviour on misconfigured production deployments. Could
plausibly surprise a production that's silently been running without these
env vars set (unlikely but uncheckable from this PR). Needs a deploy-time
audit to confirm all production envs have the expected values before
flipping to fail-closed.

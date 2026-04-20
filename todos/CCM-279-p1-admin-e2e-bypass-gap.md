---
priority: p1
status: ready
origin: ce-code-review autofix (CCM-279)
run_id: 20260420-150800-d7209778
---

# CCM-279 — admin API E2E bypass check must require the header, not env alone

## Severity: P1 (security defense-in-depth)

## Files

- `apps/demo/src/app/api/v1/admin/projects/route.ts`
- `apps/demo/src/app/api/v1/admin/projects/[id]/route.ts`
- `apps/demo/src/app/api/v1/admin/projects/[id]/rotate-secret/route.ts`

## Problem

The admin API route handlers currently short-circuit auth whenever
`process.env.CCM_E2E_ADMIN_BYPASS === "1"`:

```ts
async function requireAdmin(): Promise<Response | null> {
  if (process.env.CCM_E2E_ADMIN_BYPASS === "1") return null;
  ...
}
```

The middleware (`apps/demo/src/middleware.ts`) is stricter — it requires
both the env var AND an `x-ccm-e2e-bypass: 1` request header:

```ts
if (process.env.CCM_E2E_ADMIN_BYPASS === "1" && request.headers.get("x-ccm-e2e-bypass") === "1") {
  return response;
}
```

If the env var ever ends up set in production (accidental copy from preview,
Netlify context inheritance, leaked `.env`), the admin API becomes fully
open to anyone on the internet. The route handlers advertise themselves as
defense-in-depth ("per-route recheck"), but today they are strictly weaker
than the middleware they back up.

## Fix

Mirror the middleware's two-factor check in the route-level helper:

```ts
async function requireAdmin(request: Request): Promise<Response | null> {
  if (
    process.env.CCM_E2E_ADMIN_BYPASS === "1" &&
    request.headers.get("x-ccm-e2e-bypass") === "1"
  ) {
    return null;
  }
  // ...existing Supabase session + allowlist check
}
```

Update the three route files to pass `request` into `requireAdmin` (or
inline the check, since the helper only runs once per handler). The
`rotate-secret` route uses an inline check with the same gap — fix it too.

## Acceptance

- Setting `CCM_E2E_ADMIN_BYPASS=1` without the header must return 403 from
  GET/POST /api/v1/admin/projects, GET/PATCH/DELETE /api/v1/admin/projects/:id,
  and POST /api/v1/admin/projects/:id/rotate-secret.
- Existing E2E/test code that already sends the header keeps passing.
- Middleware and route-handler bypass conditions must be identical.

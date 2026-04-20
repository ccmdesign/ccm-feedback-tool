# CCM Feedback admin runbook

## First-time login

1. Visit `https://feedback.ccmdesign.ca/admin` (or `http://localhost:3000/admin` in dev).
2. You will be redirected to `/admin/login`.
3. Enter an email on the allowlist (default: `dev@ccmdesign.ca`). Override
   the default with `CCM_ADMIN_ALLOWLIST` (comma-separated env var).
4. Click "Send magic link" and open the email from Supabase Auth.
5. Clicking the link lands you on `/admin/projects` — the project list.

If sign-in fails with "not on the allowlist": check `CCM_ADMIN_ALLOWLIST`
in Netlify env (+ redeploy) or extend the default list in
`apps/demo/src/lib/supabase/allowlist.ts`.

## Create a project

1. `/admin/projects` → "New project".
2. Fill in:
   - **Name** — unique, referenced by the widget via `projectName` for
     backwards compat until projectId becomes the only required id.
   - **Staging URL** — where the client hosts the version being reviewed.
   - **Implementation webhook URL** — where the implementation agent
     listens. Leave blank to defer dispatch.
3. Submit. The response shows the plaintext webhook secret **once**. Copy it
   and paste it into the agent's config — the server only stores a hash.

## Rotate a secret

1. Open the project edit page.
2. Click "Rotate secret". The new plaintext appears in a one-shot modal
   with a Copy button.
3. Update the agent's config immediately. Any in-flight retry batches
   sign with the new secret starting at the next attempt.

## Inspect a stuck dispatch

```sql
-- Failed or retrying batches
SELECT id, "projectId", "dispatchStatus", "dispatchAttempts", "dispatchLastError", "nextAttemptAt"
FROM "ReviewBatch"
WHERE "dispatchStatus" IN ('retrying', 'failed')
ORDER BY "submittedAt" DESC
LIMIT 20;
```

The scheduled function runs every 5 minutes and re-drives `retrying`
rows whose `nextAttemptAt` has elapsed. Check Netlify function logs for
`[dispatch-retry]` entries for a processing summary.

## Local development

```bash
# Start the demo app
bun run dev --filter=@ccm-feedback/demo

# Run the mock webhook locally
# (already wired at /api/mock-webhook/[project] — returns 200 by default,
#  ?fail=1 forces 500 for retry testing).

# Submit a review via fetch to the API for end-to-end testing:
curl -X POST http://localhost:3000/api/v1/reviews \
  -H 'content-type: application/json' \
  -d '{"projectId":"<id>","annotationIds":["<ann-id>"],"reviewer":{"name":"Claudio"}}'
```

## Backfill rollout (after schema migration)

See `docs/migrations/CCM-279-projects-and-annotations.md` for the full
migration runbook.

## Verifying an outbound signature by hand

```bash
bun scripts/verify-webhook-signature.mjs <payload.json> <secret> \
  --header "t=<ts>,v1=<hex>"
```

Exits 0 when the signature is valid.

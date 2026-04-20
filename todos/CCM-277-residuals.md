# CCM-277 baseline — residual follow-ups for Step 4

These items are intentionally deferred from the rebrand PR. The plan called each one out explicitly.

## SECURITY.md contact email

`SECURITY.md` still lists `security@neosianexus.dev` as the vulnerability-report email. The execution prompt for CCM-277 said not to change it in this PR. A follow-up ticket should replace the contact with a CCM-owned address (and probably swap the email channel for the Security Advisory flow if that's preferred).

## release-please component labels

`release-please-config.json` still uses the cosmetic component labels (`core`, `widget`, `adapter-prisma`, `adapter-memory`, `adapter-localstorage`, `cli`). Those are string labels in release PR titles and do not affect npm publishing, so the rename plan explicitly leaves them alone. If cleaner release-PR titles are desired later, rename them in a follow-up.

## Supabase provisioning + first `prisma db push`

- Provision `ccm-feedback-dev` and `ccm-feedback-prod` via the Supabase MCP.
- Provision a storage bucket named `assets` on each.
- Record `DATABASE_URL` + `DIRECT_URL` for each environment.
- Run `bunx prisma db push --schema=prisma/schema.prisma` against each environment after setting the env vars.

All of the above is orchestrator work — the code is ready.

## Netlify site creation + DNS/TLS

- Attach a Netlify site to the repo via the Netlify MCP.
- Set `DATABASE_URL` / `DIRECT_URL` as Netlify env vars for each deploy context.
- Point `feedback.ccmdesign.ca` DNS at Netlify; let Netlify provision TLS.
- Verify the demo loads at the custom domain and that submitting feedback writes to the Supabase `FeedbackItem` table.

## Prisma schema drift guard

The root `prisma/schema.prisma` is hand-written today and mirrors `packages/core/src/schema.ts`. A future follow-up can add `scripts/generate-schema.mjs` that drives the root schema from the TS source via the CLI's `syncPrismaModels`. Tracked in the plan under "Prisma schema drift".

## npm publish of renamed packages

`@ccm-feedback/*` packages have not been published to npm — the rebrand PR is a code-level rename only. A follow-up ticket should publish the first `@ccm-feedback/*` versions once the team is ready.

# ce-code-review residual work — PR #27 (PRO-57 feedback agent loop)

Run: 20260518-102317-85cb4389
Mode: autofix
Plan: docs/plans/2026-05-18-001-feat-feedback-agent-loop-plan.md
Verdict: Ready to merge (no P0/P1/P2 after confidence gate; 0 safe_auto fixes; check + lint green)

No `safe_auto` fixes were applicable — nothing was changed or committed by the review.
All residual items below are advisory/low-severity; none block the merge.

## Residual actionable work (downstream-resolver / human discretion)

### R1 — Migration 0004 hard-codes the constraint name `ccm_widget_annotations_status_check`
- Severity: P2 · autofix_class: manual · owner: human · confidence: 50 · pre_existing: false
- File: supabase/migrations/0004_status_review.sql:18-41
- Issue: 0004 drops/re-adds the status CHECK by the literal name
  `ccm_widget_annotations_status_check`. That is Postgres's auto-generated
  name for 0002's inline `check (...)`, so the canonical 0001→0004 path is
  correct and non-destructive. BUT if a self-hoster's project has the status
  CHECK under a different constraint name (renamed, or created out-of-band),
  `drop constraint if exists` no-ops AND the guarded `add constraint` sees the
  name absent and adds a *second* check while the original narrow constraint
  still exists under its real name — leaving `review` rejected at runtime with
  a confusing CHECK violation.
- Why it's not blocking: the only constraint source in this repo is 0002's
  inline form, which deterministically yields that name. The plan's U1
  explicitly accepts this naming assumption. Pure edge for non-standard
  self-host setups.
- Suggested hardening (optional, do NOT auto-apply — it's a migration/behavior
  change): instead of matching by name, discover the status CHECK by
  introspecting `pg_constraint` for a check on the `status` column of
  `public.ccm_widget_annotations` (`contype='c'` + `pg_get_constraintdef`
  containing `status`), drop whatever name it has, then add the widened one
  under a deterministic name. Keeps idempotency and removes the name coupling.

## Advisory / suppressed by confidence gate or mode-aware demotion (Coverage)

- P3 maintainability — `rowToRecord` is duplicated between
  `netlify/functions/feedback.mts` and `src/cloud-store.ts` (~25-field
  snake_case→camelCase map) with no drift guard. Deliberate + documented in
  the function header and plan U7 ("widget source is browser/IIFE, not cleanly
  importable"). Project has no test suite by design. If a shared module or a
  drift-check is ever wanted, this is the place. Demoted (autofix suppressed).
- P3 maintainability — `bus.on("copyUrl:click", …)` is registered
  unconditionally in `src/index.ts`; inert in localStorage mode because the
  Fab item is disabled there and never emits. Harmless; commented. Suppressed
  (below anchor-75 gate).
- P3 reliability — no explicit `fetch` timeout in
  `netlify/functions/feedback.mts`; relies on the Netlify platform function
  duration cap. Acceptable for a read-only share endpoint. Suppressed.
- P3 correctness — CLI `parseArgs` in `scripts/feedback.ts` misparses a
  `--flag <value>` whose value starts with `--` (treats the flag as `"true"`).
  Mitigated by the supported `--flag=value` form. Suppressed.

## Verified clean (high-risk areas — no findings)

- HARD CAVEAT: every agent-facing surface (skills/apply-ccm-feedback/SKILL.md,
  prompts/apply-feedback.md, prompts/install-widget.md, prompts/README.md,
  README.md, docs/data-model.md, docs/cloud-mode.md, llms.txt) instructs
  `review`-only and explicitly forbids the agent ever writing `done`, with
  rationale. The CLI accepts `done` for human/script use only and its own
  usage text says agents pass `review` only. No P1.
- Secret safety: netlify/functions/feedback.mts reads SUPABASE_URL +
  SUPABASE_ANON_KEY from server-side process.env only; never the service-role
  key; never returns or logs the key or the upstream body (error paths are
  generic and explicitly avoid `res.text()` forwarding). netlify.toml carries
  only env-var *names* in a comment, no secret.
- Migration safety: 0004 is idempotent (guarded drop-if-exists + guarded
  add), non-destructive (CHECK widen only, existing rows satisfy it), default
  stays 'todo', ordered after 0003, registered in apply-migrations.sh.
- CLI injection: list filters via URLSearchParams (value-encoded);
  get/set-status/delete use encodeURIComponent(id); set-status validates
  against the 4-value allowlist before any network call.
- Plan completeness: U1–U11 all present; endpoint payload byte-identical to
  exportAsJson(); src/cloud-store.ts correctly unchanged (U5 "verify, don't
  special-case" satisfied).

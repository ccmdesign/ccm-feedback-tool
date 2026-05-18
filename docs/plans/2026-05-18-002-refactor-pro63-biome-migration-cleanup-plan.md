---
title: "refactor: PRO-63 — prune dead biome overrides + renumber optional 0004 RLS migration"
type: refactor
status: active
created: 2026-05-18
ticket: PRO-63
depth: lightweight
---

# refactor: PRO-63 — prune dead biome overrides + renumber optional 0004 RLS migration

## Summary

Two latent, confirmed-on-`dev` inconsistencies in the `ccm-feedback` widget repo, both low-priority with no behavior bug:

1. **biome.json dead override globs** — three `overrides[].includes` entries point at upstream-SitePing monorepo paths (`packages/`, `apps/`) that do not exist in this single-package fork. Biome matches nothing, so the entries are inert but misleading. Remove them.
2. **`0004` migration ordinal collision** — `supabase/migrations-optional/0004_strict_rls.sql.example` shares the `0004` number with the already-applied `supabase/migrations/0004_status_review.sql` (added by PRO-57). Different dirs, never co-applied, but a self-hoster who runs `migrations/` in order and then applies the strict-RLS example hits an ambiguous duplicate ordinal. Renumber the optional example to `0005` and fix every reference.

This is a tooling/docs cleanup. No source code (`src/`) changes. No applied migration changes.

## Problem Frame

- The repo is a fork of SitePing (a monorepo). `biome.json` retained `overrides` targeting `packages/widget/`, `packages/cli/`, and `apps/demo/` — none of which exist as tracked source here. `bun run lint` already passes; these entries are no-ops that mislead anyone reading the config.
- PRO-57 added `supabase/migrations/0004_status_review.sql` (real, applied). The pre-existing optional RLS-hardening example `supabase/migrations-optional/0004_strict_rls.sql.example` was numbered `0004` before PRO-57 existed. The `prompts/harden-rls.md` flow instructs operators to drop the `.example` suffix and apply `0004_strict_rls.sql` — which now collides with the canonical applied `0004`. Self-hosters get a confusing duplicate ordinal.

## Scope Boundaries

**In scope:**
- Remove 3 dead `overrides` entries from `biome.json` (the `packages/widget/src/events.ts`, `packages/cli/src/generators/prisma.ts`, and `apps/demo/src/app/globals.css` entries).
- Rename `supabase/migrations-optional/0004_strict_rls.sql.example` → `supabase/migrations-optional/0005_strict_rls.sql.example` (preserve git history with `git mv`).
- Update every reference to the old name/number across prompts, docs, and the SQL comment.

**Out of scope / non-goals:**
- Do NOT touch `supabase/migrations/0004_status_review.sql` (applied, correct).
- Do NOT revive `packages/cli/` or any `packages/`/`apps/` tree.
- No changes to `src/`, the widget runtime, or the build.
- The two real `overrides` entries stay: root `files.includes` (not an override; untouched) and the `**/__tests__/**` + `e2e/**` override (real, keep).

### Deferred to Follow-Up Work
- `docs/self-hosting.md:117` uses a generic `0004_*.sql` glob in prose describing a hypothetical *future* community-contributed migration pattern — it is not a reference to the optional strict-RLS example. Left as-is. If a future cleanup wants to bump that prose to `0005_*.sql` for consistency, that is a separate, optional touch-up — flagged here, not done in this PR.

## Reference Site Inventory (verified by grep on the worktree)

The renumber touches exactly these sites. Verified via `grep -rn "0004_strict_rls"` and `grep -rn "migrations-optional/0004"` plus a broad `grep -rn "0004"` on `2026-05-18`:

| # | File | Line | Current text | Action |
|---|------|------|--------------|--------|
| 1 | `supabase/migrations-optional/0004_strict_rls.sql.example` | (file) | — | `git mv` → `0005_strict_rls.sql.example` |
| 2 | `supabase/migrations-optional/0004_strict_rls.sql.example` | 16 | `` `cp 0004_strict_rls.sql.example 0004_strict_rls.sql` `` | → `0005_strict_rls.sql.example` / `0005_strict_rls.sql` (in the renamed file) |
| 3 | `prompts/harden-rls.md` | 44 | `Copy supabase/migrations-optional/0004_strict_rls.sql.example to supabase/migrations-optional/0004_strict_rls.sql` | → `0005_strict_rls.sql.example` / `0005_strict_rls.sql` |
| 4 | `prompts/README.md` | 41 | `see supabase/migrations-optional/0004_strict_rls.sql.example` | → `0005_strict_rls.sql.example` |
| 5 | `docs/self-hosting.md` | 124–125 | `cp supabase/migrations-optional/0004_strict_rls.sql.example \` / `supabase/migrations-optional/0004_strict_rls.sql` | → `0005_strict_rls.sql.example` / `0005_strict_rls.sql` |
| 6 | `supabase/scripts/check-rls.sql` | 97 | `for review-only workflow (e.g. 0004_strict_rls).` | → `(e.g. 0005_strict_rls).` |

**Confirmed non-targets (no edit):**
- `scripts/apply-migrations.sh` — globs `"$MIGRATIONS_DIR"/*.sql` (= `supabase/migrations/` only); never reads `migrations-optional/`. Its header comment (lines 16–23) lists only `migrations/0001–0004` and explicitly says optional migrations are NOT applied by the script. Contains zero `0004_strict_rls` / `migrations-optional` references. The ticket lists it under "update every reference" but the grep proves there is nothing to change here — see Open Questions.
- `docs/cloud-mode.md` — zero `0004` / `strict_rls` / `migrations-optional` matches. The ticket's "if they cite it" is a confirmed no-op.
- `docs/self-hosting.md:69` and `:117` — `0004` there refers to the applied `migrations/0004_status_review` and a generic future-pattern glob respectively; not the optional example.
- `docs/plans/2026-05-18-001-feat-feedback-agent-loop-plan.md`, `todos/ce-code-review-PRO-57-residual.md` — historical artifacts about `migrations/0004_status_review`; out of scope.

## Implementation Units

### U1. Remove dead biome.json override entries

**Goal:** Delete the three `overrides` array entries whose `includes` globs reference non-existent `packages/`/`apps/` paths, leaving only the real entries.

**Requirements:** PRO-63 Item 1.

**Dependencies:** none.

**Files:**
- `biome.json` (modify)

**Approach:**
- Remove the override object at `biome.json` lines 54–62 (`includes: ["packages/widget/src/events.ts"]`).
- Remove the override object at lines 63–70 (`includes: ["packages/cli/src/generators/prisma.ts"]`).
- Remove the override object at lines 80–87 (`includes: ["apps/demo/src/app/globals.css"]`).
- Keep the override object at lines 71–79 (`includes: ["**/__tests__/**", "e2e/**"]`) — this one matches real paths.
- Result: `overrides` becomes a single-element array containing only the `__tests__`/`e2e` override. Ensure the resulting JSON is valid (no trailing comma, biome formatter conventions preserved — 2-space indent, `lineWidth` 120).

**Patterns to follow:** Mirror existing `biome.json` formatting (it is itself biome-formatted; `bun run lint:fix` / biome's own JSON formatting is the source of truth).

**Test scenarios:** `Test expectation: none -- pure config pruning of inert no-op entries; covered by the lint verification below.`

**Verification:**
- `bun run lint` exits green (was green before; must stay green — the removed entries matched no files so behavior is unchanged).
- `biome.json` is still valid JSON and the `overrides` array contains exactly the `__tests__`/`e2e` entry.
- No `packages/` or `apps/` substring remains anywhere in `biome.json`.

---

### U2. Renumber the optional strict-RLS migration example to 0005 and fix all references

**Goal:** Rename `supabase/migrations-optional/0004_strict_rls.sql.example` to `…/0005_strict_rls.sql.example` and update every reference (the file's own copy instruction, both prompts, the self-hosting doc, and the check-rls SQL comment) so self-hosters no longer produce a `0004` that collides with the applied `migrations/0004_status_review.sql`.

**Requirements:** PRO-63 Item 2.

**Dependencies:** none (independent of U1; can land in the same commit or separately).

**Files:**
- `supabase/migrations-optional/0004_strict_rls.sql.example` → `supabase/migrations-optional/0005_strict_rls.sql.example` (rename via `git mv` to preserve history; then edit line 16 inside the renamed file)
- `prompts/harden-rls.md` (modify — line 44)
- `prompts/README.md` (modify — line 41)
- `docs/self-hosting.md` (modify — lines 124–125)
- `supabase/scripts/check-rls.sql` (modify — line 97 comment)

**Approach:**
- Use `git mv` for the rename so the diff reads as a rename, not delete+add.
- In the renamed file, line 16: change `` `cp 0004_strict_rls.sql.example 0004_strict_rls.sql` `` → `` `cp 0005_strict_rls.sql.example 0005_strict_rls.sql` ``. (The derived working file the operator creates becomes `0005_strict_rls.sql`; it stays gitignored only implicitly — note `.gitignore` does NOT list `*_strict_rls.sql`, so the derived file is *not* ignored today and is *not* ignored after either. Out of scope to add an ignore rule; flagged in Open Questions.)
- `prompts/harden-rls.md:44`: update both the source path (`…/0005_strict_rls.sql.example`) and the target path (`…/0005_strict_rls.sql`) and the "drop the `.example` suffix" phrasing stays accurate.
- `prompts/README.md:41`: update the trailing reference to `…/0005_strict_rls.sql.example`.
- `docs/self-hosting.md:124–125`: update the `cp` source (`0005_strict_rls.sql.example`) and destination (`0005_strict_rls.sql`) in the bash block.
- `supabase/scripts/check-rls.sql:97`: update the inline comment `(e.g. 0004_strict_rls)` → `(e.g. 0005_strict_rls)`.
- Do a final repo-wide `grep -rn "0004_strict_rls"` and `grep -rn "migrations-optional/0004"` and confirm only the renamed `0005` references remain (excluding `docs/plans/`, `todos/`, and `.git/` history artifacts which legitimately reference the old applied `0004_status_review`).

**Patterns to follow:** The existing migration-numbering convention (`0001_…`, `0002_…`, …, zero-padded 4 digits, snake_case). The applied series tops out at `0004_status_review`; the optional example becomes the next free ordinal, `0005`.

**Test scenarios:** `Test expectation: none -- file rename + documentation/comment string updates; no runtime, build, or SQL execution path changes. The SQL example is a template (.example) and is never executed by CI or the apply script. Verification is grep + lint + typecheck below.`

**Verification:**
- `supabase/migrations-optional/` contains `0005_strict_rls.sql.example` and no longer contains `0004_strict_rls.sql.example`; `git status` shows it as a rename.
- `grep -rn "0004_strict_rls"` over the repo returns **only** matches in `docs/plans/`, `todos/`, or git history (none in `prompts/`, `docs/self-hosting.md`, `docs/cloud-mode.md`, `supabase/`, `scripts/`).
- `grep -rn "0005_strict_rls"` returns the renamed file plus the 4 updated reference sites (prompts × 2, self-hosting doc, check-rls.sql) and the in-file line-16 self-reference.
- `bun run check` (tsc) green; `bun run lint` (biome) green — neither inspects `.example` or `.sql` content, but run both as the project's standard verification gate.

---

## Verification (whole-plan)

Run from the worktree root and confirm actual output:

- `bun run check` — green (no TS regressions; nothing in `src/` changed, expected trivially green).
- `bun run lint` — green (biome; U1's removed overrides matched nothing so lint behavior is unchanged).
- `grep -rn "0004_strict_rls" .` (excluding `node_modules/`, `.git/`, `dist/`) — returns only the renamed `0005` content plus historical `docs/plans/` & `todos/` artifacts; **no** live `0004_strict_rls` reference in `prompts/`, `docs/self-hosting.md`, `docs/cloud-mode.md`, `supabase/scripts/`, or `scripts/`.
- Manual eyeball of `biome.json`: `overrides` has exactly one entry (`__tests__`/`e2e`), JSON valid.
- Manual eyeball of `git status`: `0004_strict_rls.sql.example` shows as renamed to `0005_strict_rls.sql.example`, not delete+add.

No browser smoke test needed — no widget runtime or DOM behavior is affected.

## Open Questions / Decisions for the Implementer

1. **`scripts/apply-migrations.sh` — ticket says "update", grep says nothing to change.** The ticket lists `scripts/apply-migrations.sh` under "Update every reference," but the script globs `supabase/migrations/*.sql` only and never reads `migrations-optional/`; it contains zero `0004_strict_rls`/`migrations-optional` strings. **Recommended decision:** make no change to `apply-migrations.sh` — there is no stale reference in it. (Its header comment correctly lists `migrations/0001–0004_status_review` and states optional migrations are excluded; that is accurate and unrelated to the renumber.) Implementer should confirm this read and note it in the PR description so the reviewer doesn't expect a diff there.
2. **`docs/cloud-mode.md` — confirmed no-op.** Ticket says "if they cite it"; grep confirms `docs/cloud-mode.md` has zero relevant matches. No change. Recorded here so the implementer doesn't go hunting.
3. **Derived `0005_strict_rls.sql` is not gitignored.** `.gitignore` does not list `*_strict_rls.sql`; today's `0004_strict_rls.sql` (the operator-created, suffix-dropped file) is equally un-ignored. The renumber does not change this and adding an ignore rule is out of scope for PRO-63. Flagged only so the implementer does not "improve" it unprompted (scope discipline).
4. **`docs/self-hosting.md:117` generic `0004_*.sql` prose.** Refers to a hypothetical future community migration, not the optional example. Left unchanged per Scope Boundaries → Deferred. Implementer should not bump it as part of this PR.

# PRO-67 — source spec `docs/pin-relocate-and-popover-tweaks.md` not in repo

**Severity:** P3
**File:** referenced from `docs/plans/2026-05-21-001-feat-pro67-relocate-popover-tweaks-plan.md` (`origin:` frontmatter) and §References
**Discovered by:** ce-code-review autofix (PRO-67, PR #32)
**Status:** resolved (Option 1) — the spec lived as an untracked file in the main worktree on `dev` (untracked since before this branch existed). Copied into the PRO-67 worktree and added to the branch so the PR is self-contained and the plan's `origin:` / §References pointers resolve.

## Problem

The plan's frontmatter (`origin: docs/pin-relocate-and-popover-tweaks.md`) and the §References section both point to `docs/pin-relocate-and-popover-tweaks.md` as "the source of truth". The plan asks U8 to "append a 'Decisions log' subsection at the bottom recording the three invocation-time overrides" to that spec.

The file is not present in the worktree, not in `dev`, and `git log --all -- docs/pin-relocate-and-popover-tweaks.md` returns no history. The PR therefore cannot fulfil the U8 sub-task that updates the spec file.

## Impact

Light. The decisions log lives elsewhere now: the "Key technical decisions" section of the plan itself (lines 44–51) captures all three overrides (mouse-only v1, drop-on-same-element no-op, area translate-intact) and `docs/data-model.md` documents the kind-transition table + area-translate rule.

## Suggested fix

Either:
1. Commit the source spec under `docs/pin-relocate-and-popover-tweaks.md` so future readers can trace plan ↔ spec, or
2. Update the plan's `origin:` and §References to point at the canonical home of the spec (Plane ticket body, or wherever it actually lives).

Either resolution closes the dangling reference.

## Autofix classification

`manual` — owner `human`. Doc-only; needs the maintainer to decide where the spec should live.

# PRO-67 — French i18n strings for relocate + status dropdown not added

**Severity:** P3
**File:** `src/i18n.ts`
**Lines:** 22–23, 42–43 (new keys)
**Discovered by:** ce-code-review autofix (PRO-67, PR #32)

## Problem

The plan (U4 / U7) calls for the four new strings to be added in **English + French**:

- `relocate.instruction` ("Drop on a new target. ESC to cancel.")
- `relocate.cancel` ("Cancel relocate")
- `marker.popover.statusAria` ("Change status" / "Changer le statut")
- `marker.popover.statusMenuAria` ("Statuses" / "Statuts")

The current implementation only adds English strings. The existing `STRINGS` object in `src/i18n.ts` is English-only (with FR comments on some keys as documentation/aspiration), so this is consistent with the rest of the file — but the plan + spec explicitly call for FR additions.

## Impact

Pre-existing convention drift; the file is documented as supporting EN + FR (see `CLAUDE.md`'s "i18n: English (default) + French"), but the runtime `STRINGS` map has been English-only since at least PRO-65. French entries on existing keys are documented as comments only. **The PRO-67 additions perpetuate the same pattern.**

This finding is **advisory** — the plan didn't introduce the drift, and the file's current shape is genuinely English-only. Calling it out so a future i18n cleanup ticket can include these four keys alongside the rest.

## Suggested fix

When the broader EN→FR migration happens (separate ticket), include these four keys with the FR strings already noted in the plan and as inline comments above.

## Autofix classification

`advisory` — owner `human`. No code change needed in this PR.

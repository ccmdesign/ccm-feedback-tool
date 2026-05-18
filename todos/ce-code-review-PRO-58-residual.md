# ce-code-review residual — PRO-58 (comment navigator drawer)

Run: `20260518-115036-e3d7600c`
PR: https://github.com/ccmdesign/ccm-feedback-tool/pull/29
Branch: `feature/PRO-58-comment-navigator-drawer`
Mode: autofix (no user interaction; safe_auto applied + committed; this file is the downstream-resolver handoff)

Artifact: `/tmp/compound-engineering/ce-code-review/20260518-115036-e3d7600c/`

---

## Applied in this run (safe_auto, committed)

- **#2 [P2][safe_auto] julik-frontend-races — drawer.ts** Closed drawer kept its
  controls in the page tab order (panel hidden via CSS transform, not
  display:none; `aria-hidden` alone does not remove focusability, and
  aria-hidden wrapping focusable descendants is an ARIA violation).
  Fixed by toggling `HTMLElement.inert` alongside the existing aria-hidden /
  class swap. Commit `37fd5cf`. `bun run check` + `bun run lint` green.

## Residual actionable work (NOT auto-applied — gated_auto, owner: downstream-resolver)

### #1 [P2][gated_auto] Toggling comments off makes every target row "can't locate"

- **File:** `src/markers.ts:186` (`isEntryLocatable`)
- **Confidence:** 75 (correctness reviewer)
- **requires_verification:** true

**Problem (observable):** When a reviewer hides comments via the FAB eye
toggle and then opens the navigator drawer, every *target*-anchored comment on
the current page is rendered as the passive, disabled "can't locate on this
page" row and cannot be jumped to — even though its anchor resolves fine.
Pin/area rows are unaffected (they short-circuit `true` on their coordinates
before the display check). The drawer is a navigation aid; the common
"hide markers → browse the list → jump to one" flow is broken while markers
are hidden.

**Root cause:** `MarkerManager.reposition()` sets
`entry.anchorEl = resolved.element` (markers.ts:406) regardless of
`this.visible`, but then forces `entry.node.style.display = "none"`
(markers.ts:410) when markers are toggled off. `isEntryLocatable`'s target
branch gates on `entry.anchorEl != null && entry.node.style.display !== "none"`
(markers.ts:186), so the display side of that `&&` makes a resolvable target
read as unlocatable purely because of the global visibility toggle.

**Suggested fix (gated — changes the read-only locatability contract; verify):**
In `isEntryLocatable`, judge a target marker locatable on `entry.anchorEl != null`
alone (anchor resolution is what `reposition()` already records independent of
`this.visible`); do not also require `entry.node.style.display !== "none"`.
`scrollToAndFlash` already guards the flash with `if (this.visible)`, so a
hidden-but-locatable jump still scrolls into view without flashing — no extra
change needed there. Why gated, not safe_auto: it alters what the
drawer-facing `canLocate`/`isEntryLocatable` predicate means (decoupling it
from the visibility toggle), a small behavior-contract change that should be
confirmed by a maintainer + a manual smoke (test scenario 8 below) rather than
auto-applied.

**Verification after fix:**
- `bun run check` + `bun run lint` green.
- Manual smoke: toggle markers OFF via the FAB eye, open the drawer, confirm
  current-page *target* comments are still clickable and jump (scroll without
  flash is acceptable while hidden); confirm genuinely-unresolved anchors and
  other-page comments still show the passive "can't locate" state.

## Suppressed (advisory, anchor 50 — recorded for completeness, no action required)

- **kieran-typescript P3 — drawer.ts:276** Inline `cssText` strings duplicated
  across `buildCard` / `buildSectionLabel` / Other-pages toggle; project keeps
  presentation in the `.sp-*` stylesheet. Advisory only — promote the repeated
  blocks to `src/styles/base.ts` if/when the drawer is themed further.
- **adversarial P3 — drawer.ts:110** `onDocumentClick` correctness relies on an
  undocumented timing assumption (listener attached mid-dispatch +
  `composedPath()` excluding the widget host). Behavior is correct today;
  advisory only — add a clarifying comment or defer the listener attach to a
  microtask if the open path is ever made async.

## Notes

- Requirements completeness (plan_source: explicit): all 5 implementation
  units U1–U5 are met in the diff. No requirements gap.
- DOM XSS surface: CLEAN. Every record-derived string goes through
  `setText()` (textContent). No innerHTML with record data anywhere.
- FAB regression: CLEAN. Double-click → `openAll()` unchanged; single-click
  `e.detail >= 2` guard intact; new radial item is purely additive.
- Scope: CLEAN. `cloud-store.ts`, `popup.ts`, `supabase/migrations/*`
  untouched; drawer is view+navigate only (no edit/status mutation).
- Listener/destroy lifecycle: CLEAN. open/close add/remove with matching
  bound refs + capture flag; `drawer.destroy()` called from index.ts
  teardown; `refreshIfOpen` subscriptions torn down by `bus.removeAll()`.

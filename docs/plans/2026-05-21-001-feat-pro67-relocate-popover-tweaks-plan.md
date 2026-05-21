---
id: 2026-05-21-001
ticket: PRO-67
type: feat
status: active
created: 2026-05-21
origin: docs/pin-relocate-and-popover-tweaks.md
branch: feature/PRO-67-relocate-popover-tweaks
target_branch: dev
---

# feat: PRO-67 — Relocate pins via drag-drop + popover tweaks

## Summary

Three coupled changes against `src/markers.ts` plus a small store-contract extension:

1. **Relocate**: click-and-hold a marker to enter drag mode; drop to re-anchor (target / pin / area, with area preserving its rectangle).
2. **Scrollable popover** — finish the work PRO-66 partially shipped: drop the legacy `POPOVER_NOMINAL_HEIGHT`, swap the fixed `480px` cap for `min(70vh, NOMINAL*3)`, add a `ccm-popover` class + scoped scrollbar styling.
3. **Status dropdown** — replace the cycle-on-click pill with a proper `role="combobox"` dropdown; delete `cycleStatus`; introduce `repositionAndRecolor(id)` to avoid the close/reopen popover round-trip.

Spec at `docs/pin-relocate-and-popover-tweaks.md` is the source of truth. This plan only sequences and scopes the work; it does not redesign it.

## Requirements traceability

Origin spec sections map to implementation units as follows:

| Spec section | Plan unit |
|---|---|
| §1 Relocate · trigger watcher | U2 |
| §1 Relocate · drag-mode overlay/ghost/hover-outline | U2, U3 (helper extract first) |
| §1 Relocate · drop algorithm (target / pin / area-translate) | U4 |
| §1 Relocate · store contract (`updateAnchor`) | U4 (store), U5 (cloud) |
| §1 Relocate · realtime broadening | U5 |
| §1 Relocate · edge cases (drop-same-element, drag-scroll, SPA nav, ESC) | U2, U4 |
| §2 Scrollable popover · `ccm-popover` class + scrollbar + 70vh cap | U6 |
| §2 Scrollable popover · drop `POPOVER_NOMINAL_HEIGHT` constant | U6 |
| §3 Status dropdown · markup + listbox a11y | U7 |
| §3 Status dropdown · `repositionAndRecolor`, delete `cycleStatus` | U7 |
| §3 Status dropdown · i18n strings | U7 |
| Docs (data-model area-transition, architecture hover-outline note) | U8 |
| Verification checklist | U9 |

## Key technical decisions

These were resolved before planning (per the invocation brief) — recorded here so reviewers and the implementer don't re-litigate:

- **Mouse-only for v1.** Use `mousedown` / `mousemove` / `mouseup`. Touch falls through to the existing click-to-open behavior (no drag on touch). A `pointerdown`/`pointermove` retrofit is a follow-up, not in scope.
- **Drop-on-same-element = no-op.** Compare the resolved element identity against `entry.anchorEl`. Skip the `updateAnchor` call and skip the `feedback:updated` emit. (Saves a realtime round-trip on accidental short drags.)
- **Area marker drag translates the rect intact** — overrides the spec's "area becomes target/pin (lossy)" line. Drag-delta is computed in document-space; `areaX/areaY` shift by the delta, `areaW/areaH` unchanged, `kind` stays `"area"`. Clamp the post-drop position so the rectangle stays at least partly in-viewport (the marker anchor is at the rect's right edge — that anchor stays inside `[8, viewportRight - 8]`).
- **PRO-66 overlap status.** PRO-66 has merged and PARTIALLY shipped the popover-scroll fix: `pop.style.maxHeight = ${POPOVER_MAX_HEIGHT_PX}px` (480) + `overflowY = "auto"` are in place, and a measured re-placement pass already reads `pop.offsetHeight`. **What remains:** the legacy `POPOVER_NOMINAL_HEIGHT = 180` constant is still used for first-paint flip estimate, no `ccm-popover` class exists, and there are no scoped scrollbar styles. U6 handles only that residue.

## Output structure

No new directory hierarchy. One new helper file (`src/dom/hover-outline.ts`); everything else is modifications.

## Implementation units

### U1. Verify PRO-66 popover-scroll residue

**Goal.** Confirm in code (single pass) what the invocation brief asserts: the `maxHeight` + `overflowY` lines are present, the legacy `POPOVER_NOMINAL_HEIGHT` constant is still used for first-paint flip estimate, no `ccm-popover` class exists, and no scoped scrollbar styles exist.

**Dependencies.** None.

**Files (read-only).**
- `src/markers.ts` — lines around the `POPOVER_NOMINAL_HEIGHT` constant (~18) and `openPopover` (~317).

**Approach.** Five-minute confirmation pass before touching code, so U6 knows whether it's writing the full popover-scroll change or just trimming residue. The plan author already confirmed residue-only; this unit is the implementer's safety check after rebase / late merges.

**Test expectation:** none — pure verification step, no behavioral change.

**Verification.** Implementer reports back: "residue confirmed, U6 stays scoped to the listed deltas" OR "PRO-66 fully shipped — U6 collapses to a no-op" OR "PRO-66 fully reverted — U6 expands to spec §2 in full".

### U2. Extract shared hover-outline helper

**Goal.** Lift `applyHoverOutline` + `clearHoverOutline` + the tag-name badge logic out of `PinMode` into a reusable helper so the upcoming drag-mode (U3) shares one implementation. Pure refactor; no behavior change.

**Requirements.** Spec checklist item 1; spec §1 Drag-mode step 2 ("extract into `src/dom/hover-outline.ts`").

**Dependencies.** U1.

**Files.**
- Create `src/dom/hover-outline.ts` (~80 LOC: state class or factory exposing `apply(target)` / `clear()` / `destroy()`, plus the snapshot fields for `previousOutline`, `previousOutlineOffset`, both priorities, and the `badge` element).
- Modify `src/pin-mode.ts` — replace the two private methods with calls into the new helper; drop the snapshot fields now owned by the helper. (~30 LOC removed, ~5 LOC delegation added.)

**Approach.** The helper owns the snapshot-and-restore state for one outlined element at a time. `apply(target, colors)` snapshots existing inline outline + applies the 2px solid outline + creates the badge. `clear()` restores or removes per the snapshot (preserves CCM-291 P2 inline-outline behavior). `destroy()` just calls `clear()` for symmetry. Accept `colors: ThemeColors` and `Z_INDEX_MAX` (or `accent` + the z-index) as constructor / factory args so both callers pass their context. Keep the `BADGE_INSET` constant inside the helper.

**Patterns to follow.** Class-with-private-state matches `PinMode` and `MarkerManager` style. Alternative: closure-returning-object — pick whichever reads cleanest, but match existing file conventions.

**Test scenarios.**
- Covers spec §1 hover-outline carry-over: PinMode behavior on hover (outline appears, tag badge appears at `bottom-right - 4px`) and unhover (snapshot restored) is byte-identical to today. Manual: enter pin mode, hover a few elements with and without pre-existing inline outline, confirm outline behavior unchanged.
- Helper handles partial-off-screen target (badge clamps to viewport — preserves CCM-291 P3 `BADGE_INSET` clamp).
- `destroy()` removes the badge if one is mounted.

**Verification.**
- `bun run check` clean.
- `bun run lint` clean.
- Manual: pin-mode hover behavior visually identical to pre-refactor.

### U3. Wire the drag-or-click watcher on each marker

**Goal.** Replace the marker's single `click` listener with a `mousedown` / `mousemove` / `mouseup` watcher that distinguishes click (≤ 250 ms, < 6 px) from drag (≥ 6 px movement OR > 250 ms hold). On click → existing `openPopover` path. On drag → fire a new `enterDragMode(entry, startEvent)` (stubbed in this unit; implemented in U4).

**Requirements.** Spec §1 Trigger + the "Touch / pointer events" edge case.

**Dependencies.** U2.

**Files.**
- Modify `src/markers.ts` — replace the `click` handler block at line ~302–305 with the new watcher; add `DRAG_LONGPRESS_MS = 250` and `DRAG_MOVE_THRESHOLD_PX = 6` constants next to `MARKER_SIZE` (~12); add cursor styling (`cursor: grab` on idle, `grabbing` on drag) — set inline on the marker root style and toggle via `dataset.dragging`. (~50 LOC delta.)
- Stub a private `enterDragMode(entry: MarkerEntry, startEvent: MouseEvent): void { /* U4 */ }` so this unit compiles standalone.

**Approach.** Watcher state lives in a small per-marker closure: `startX`, `startY`, `startTime`, `longPressTimer`. On `mousedown`, capture start coords and time, set a `setTimeout(longPress, DRAG_LONGPRESS_MS)` that promotes to drag if no `mouseup` has fired. On `mousemove`, if movement crosses the 6-px threshold, clear the timer and promote to drag. On `mouseup`, if neither promotion fired, treat as click → openPopover. In drag mode, the pending click is suppressed (track a `dragSuppressed` boolean, swallow the next `click` event via a one-shot listener with `capture: true`). Touch falls through because we never bind touch events — touch's synthesized `click` reaches the `click` listener… **important:** the current code uses `click`, not `mouseup`. We need to keep a `click` listener as the fallback for touch but guard it with the suppression boolean so mouse-driven clicks don't double-fire. Cleanest path: keep a `click` listener that no-ops when the watcher already opened the popover via the `mouseup` path. (Simpler still: on mouse paths, the `mouseup`-promoted click runs `openPopover` and the subsequent synthesized `click` is swallowed; on touch, there's no `mousedown`, so the watcher never engages and the synthesized `click` opens the popover.)

**Patterns to follow.** Watcher style mirrors `PinMode.activate()` event wiring (overlay click → callback). Use `window.addEventListener("mousemove" / "mouseup")` while the gesture is in flight, removed in cleanup. Stop propagation on `mousedown` so document outside-click doesn't close the popover before the gesture decides.

**Test scenarios.**
- Click without movement (< 6 px) → popover opens; the drag stub is NOT called. (Spec §1 Trigger table row 1.)
- Mouse moves ≥ 6 px before `mouseup` → drag stub IS called; the pending click is suppressed (popover does not open). (Row 2.)
- Mouse held > 250 ms without movement → drag stub IS called (long-press path). (Row 3.)
- ESC during drag stub → marker returns to original position. (Implemented in U4 — assert here only that ESC is reachable via the watcher's overlay path.)
- Touch tap → existing `click` path runs (popover opens, no drag mode).
- Right-click on a marker does NOT engage drag (filter on `event.button !== 0` in the `mousedown` handler).
- Tearing down the watcher (marker unmount mid-gesture) does not leak the long-press timer or the global `mousemove`/`mouseup` listeners.

**Verification.**
- `bun run check` clean (TypeScript still happy with the stubbed `enterDragMode`).
- `bun run lint` clean.
- Manual: click a marker → popover opens; hold > 250 ms → cursor flips to `grabbing` (the stub can `console.log("drag start")` for this verification step; remove in U4); drag a few px → same.

### U4. Drag-mode overlay + drop algorithm

**Goal.** Implement `enterDragMode(entry, startEvent)` — the full overlay/toolbar/ghost/hover-outline ceremony from spec §1 Drag-mode — and the drop algorithm: target re-anchor (case A), coord-only pin (case B), area translate-intact (override per invocation brief), plus drop-on-same-element no-op.

**Requirements.** Spec §1 Drag-mode + What-changes-on-drop + Edge-cases (drop-same-element, widget-host drop, drag-scroll, SPA nav cancel).

**Dependencies.** U2 (hover-outline helper), U3 (watcher promotes here).

**Files.**
- Modify `src/markers.ts`:
  - Implement `enterDragMode(entry, startEvent)` — appends a fixed full-viewport overlay (`z-index: Z_INDEX_MAX - 1`, transparent), uses the U2 hover-outline helper, ghosts the marker (`opacity: 0.75`, follow-cursor `top`/`left` without `clampX`).
  - Track `dragStartDocX`, `dragStartDocY` for area-translate delta math.
  - Toolbar visual: reuse `PinMode`'s toolbar pattern (small instruction strip — exact reuse via shared helper is out of scope; an inline minimal version is fine since the styling lives in one place anyway). String: `t("relocate.instruction")` ("Drop on a new target. ESC to cancel.").
  - `mousemove` handler on the overlay: zero `pointer-events`, `elementFromPoint`, restore `pointer-events`; if the resolved element changed since last sample, call `hoverOutline.clear()` then `hoverOutline.apply(target)`. Update the ghost marker position. Reposition the outline on `scroll` (reuse the existing `scheduleReposition` debounce or its pattern — DO NOT call `reposition()` on every scroll tick, that thrashes).
  - `mouseup` handler: resolve the drop target, then branch:
    - **Drop on same element** (compare resolved DOM node identity to `entry.anchorEl`): cleanup overlay; reset the marker via `this.reposition()` for the one entry. Do NOT call `store.updateAnchor`. Do NOT emit `feedback:updated`.
    - **Drop on widget host / `<html>` / `<body>` / `shouldIgnoreElement(target)` → Case B coord pin** (unless `entry.record.kind === "area"` — then go to Case C). Build `UpdateAnchorInput` with `kind: "pin"`, empty anchor strings, `rect: { xPct: 0, yPct: 0, wPct: 0, hPct: 0 }`, `pin: { x: clientX + scrollX, y: clientY + scrollY }`, `area: null`. Call `store.updateAnchor?(record.id, input)`. Emit `feedback:updated`. Then `markers.refresh()` (or finer-grained `reposition` for the one entry).
    - **Drop on real element → Case A target re-anchor** (unless `entry.record.kind === "area"` — then go to Case C). Call `generateAnchor(target)`; compute `xPct = (clientX - rect.left) / rect.width`, `yPct = (clientY - rect.top) / rect.height`; build `UpdateAnchorInput` with `kind: "target"`, the fresh anchor, `rect: { xPct, yPct, wPct: 0, hPct: 0 }`, `pin: null`, `area: null`. Call `store.updateAnchor?`. Emit `feedback:updated`. Reposition.
    - **Case C — area translate-intact (when `entry.record.kind === "area"`).** Compute drag delta in document space: `dx = (clientX + scrollX) - dragStartDocX`, `dy = (clientY + scrollY) - dragStartDocY`. New `areaX = entry.record.areaX + dx`, new `areaY = entry.record.areaY + dy`. Clamp so the marker anchor — which renders at `areaX + areaW` (see `reposition()` line ~719) — stays within `[8, window.innerWidth + scrollX - 8]` and `areaY` within `[scrollY + 8, scrollY + window.innerHeight + scrollY - 8 - areaH]` (give or take — the goal is "at least partly visible / anchor inside viewport"). `areaW` / `areaH` unchanged. `kind` stays `"area"`. Build `UpdateAnchorInput` with `kind: "area"`, anchor unchanged (carry the entry's existing anchor fields), `rect` unchanged, `pin: null`, `area: { x, y, w, h }`. Call `store.updateAnchor?`. Emit `feedback:updated`. Reposition.
  - ESC and right-click cancel: cleanup overlay, no store write, no event. (Bind once on overlay `keydown` / `contextmenu`.)
  - SPA nav cancel: extend the existing `onPopState` / `pushState`-patched handler to also cancel any in-flight drag — call the same cleanup as ESC.
  - Cleanup function: remove overlay, restore marker opacity, clear hover-outline helper, remove `mousemove`/`mouseup`/`keydown`/`contextmenu` listeners.

**Approach — drop-on-same-element identity test.** Compare via `target === entry.anchorEl` (object identity). The `anchorEl` is only populated for `kind === "target"` records; for `pin`/`area` records, treat "same element" as "Case A re-anchor onto whatever element happened to be under the original ghost" — i.e. don't short-circuit; let the drop write fire. The "same element" optimization is only meaningful for target markers; the spec's intent is "the reviewer accidentally dragged and dropped a target onto its own anchor".

**Approach — Case B widget-host bounds check.** Per spec edge case "Drop on an element inside the widget's own shadow host". `shouldIgnoreElement` already rejects widget-host descendants. Defensive: if `target === document.body` OR `target === document.documentElement` AND the drop point falls inside the widget host's `getBoundingClientRect()`, cancel instead of writing a coord pin. (Avoids ugly UX of dropping a pin behind the FAB.)

**Files (referenced, not modified here).**
- `src/dom/anchor.ts` — `generateAnchor(element)` (already exists).
- `src/dom/resolver.ts` — `shouldIgnoreElement` (already exists; lift from there or duplicate the predicate inline if not currently exported — verify at implementation time).
- `src/store.ts` — `updateAnchor?` method added in this same unit (see below).

**Files (modified for store contract).**
- Modify `src/store.ts` — add `UpdateAnchorInput` interface (per spec block at line ~141), add `updateAnchor?(id, input): boolean` to `AnnotationStore`, implement on `Store` class (`Store.updateAnchor`). Implementation: load records, find by id, overwrite anchor + rect fields verbatim, set `kind`, null out `pin*` if `input.pin == null` else set, null out `area*` if `input.area == null` else set. Persist. Return true/false. (~40 LOC.)
- Modify `src/i18n.ts` — add `relocate.instruction` ("Drop on a new target. ESC to cancel.") and `relocate.cancel` (used by the cancel toast / aria-label; English + French). (~6 LOC.)

**Patterns to follow.**
- `PinMode.onOverlayMouseMove` for the elementFromPoint + pointer-events-zero dance.
- `MarkerManager.cycleStatus` for the "mutate record, emit event, persist" sequence — but skip its `closePopover() + refresh()` round-trip; reposition the one entry instead.
- `Store.updateStatus` for the localStorage write pattern.

**Technical design — drop decision tree.** Directional guidance, not implementation specification:

```
mouseup → resolveDropTarget(clientX, clientY)
  ├─ target === entry.anchorEl AND entry.record.kind === "target"
  │     → no-op cleanup, no write, no event
  ├─ entry.record.kind === "area"
  │     → Case C: translate areaX/areaY by drag delta, kind stays "area"
  ├─ shouldIgnoreElement(target) || target inside widget host bounds
  │     → Case B: coord pin in document space (clientX+scrollX, clientY+scrollY)
  └─ else
        → Case A: generateAnchor(target), kind = "target", xPct/yPct = drop fraction
```

**Test scenarios.**
- Covers verification §"Manual relocate" rows 1–6:
  - Drag a `target` marker, drop on a different element → record's anchor fields update, `kind` stays `"target"`, `xPct/yPct` match the drop fraction within the new element, page reload preserves new position.
  - Drag a `target` marker, drop on `<body>` background → `kind` flips to `"pin"`, `pinX/pinY` set to document-space coords, anchor fields cleared.
  - Drag a `pin` marker, drop on an element → `kind` flips to `"target"`, anchor populated, `pinX/pinY` cleared.
  - Drag a `pin` marker, drop in empty space → `kind` stays `"pin"`, new `pinX/pinY`.
  - Drag an `area` marker → `kind` stays `"area"`, `areaX/areaY` shifted by drag delta, `areaW/areaH` unchanged, marker anchor stays within `[8, viewportRight - 8]`.
  - ESC mid-drag → marker returns to original position via `reposition()`, no store write, no `feedback:updated`.
- Drop-on-same-element no-op:
  - Drag a `target` marker a few px and release on the original anchor element → `store.updateAnchor` is NOT called, `feedback:updated` is NOT emitted. (Verifiable by attaching a bus listener during manual test.)
- Drop on widget host:
  - Drag a marker over the FAB → drop is canceled (no store write, marker returns to original position).
- Drag during scroll:
  - Start drag, scroll the page with the wheel, drop on a now-visible element → hover-outline tracked the correct element under the cursor across the scroll, drop targets the right element.
- SPA navigation cancel:
  - Start drag, trigger `history.pushState({}, "", "/other")` mid-drag → drag cleans up like ESC; record unchanged.
- Right-click during drag:
  - Drag in progress, right-click anywhere → cancel (overlay disappears, no write).
- Cloud mode round-trip:
  - With `data-supabase-*` configured against the demo project: drop produces a PATCH; PATCH no-op rows surface via the existing PRO-65 `console.error` (verify in devtools — no new error handling required here).

**Verification.**
- `bun run check` clean.
- `bun run lint` clean.
- Run through every "Manual relocate" bullet in spec §Verification by hand on the demo page (`bun run serve`).
- localStorage record reload: open devtools, dump `localStorage["ccm-feedback:<projectName>"]`, drag-relocate, reload, confirm the record's anchor / kind / pin / area fields match the new position.

### U5. CloudStore `updateAnchor` + verify realtime onUpdate fans out correctly

**Goal.** Implement `CloudStore.updateAnchor` mirroring `updateStatus`'s optimistic-cache + PATCH pattern. Confirm (and minimally adjust if needed) that the existing realtime `onUpdate` handler fans out remote anchor/kind/pin/area changes to the marker layer.

**Requirements.** Spec §1 Store contract → CloudStore + Realtime subsections.

**Dependencies.** U4 (the store interface gains `updateAnchor`).

**Files.**
- Modify `src/cloud-store.ts`:
  - Implement `updateAnchor(id, input): boolean` (~50 LOC). Optimistic cache mutation: find by id, overwrite `cssSelector / xpath / textSnippet / elementTag / elementId / textPrefix / textSuffix / fingerprint / neighborText / xPct / yPct / wPct / hPct / kind / pinX / pinY / areaX / areaY / areaW / areaH` on the cached `AnnotationRecord` (null fields when input slot is null). Then build the `Partial<CloudRow>` patch per spec block at line ~173 and `void this.pushUpdate(id, patch)`. Return true / false.
  - Verify `onUpdate(raw)` at line ~259: it already does `next = rowToRecord(row)` and replaces the full cache entry, then `this.onChange()`. **No change needed** for status-only short-circuit (it doesn't short-circuit). The wiring in `src/index.ts` line 81–85 already calls `markers.refresh()` from `onChange`, which re-renders the marker with the new anchor / kind / pin / area. → Confirm in code; if the implementer finds an actual status-only short-circuit slipped in, broaden it here.
  - **One small addition: emit `feedback:updated`** from the cloud onUpdate path so host integrations on the receiving tab also see anchor/status updates. Currently `feedback:updated` only fires from the originating tab via `cycleStatus` / U4's drop handler. Wiring proposal: add a callback option `onUpdated: (record: AnnotationRecord) => void` to `CloudStore` ctor (mirrors `onChange`/`onReply`), call it in `onUpdate` for non-reply rows, and in `src/index.ts` line ~81 block wire it to `bus.emit("feedback:updated", record)`. Open the door without overloading `onChange`. (~10 LOC across the two files.)

**Patterns to follow.** `CloudStore.updateStatus` (line ~321) is the canonical optimistic-cache + `pushUpdate` example. The CloudRow column names match the migration SQL — confirm against `supabase/migrations/0001_init.sql` + `0002_status_pin_area.sql` while writing the patch builder.

**Test scenarios.**
- Cloud-mode drag-relocate of a `target` marker → cache mutates optimistically (marker re-renders before the network round-trip); PATCH carries the full anchor + rect payload; on PATCH return, realtime UPDATE comes back and the `onUpdate` handler is a near-no-op (cache already correct).
- Cloud-mode drag-relocate of an `area` marker → patch carries `area_x / area_y / area_w / area_h` per the input; `pin_*` columns explicitly nulled.
- Two-window test (spec verification §"Cloud mode two-window test"):
  - Window A drags marker, window B's marker moves within realtime debounce window (≤ 1–2 s).
  - Window A flips status via dropdown (built in U7), window B's marker recolors (or disappears under Done filter).
- Realtime `onUpdate` fan-out:
  - In window B with devtools open, attach `bus.on("feedback:updated", console.log)` → after window A relocates a marker, window B sees the event fire with the full updated record.
- `updateAnchor` on a stale id (record no longer in cache) → returns `false`, no PATCH fired.

**Verification.**
- `bun run check` clean.
- `bun run lint` clean.
- Manual two-window test against demo project (`bun run serve` + `data-supabase-*` already wired in demo HTML).
- Devtools network tab confirms the PATCH body contains all 20 anchor/rect/kind/pin/area columns.

### U6. Popover scroll: finish PRO-66 residue

**Goal.** Tighten the popover-scroll work PRO-66 partially shipped: drop `POPOVER_NOMINAL_HEIGHT`, swap the fixed `480px` cap for `min(70vh, NOMINAL*3)`, add `class="ccm-popover"` + scoped scrollbar styles.

**Requirements.** Spec §2 Fix items 1, 3, 4 (item 2 — body styling — already in place since PRO-66; item 5 — scroll-pinned-to-bottom on incoming reply — already in place at line 473 + 568).

**Dependencies.** U1 (residue confirmation).

**Files.**
- Modify `src/markers.ts`:
  - Delete the `POPOVER_NOMINAL_HEIGHT = 180` constant (~line 18) and its single use in the first-paint flip estimate (~line 522–528). Replace that block with: append the popover at `top: -10000px; left: -10000px`, read `pop.getBoundingClientRect().height` (the existing `max-height` clamp applies), then run the flip + horizontal-clamp logic with the real height. Set the final `top` + `left`. Drop the second "measured re-placement" pass — it becomes redundant once the first placement uses the real height.
  - Change the cap formula. Replace `POPOVER_MAX_HEIGHT_PX = 480` with `const POPOVER_MAX_VH = 0.7` and compute the effective cap at popover-open time as `Math.min(window.innerHeight * POPOVER_MAX_VH, 540)` (the spec's `NOMINAL * 3` = 180 * 3 = 540 px). Set `pop.style.maxHeight` from that computed value.
  - Add `pop.classList.add("ccm-popover")` before append.
  - Inject the scoped scrollbar styles in a `<style id="ccm-popover-scroll">` block at module init (same pattern the codebase uses for `#ccm-marker-anim`). Locate the existing animation style injection in `src/markers.ts` and add the new selectors next to it (or as a sibling block):
    ```
    .ccm-popover::-webkit-scrollbar { width: 6px; }
    .ccm-popover::-webkit-scrollbar-thumb {
      background: <colors.glassBorder>; border-radius: 3px;
    }
    ```
    The color comes from the theme; build the style string at MarkerManager construction time so it picks up `this.colors`.

**Approach — why drop the second-pass measure.** PRO-66 added the measured re-placement because the nominal-180 first pass was wrong; with the off-screen pre-render reading the real height, one pass is enough and visually identical (the off-screen render is invisible). Less code, same UX.

**Patterns to follow.** The existing `<style id="ccm-marker-anim">` injection in `MarkerManager` (search for `ccm-marker-anim` in `src/markers.ts`) is the template. `colors.glassBorder` (`ThemeColors`) is already used elsewhere for matching borders.

**Test scenarios.**
- Covers spec verification §"Manual scrollable popover":
  - Comment with 50 lines of body → popover height capped at 70vh (verify in devtools: `getBoundingClientRect().height` ≤ `0.7 * innerHeight`).
  - Same comment near top of viewport → popover renders below the marker; near bottom → flips above. The flip uses the REAL height (verify by manually adding more body lines and checking that the flip threshold scales).
  - Popover scrolled to bottom, new reply arrives via realtime (PRO-66 already handles this at line 568 `pop.scrollTop = pop.scrollHeight` — verify it still works after U6's changes).
  - Reviewer scrolled UP to read history, new reply arrives via realtime → scroll position is NOT yanked to the bottom (PRO-66's behavior — verify intact). **Note:** PRO-66's current line 568 unconditionally pins to bottom; if the spec's "only auto-scroll when already pinned to bottom" behavior isn't already shipped, file as a separate concern in spec §2 edge cases — out of scope for U6 (don't expand here).
- Scoped scrollbar styling appears (verify in WebKit / Chromium): scrollbar inside popover is 6px wide with the glassBorder color; scrollbar on host page is untouched.
- Popover with short body (one line) → no scrollbar appears, `max-height` doesn't cause visual padding.

**Verification.**
- `bun run check` clean.
- `bun run lint` clean.
- Manual scrollable popover bullets per spec verification §"Manual scrollable popover".

### U7. Status dropdown (replace pill cycle)

**Goal.** Replace the click-to-cycle status pill with a proper dropdown: trigger button (current pill visual + chevron caret), listbox menu with the four statuses, click-to-pick, ESC-closes-menu-then-popover, keyboard arrow nav. Delete `cycleStatus`. Add `repositionAndRecolor(id)` so picking a status doesn't tear down the popover.

**Cross-ticket constraint (PRO-68).** PRO-68 item #6 ("drawer cards expose the status dropdown") will reuse this dropdown for the drawer's per-row status badges. Extract the dropdown into a **shared module** at `src/status-dropdown.ts` rather than inlining it inside `openPopover`. Export a single factory:

```ts
// src/status-dropdown.ts
export interface StatusDropdownOptions {
  current: FeedbackStatus;
  colors: ThemeColors;
  t: TFunction;
  /** Called when the user picks a different status. Caller owns persistence
   * (store.updateStatus, feedback:updated emit, marker recolor, etc.). */
  onPick: (next: FeedbackStatus) => void;
  /** Suppress the dropdown affordance entirely — render a read-only pill.
   * Use when store.updateStatus is unavailable. */
  readOnly?: boolean;
}

export interface StatusDropdownHandle {
  /** Trigger button + menu, both already wired. Caller appends this. */
  root: HTMLElement;
  /** Re-render the trigger pill colors/label after `current` changes
   * externally (e.g. realtime UPDATE on another tab). */
  setCurrent: (status: FeedbackStatus) => void;
  /** Close the menu programmatically (e.g. parent popover closing). */
  close: () => void;
  /** Drop event listeners. Callers MUST invoke on unmount. */
  destroy: () => void;
}

export function createStatusDropdown(opts: StatusDropdownOptions): StatusDropdownHandle;
```

The module owns:
- DOM construction (trigger button + listbox menu)
- ARIA wiring (`role`, `aria-expanded`, `aria-haspopup`, `aria-selected`, `aria-controls`)
- Keyboard nav (Arrow Up/Down, Enter, ESC w/ `stopPropagation()` only when menu was open)
- Outside-click closes the menu (scoped to clicks not inside the dropdown root)
- Visual rendering (color dot per option, check on current)

The module does NOT own:
- The store call. Caller invokes `store.updateStatus` inside `onPick`.
- The `feedback:updated` bus emit. Caller does it.
- Marker recolor (`repositionAndRecolor`). Caller does it.
- Optimistic mutation of `record.status`. Caller does it.

This split keeps `status-dropdown.ts` framework-free and reusable from both `markers.ts` (popover) and `drawer.ts` (cards) without leaking the marker-layer abstractions into the drawer.

**Requirements.** Spec §3 in full.

**Dependencies.** U1 (independent of U2–U6 but the changes overlap in `openPopover`, so land after the relocate work to keep diff review manageable).

**Files.**
- Create `src/status-dropdown.ts` per the contract above. Approximate shape:
    - `trigger`: a `<button role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="<menu-id>">` styled exactly like the current pill PLUS a small ▾ glyph (Unicode `▾` is fine; if `src/icons.ts` already exports a chevron, use that — verify at impl time).
    - `menu`: a `<ul role="listbox" id="<menu-id>">` positioned `position: absolute; top: 100% + 4px; left: 0`, hidden by default (`display: none` + `aria-hidden`). z-index one above popover content. Inside the popover so its scroll container clips the menu when needed.
    - Options: four `<li role="option" aria-selected="<bool>">` each with a 10×10 colored dot (`STATUS_COLORS[s].border`), label `t(`status.${s}`)`, and a check icon when current.
    - Trigger click: toggle `aria-expanded`, show/hide menu, focus first option on open.
    - Option click: call `onPick(next)` (see below).
    - Outside-click (within popover only): close menu only; popover-level outside-click closes the popover (today's behavior, unchanged).
    - Keyboard: ArrowDown / ArrowUp navigates options, Enter selects, ESC closes the menu (call `event.stopPropagation()` to prevent the popover-level ESC handler from also closing the popover when the menu was open; if the menu was already closed, allow ESC to bubble and close the popover).
- Modify `src/markers.ts`:
  - At the top of `openPopover`, decide `readOnly = typeof this.store.updateStatus !== "function"`.
  - Replace the `statusPill` block in `openPopover` (~line 346–355) with a `createStatusDropdown({ current: status, colors: this.colors, t: this.t, readOnly, onPick: (next) => this.onStatusPicked(record, next, dropdownHandle) })` call. Append `dropdownHandle.root` to `tagsRow` where the pill used to live.
  - In `closePopover()`, call `dropdownHandle?.destroy()` before removing the popover so listeners drop.
  - New `MarkerManager.onStatusPicked(record, next, handle)` method does the work the inline `onPick` used to do (above):
    - Call `this.store.updateStatus?.(record.id, next)`.
    - Mutate `record.status = next`.
    - `this.bus.emit("feedback:updated", record)`.
    - `handle.setCurrent(next)` to repaint the trigger pill.
    - `handle.close()` to dismiss the menu.
    - `this.repositionAndRecolor(record.id)` to update the marker node beneath without re-mounting the popover.
  - Implement `repositionAndRecolor(id)` per spec §3 block at line ~437:
    - Find entry, derive status, set `entry.node.style.background = STATUS_COLORS[status].border`, set `entry.node.dataset.status = status`, toggle the `ccm-pulse` animation based on `status === "question"`.
  - Delete `cycleStatus` (line ~652–661).
- Modify `src/i18n.ts`:
  - Add `marker.popover.statusAria` ("Change status" / "Changer le statut").
  - Add `marker.popover.statusMenuAria` ("Statuses" / "Statuts").
  - Status labels (`status.todo` etc.) already exist — confirm at impl time.

**Patterns to follow.**
- `STATUS_COLORS` from `src/popup.ts` for the per-status palette.
- `feedback:updated` emit pattern from the soon-to-be-deleted `cycleStatus`.
- `el(...)` helper from `src/dom-utils.ts` for DOM construction.

**Trade-off recorded in spec.** Custom dropdown (~30 LOC) over styled-`<select>` (~5 LOC) for visual consistency with the glass popover. Not relitigated here.

**Test scenarios.**
- Covers spec verification §"Manual status dropdown":
  - One click flips `todo` → `question` directly (pick option from dropdown). Popover stays open.
  - Marker color updates (via `repositionAndRecolor`) without popover re-mount. Verify by attaching a reference to the popover DOM node before the click and confirming it's still attached after.
  - Two-window realtime: window A picks `done`, window B's marker disappears (Done filter on) or recolors.
- Picking the same status as current → menu closes, no `store.updateStatus` call, no `feedback:updated` event, no `repositionAndRecolor` call.
- Keyboard a11y:
  - Tab into trigger → focus visible.
  - Space/Enter on trigger → menu opens, first option focused.
  - ArrowDown / ArrowUp cycle through options.
  - Enter picks the focused option.
  - ESC closes menu, focus returns to trigger; second ESC closes popover.
- Outside-click within popover (e.g. click the popover body) → menu closes only, popover stays open.
- Outside-click outside popover → popover closes (today's behavior).
- Realtime status change from another window while menu is open → menu's "current" check moves under the cursor; reviewer's pick still wins (last write wins per spec edge case).
- Store without `updateStatus` (defensive: pass a stripped store in a dev harness) → trigger renders as a read-only pill, no chevron, no click handler.
- `cycleStatus` is no longer reachable: search for callers across the codebase → zero. (Already confirmed via grep at planning time: `cycleStatus` is referenced only at its definition and its single call site inside `statusPill.addEventListener("click", …)`.)

**Verification.**
- `bun run check` clean.
- `bun run lint` clean.
- Manual: spec verification §"Manual status dropdown" bullets.
- Cloud-mode two-window confirmation (overlaps with U5's two-window test — fold into one session).

### U8. Documentation updates

**Goal.** Document the kind-transitions-on-drag rules and the shared hover-outline helper.

**Requirements.** Spec checklist items 8 and 9.

**Dependencies.** U2 (helper exists), U4 (transitions decided).

**Files.**
- Modify `docs/data-model.md` — add a "Kind transitions" section describing:
  - `target` ↔ `pin` flip via drop on element vs empty space.
  - `area` stays `area` (translate intact, override of the spec — record the decision and the clamping rule).
  - Anchor / pin / area columns nulled when the kind doesn't use them.
- Modify `docs/architecture.md` — add a one-paragraph note that the drag overlay shares `src/dom/hover-outline.ts` with `PinMode` (same outline visual, same snapshot/restore semantics).
- Modify `docs/pin-relocate-and-popover-tweaks.md` — append a "Decisions log" subsection at the bottom recording the three invocation-time overrides (mouse-only v1, drop-on-same-element no-op, area-drag translate-intact) so the spec stays the source of truth.

**Test expectation:** none — documentation only.

**Verification.**
- `bun run lint` clean (Biome doesn't lint Markdown but `bun run check` is unaffected; main check is rendering).
- Render the modified docs in a Markdown previewer to confirm formatting.

### U9. End-to-end verification pass

**Goal.** Run the spec's full verification checklist as a final pre-merge gate.

**Dependencies.** U2 through U8.

**Files.** None (verification only).

**Test scenarios.** Spec §Verification in full:
- `bun run check` clean.
- `bun run lint` clean.
- Manual relocate (all 8 bullets in spec §Verification).
- Manual scrollable popover (both bullets).
- Manual status dropdown (3 bullets).
- Cloud-mode two-window test (both bullets).

**Verification.**
- All checkboxes ticked. If any fail, file as a bug against the responsible unit and re-run after fix.

## System-wide impact

- `src/markers.ts` is the single highest-touch file (relocate watcher, drag overlay, dropdown, popover-scroll residue). All three features land here so a diff-review needs to consider them together. Sequencing the units so each one compiles + lints independently keeps the per-commit review surface small.
- `src/store.ts` + `src/cloud-store.ts` gain one new method (`updateAnchor`). Backward-compatible (optional method on the interface). Self-hosters who haven't run all migrations still work — `updateAnchor` writes only columns that have existed since `0001_init.sql` + `0002_status_pin_area.sql`.
- `src/i18n.ts` gains four strings (relocate.instruction, relocate.cancel, marker.popover.statusAria, marker.popover.statusMenuAria). English + French.
- No schema migration. No new dependency. No new event surface (reuses `feedback:updated`).
- The cloud-store optionally gains an `onUpdated` callback (U5) wired to `bus.emit("feedback:updated", record)` in `src/index.ts` — small additive surface, backward-compatible.

## Scope boundaries

### In scope
- Drag-relocate for `target` / `pin` / `area` markers via mouse.
- Drop algorithm: target re-anchor, coord pin, area translate-intact, drop-on-same-element no-op, widget-host drop cancel.
- `updateAnchor` on both stores.
- Realtime fan-out of anchor/kind/pin/area changes (confirm + minor `onUpdated` callback addition).
- Popover-scroll residue: drop `POPOVER_NOMINAL_HEIGHT`, switch to `min(70vh, 540px)` cap, add `ccm-popover` class + scrollbar styles.
- Status dropdown replacing the cycle pill, plus `repositionAndRecolor` helper, plus `cycleStatus` deletion.
- Docs: kind-transitions in `docs/data-model.md`, shared-hover-outline note in `docs/architecture.md`, decisions-log in the origin spec.

### Out of scope (non-goals from spec §Non-goals)
- Area marker resize via drag (translation only — area drag IS in scope, resize is not).
- Multi-select / bulk move.
- Keyboard-driven relocate (arrow-key nudge).
- Undo / history beyond the standard `feedback:updated` event.
- Kind conversion via the status dropdown (status only).

### Deferred to follow-up work
- **`pointerdown` / `pointermove` retrofit** for touch / stylus / pen-input parity. v1 is mouse-only by decision; file a follow-up if reviewers request touch-drag.
- **"Auto-scroll only when pinned to bottom" behavior** for the popover during realtime reply arrival. If U6's verification surfaces that PRO-66 currently unconditionally pins to bottom, file a separate ticket — don't expand U6.
- **Realtime onUpdate already broadens beyond `status` short-circuit** — verified at planning time. If a future regression narrows it again, that's a separate fix.
- **Shared toolbar visual between `PinMode` and the relocate drag overlay.** U4 implements an inline minimal toolbar string. A future refactor could extract the toolbar surface; not worth it for one extra caller.

## Risks

- **Watcher / suppression interaction with touch.** The drag-or-click watcher only binds mouse events. Touch synthesizes `click` directly with no preceding `mousedown` → the `click` listener path opens the popover as today. Risk: a future change adds `pointerdown` and breaks this assumption. Mitigation: comment in `src/markers.ts` near the watcher pinning the mouse-only contract and the touch fallback.
- **Drop-on-same-element identity test fragility.** Comparing `target === entry.anchorEl` relies on `anchorEl` being populated for `target` markers. For `pin` / `area` markers, `anchorEl` is `null`, so the comparison always fails and the drop fires normally — correct per the decision rationale. Risk: a future change populates `anchorEl` for non-target kinds and the no-op short-circuit silently activates for pin/area too. Mitigation: scope the identity check to `entry.record.kind === "target"` (already in the U4 decision tree).
- **Area clamp formula off-by-N.** The clamping math for area-drag uses the marker anchor at `areaX + areaW`. The reposition code at `src/markers.ts:719` confirms this. Risk: future change moves the area marker rendering position and the clamp doesn't follow. Mitigation: cross-reference the constant during U4 implementation; add a `// keep in sync with reposition()` comment on both sides.
- **`POPOVER_NOMINAL_HEIGHT` removal breaks PRO-66 measured pass.** U6 deletes the constant and the first-paint flip block, then drops the second-pass re-measure. Risk: an external caller of `MarkerManager` relied on the popover's first-paint position. Mitigation: the popover is internal to `MarkerManager` and never exposed; no external surface to break.
- **Status dropdown nested-popover ESC handling.** ESC must close the menu first, then the popover on second press. Risk: event order makes both close together. Mitigation: `stopPropagation()` in the menu's keydown handler when the menu was open and ESC was pressed. Covered in U7 test scenarios.
- **Cloud-store optimistic mutation racing with realtime echo.** U4 mutates the cache optimistically, then the PATCH returns, then realtime delivers an UPDATE with the same payload. Risk: marker re-renders twice in quick succession. Today's `updateStatus` has the same pattern with no observable issue — same risk profile, accept it.

## Open questions / decisions left to implementer

Minimal — the three big decisions in the spec were resolved at invocation time and recorded under "Key technical decisions" above. The remaining handoff items:

- **U5 `onUpdated` callback wiring** — adding a new `onUpdated` ctor option to `CloudStore` is the cleanest way to fire `feedback:updated` from realtime UPDATEs. If the implementer prefers to overload `onChange` to also emit (after `refresh()`), that's acceptable too — it just makes the contract less crisp. Recorded as a soft preference, not a blocker.
- **U6 cap formula precision** — spec says `min(70vh, NOMINAL*3)` where NOMINAL was 180, giving 540px. If the implementer prefers a simpler `min(0.7 * innerHeight, 540)` constant block, that's the same math; pick whichever reads cleaner.
- **U7 chevron source** — Unicode `▾` vs an SVG chevron from `src/icons.ts`. Verify at impl time whether icons.ts exports something usable; either works.

## Verification checklist (mirrors spec §Verification)

Run before merging to `dev`:

- [ ] `bun run check` clean.
- [ ] `bun run lint` clean.
- [ ] Manual relocate (target → element, target → empty space, pin → element, pin → empty space, area → anywhere with rect intact + clamp, ESC mid-drag, click < 6 px without drag, long-press > 250 ms without movement).
- [ ] Manual scrollable popover (50-line comment caps at 70vh + scrolls, flip logic correct near viewport edge, scrollbar styled, host page unaffected).
- [ ] Manual status dropdown (one click `todo` → `question`, popover stays open, marker color updates, keyboard nav works, realtime two-window update propagates).
- [ ] Cloud-mode two-window relocate test (window A drags, window B sees within 1–2 s).
- [ ] Cloud-mode two-window status test (window A picks `done`, window B's marker recolors / hides under Done filter).
- [ ] localStorage record reload preserves new position for all kind transitions.
- [ ] `cycleStatus` no longer present in source (grep returns zero hits).
- [ ] `POPOVER_NOMINAL_HEIGHT` no longer present in source (grep returns zero hits).

## References

- Origin spec: `docs/pin-relocate-and-popover-tweaks.md`
- Recent PRO-66 popover work: `src/markers.ts` lines 317–584 (open popover + reply thread + composer)
- Existing hover-outline impl to extract: `src/pin-mode.ts` lines 236–311
- Cloud-store update pattern: `src/cloud-store.ts` `updateStatus` (~line 321) and `pushUpdate` (~line 422)
- Marker reposition pin/area coordinate system: `src/markers.ts` lines 681–720

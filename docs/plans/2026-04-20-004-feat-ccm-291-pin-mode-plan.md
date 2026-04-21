---
title: "feat(widget): Pin mode — click-to-anchor comments on DOM elements"
type: feat
status: active
date: 2026-04-20
linear: CCM-291
branch: feature/CCM-291-pin-mode
---

# feat(widget): Pin mode — click-to-anchor comments on DOM elements

## Overview

Add a new `pin` mode to the widget FAB that lets a reviewer click any DOM element to leave a comment anchored directly to it. Today the only way to leave a rectangle-anchored comment is the area tool (drag a rect). The per-element anchoring logic the widget uses for rectangles (`generateAnchor`) is already accurate ~90% of the time and is reused verbatim by `text-edit` and `image-swap` modes. Pin mode is a UX improvement on top of existing logic: click the thing, comment on the thing.

Pin mode becomes the **default** mode when the FAB opens. Area mode remains available as a secondary option for region-level feedback.

## Problem Frame

- Reviewers who want to comment on a specific element (a heading, a button, an icon) currently have to draw a rectangle around it. The rectangle-to-element anchor resolution in `packages/widget/src/annotator.ts` works but makes reviewers do an extra manual step.
- `text-edit` and `image-swap` modes already demonstrate the direct "hover an element → click → act on it" UX. The bare "comment on element" case is the missing primitive.
- Net-new work is small (~200-300 lines) because every downstream concern — anchor resolution, popup, feedback submission, markers, panel listing, webhook payload, Supabase persistence — is reused unchanged.

## Requirements Trace

- R1. A crosshair icon appears in the FAB radial menu with tooltip "Comment on element"
- R2. Clicking the FAB opens pin mode by default (replacing area as the default)
- R3. In pin mode, hovering any eligible DOM element draws a live outline + badge
- R4. Clicking the hovered element opens the same comment popup `Annotator` opens today, anchored to that element
- R5. Submitted comments persist as a `FeedbackPayload` with a single `AnnotationPayload` whose shape is identical to what area mode produces — `type` omitted (defaults to `"rectangle"`) and `anchor` populated via `generateAnchor`
- R6. Area mode remains accessible from the FAB
- R7. Escape cancels pin mode without submitting
- R8. `bun run build && bun run test:run && bun run test:e2e` all green
- R9. Demo at `/demo` demonstrates: pin mode default → click heading → comment pops; area mode still works

## Scope Boundaries

- Out: schema or webhook shape changes (pin annotations reuse the current area-mode shape verbatim)
- Out: fixing the remaining ~10% anchor-resolution edge cases (text nodes, pseudo-elements, shadow DOM of host pages)
- Out: touch/mobile pin interaction — mouse/pointer only for v1 (matches the desktop-only widget guard in `packages/widget/src/launcher.ts`)
- Out: reordering or removing any existing FAB item beyond making pin the default first item
- Out: a keyboard-only equivalent of pin (area mode's existing Enter-on-focused-element path covers keyboard users)

## Context & Research

### Relevant Code and Patterns

- `packages/widget/src/annotator.ts` — area mode. Key references:
  - Line 210: `generateAnchor(target)` called per-element in the keyboard Enter path. This is the exact helper pin mode will reuse.
  - Lines 310-358: `finishDrawing` + popup round-trip + event emission. Pin mode needs the **popup round-trip** portion but not the rectangle math.
  - Line 364-383: `buildAnnotation(rectBounds)` — builds the `AnnotationPayload` from a rectangle. Pin mode needs an element-based equivalent (essentially what the keyboard path on line 210-227 already does: full-bounds rect `{xPct:0,yPct:0,wPct:1,hPct:1}` + per-element anchor).
- `packages/widget/src/text-edit-mode.ts` — blueprint for the hover-outline UX. Lines 146-196 show the overlay `mousemove` → `document.elementFromPoint` (temporarily disabling `overlay.pointerEvents`) → apply inline outline pattern. Pin mode mirrors this pattern, minus the `isTextBearing` predicate and `contenteditable` promotion.
- `packages/widget/src/image-swap-mode.ts` — second blueprint for hover/click overlay with a toolbar + cancel button + Escape key handling.
- `packages/widget/src/fab.ts` — `items[]` array at lines 50-57 declares radial menu order. `handleItemClick(id)` at lines 227-253 switches mode dispatch. Pin needs a new item (first in the array) and a `case "pin":` branch that emits `"pin:start"`.
- `packages/widget/src/launcher.ts` — lines 203-207 construct `Annotator`, `TextEditMode`, `ImageSwapMode`. Pin mode is wired the same way. Lines 314-322 register `annotation:complete`, `text-edit:complete`, `image-swap:complete` subscribers that route into the shared `submitAnnotation` pipeline. Pin emits `annotation:complete` (with `AnnotationComplete`) so it plugs into that same pipeline for free.
- `packages/widget/src/popup.ts` — `show(rectBounds: DOMRect, context?: PopupContext)` returns `Promise<PopupResult | null>`. Accepts any `DOMRect`, including an element's `getBoundingClientRect()`. The popup opening helper extracted from `annotator.ts` will call this directly.
- `packages/widget/src/events.ts` — `WidgetEvents` at lines 50-70 lists all internal bus events. Pin adds `"pin:start"`, `"pin:end"`, and reuses the existing `"annotation:complete"` channel (no new complete event — payload shape is identical).
- `packages/widget/src/icons.ts` — icon registry. Pin adds `ICON_PIN` (crosshair SVG, 24x24, `stroke="currentColor"` to inherit theme).
- `packages/widget/src/i18n/en.ts` + `fr.ts` + `types.ts` — label registry. Pin adds `fab.pin`, `pin.instruction`, `pin.cancel`, `pin.ariaLabel`.

### Institutional Learnings

- `docs/plans/2026-04-20-003-feat-ccm-282-annotation-intents-plan.md` — the CCM-282 plan. The `text-edit` and `image-swap` patterns this plan mirrors were introduced there. Same structural playbook applies: new mode class, new FAB item, new i18n keys, same submission pipeline.
- `packages/widget/__tests__/widget/text-edit-mode.test.ts` + `fab.test.ts` — existing unit test patterns for mode classes and FAB items. Vitest + jsdom, mocked `generateAnchor` to avoid `@medv/finder` in jsdom.

### External References

None — this is a UX primitive. No external docs needed; everything builds on existing internal patterns.

## Key Technical Decisions

- **Pin is the default FAB menu item.** It appears **first** in the items array so the FAB's `requestAnimationFrame(() => firstItem.focus())` (fab.ts line 199-202) lands focus on pin, and keyboard users hitting Enter immediately after opening the FAB land in pin mode. Area stays in the list at its current position.
- **Payload shape identical to area mode.** Pin emits `"annotation:complete"` with an `AnnotationComplete` whose `AnnotationPayload` uses:
  - `anchor`: `generateAnchor(clickedElement)`
  - `rect`: `{ xPct: 0, yPct: 0, wPct: 1, hPct: 1 }` — full-bounds rectangle relative to the clicked element
  - no `type` field (defaults to `"rectangle"` in `AnnotationPayload.type` per `packages/core/src/types.ts:655-656`)
  - `scrollX/Y`, `viewportW/H`, `devicePixelRatio` same as area
  - `FeedbackType` (question/change/bug/other) comes from the popup's type selector — same as area
  This keeps the webhook payload and Supabase rows **byte-for-byte compatible** with what area mode writes today. No contract-level work, no adapter changes, no webhook changes.
- **Extract a shared popup-opening helper from `annotator.ts`.** Both the keyboard Enter path (lines 197-237) and the mouse drag path (lines 310-358) in `annotator.ts` duplicate the sequence: `generateAnchor(el)` → `popup.show(rectBounds, context)` → on result, emit `"annotation:complete"` with an `AnnotationPayload`. Extract that sequence into a small helper so `pin-mode.ts` can reuse it without taking a hard dependency on `Annotator`. Helper signature (directional):
  ```ts
  // packages/widget/src/annotator.ts (exported helper)
  export async function openCommentPopupForElement(
    element: HTMLElement,
    popup: Popup,
    projectName: string,
    bus: EventBus<WidgetEvents>,
  ): Promise<void>
  ```
  The helper builds the full-bounds rect from `element.getBoundingClientRect()`, resolves `generateAnchor`, calls `popup.show()`, and on a truthy result emits `"annotation:complete"` on the bus. Framed as a pure function — pin-mode and the Annotator's Enter path both call it. The rectangle-drag path keeps its own flow because it builds a non-full-bounds rect.
- **Pin owns its own `Popup` instance or receives it via DI?** Receive it via DI. `launcher.ts` already constructs one `Popup` instance via the `Annotator` constructor; pin-mode gets the same `Annotator` injected (or the helper + popup reference) rather than instantiating a second popup. Avoids two audio recorders, two root DOM nodes, and two concurrent submissions. Concretely: `PinMode` takes `(colors, bus, t, openPopup)` where `openPopup: (el: HTMLElement) => Promise<void>` is a thin wrapper created in `launcher.ts` that closes over the `Annotator`'s popup reference.
- **Hover detection strategy:** same as `text-edit-mode.ts`. Overlay captures `mousemove`, temporarily toggles `overlay.style.pointerEvents = "none"`, uses `document.elementFromPoint`, then restores. This is the pattern proven to work in CCM-282.
- **Eligibility filter for hoverable elements:** permissive. Any element returned by `elementFromPoint` is eligible as long as `shouldIgnoreElement` (host + widget internals) is false. No text-bearing predicate — pin should work on icons, images, decorative spans, etc.
- **Outline style:** solid 2px (not dashed) to distinguish from text-edit's dashed outline, using `colors.accent`. A small floating badge (bottom-right of the hovered element) displays the element's tag name and CSS selector snippet for reviewer confidence. Badge uses the same glassmorphism treatment as other mode toolbars.
- **Click dispatch stays inside the overlay.** Same pattern as `text-edit-mode.ts`: `overlay.addEventListener("click", ...)` with a re-hover via `elementFromPoint` at click time, rather than tracking the hovered element and trusting state. Avoids stale-hover bugs if the page reflows.
- **Concurrency guard:** pin mode emits `pin:start` on activate. `Annotator`, `TextEditMode`, and `ImageSwapMode` all assume mutually exclusive activation via the FAB's `close()` + single-click handler. No cross-mode guard exists today; pin follows the same convention. Submission-level concurrency is covered by the existing `submitting` flag in `launcher.ts` line 212.
- **E2E seam for stable clicks:** add a single `data-ccm-pin-target="true"` attribute to a heading in `apps/demo/src/components/demo/demo-site.tsx` (or the nearest existing demo component) so the Playwright test can click a known element without fighting layout. No runtime behavior depends on it.

## Open Questions

### Resolved During Planning

- **Can pin reuse the existing `annotation:complete` event?** Yes. Payload shape is identical to area-mode rectangle output; no new subscriber needed in `launcher.ts` beyond the existing `bus.on("annotation:complete", ...)` at line 314.
- **Does pin need schema changes?** No. `AnnotationPayload.type` is optional and defaults to `"rectangle"` (core/src/types.ts:655-656). Pin's full-bounds rect + element anchor is structurally a rectangle annotation.
- **Where does the `Popup` instance live?** In the existing `Annotator`. Pin receives a wrapper function from `launcher.ts` rather than instantiating its own popup — avoids duplicated audio recorder, ID conflicts, and double-submission.
- **Should pin be the default?** Yes, per R2. Implementation: move the pin item to index 0 in `fab.items[]` so the FAB's existing `firstItem.focus()` lands on it.
- **Plan filename sequence number:** `004` — three plans already exist today (`001`, `002`, `003`). `CCM-284-voice-comment-pipeline.md` does not use the dated-sequence convention so it doesn't occupy a number.

### Deferred to Implementation

- **Exact badge layout and typography** — the per-hover badge styling is a polish concern. Start with a tag-name pill in the bottom-right of the outlined element; iterate visually during demo verification.
- **Whether to also remove the old area item's "default focus" priority in `fab.open()`** — if a regression test proves the existing `firstItem.focus()` still does the right thing once pin is at index 0, no fab.ts focus code needs to change. Verify during implementation.
- **Final crosshair SVG path** — draft during implementation. Must be 24x24, use `stroke="currentColor"`, and read as a crosshair/target (center dot + four radiating ticks is the canonical shape).

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### State machine (pin mode)

```
                     bus.emit("pin:start")
                               │
                               ▼
                    ┌────────────────────┐
        ESC         │                    │   mouseleave overlay
     ┌──────────────│        IDLE        │◀───────────────┐
     │              │  (overlay active,  │                │
     │              │  no hover)         │                │
     │              └────────┬───────────┘                │
     │                       │  mousemove                 │
     │                       │  → elementFromPoint        │
     │                       │  → not ignored             │
     │                       ▼                            │
     │              ┌────────────────────┐                │
     │              │                    │                │
     │              │      HOVERING      │────────────────┘
     │              │  (outline + badge  │  mousemove → different el
     │              │   on element)      │    → clearOutline,
     │              └────────┬───────────┘      reapply on new el
     │                       │
     │                       │  click
     │                       ▼
     │              ┌────────────────────┐
     │              │                    │
     │              │   POPUP_OPEN       │   (popup.show awaited)
     │              │                    │
     │              └────────┬───────────┘
     │                       │
     │       popup cancel    │   popup submit
     │    ┌──────────────────┴──────────────────┐
     │    ▼                                     ▼
     │  (return to IDLE)          bus.emit("annotation:complete")
     │                                          │
     │                                          ▼
     └─────────────────────────►   deactivate() → bus.emit("pin:end")
```

Notes:
- Escape is observed at `document` level throughout the active state. Matches `annotator.ts:156` pattern.
- During POPUP_OPEN, overlay hover is suspended but the overlay DOM stays mounted so Escape cancellation still deactivates the whole mode.
- Submission concurrency is enforced one layer up by `launcher.ts`'s `submitting` flag — not duplicated here.

### Helper extraction sketch — `annotator.ts`

```
// Before (two places duplicate this in annotator.ts):
//   keyboard Enter path (lines 197-237) — already element-based
//   finishDrawing path (lines 310-358) — rectangle-based, includes buildAnnotation
//
// After: extract the element-based portion as a shared helper.

// Exported from annotator.ts so pin-mode can import it.
openCommentPopupForElement(element, popup, projectName, bus):
  bounds = element.getBoundingClientRect()
  if bounds.width <= 0 or bounds.height <= 0: return   // guard, same as keyboard path
  anchor = generateAnchor(element)
  rectBounds = new DOMRect(bounds.x, bounds.y, bounds.width, bounds.height)
  result = await popup.show(rectBounds, {
    selector: anchor.cssSelector,
    surroundingText: trim(`${anchor.neighborText} ${anchor.textSnippet}`),
    projectName,
  })
  if !result: return
  annotation = {
    anchor,
    rect: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
    scrollX, scrollY, viewportW, viewportH, devicePixelRatio,
    audioUrl?: result.audioUrl,
  }
  bus.emit("annotation:complete", { annotation, type: result.type, message: result.message, audioUrl?: ... })
```

Annotator's keyboard Enter path (`onOverlayKeyDown`) refactors to call this helper. Pin mode also calls this helper. The drag-rectangle path (`finishDrawing`) stays as-is — it uses `buildAnnotation(rectBounds)` with percentage math and that logic doesn't apply to elements.

## Implementation Units

- [ ] **Unit 1: Extract shared popup-opening helper from Annotator**

**Goal:** Extract the "open comment popup anchored to an element" sequence from `annotator.ts` into a reusable function so pin-mode can invoke it without duplicating logic or taking a hard dependency on `Annotator`. Refactor the existing keyboard Enter path (`onOverlayKeyDown`) to call the helper so both callers stay in sync.

**Requirements:** R5

**Dependencies:** None

**Files:**
- Modify: `packages/widget/src/annotator.ts`
- Test: `packages/widget/__tests__/widget/annotator.test.ts`

**Approach:**
- Add an exported function `openCommentPopupForElement(element, popup, projectName, bus)` at module scope (not a method of `Annotator`), so pin-mode can import it directly without instantiating `Annotator`.
- The function encapsulates: bounds guard, `generateAnchor`, `popup.show` round-trip, `AnnotationPayload` construction with `rect: { xPct:0, yPct:0, wPct:1, hPct:1 }`, and bus emission of `"annotation:complete"`.
- Refactor `Annotator.onOverlayKeyDown` to call the new helper after calling `this.deactivate()` (keyboard path deactivates first, matching current ordering). Keep `finishDrawing` unchanged — it uses rectangle math that doesn't fit the helper.
- The helper must NOT touch the Annotator overlay DOM. It must be safe to call while another mode owns the overlay.

**Patterns to follow:**
- Existing element-based flow in `annotator.ts` lines 197-237 (`onOverlayKeyDown`) — the helper is almost literally that code, extracted.
- `AnnotationPayload` shape per `packages/core/src/types.ts:647-673`.

**Test scenarios:**
- Happy path — calling the helper with an element whose bounds are positive resolves an anchor via the (mocked) `generateAnchor`, awaits `popup.show`, and emits `"annotation:complete"` on the bus with an annotation whose `rect` is `{xPct:0, yPct:0, wPct:1, hPct:1}` and `type` is omitted (defaults to rectangle).
- Edge case — calling the helper with an element whose bounds are zero (`width <= 0` or `height <= 0`) returns without emitting any bus event and without calling `popup.show`.
- Error path — when `popup.show` resolves to `null` (user cancelled), no `"annotation:complete"` event is emitted.
- Integration — `Annotator`'s keyboard Enter path (`onOverlayKeyDown`) still emits an `AnnotationComplete` event end-to-end after the refactor; existing keyboard-Enter test must pass unchanged.
- Integration — the helper emits the same payload shape the drag-rectangle path would for a full-element rect (anchor + full-bounds rect + default type).

**Verification:**
- Existing `annotator.test.ts` keyboard-Enter assertions still pass.
- New helper has its own describe block with at least the scenarios above.

---

- [ ] **Unit 2: Add crosshair icon + i18n labels**

**Goal:** Register a crosshair SVG icon and label strings so the FAB button, tooltip, toolbar, and cancel button can display "Comment on element" (EN) and the French equivalent.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `packages/widget/src/icons.ts`
- Modify: `packages/widget/src/i18n/types.ts`
- Modify: `packages/widget/src/i18n/en.ts`
- Modify: `packages/widget/src/i18n/fr.ts`
- Test: `packages/widget/__tests__/i18n/` — existing translation-shape tests cover the new keys automatically if they exist; add a targeted assertion if the suite doesn't auto-derive from `Translations`.

**Approach:**
- Add `ICON_PIN` to `icons.ts` — 24x24 crosshair (center dot + four radiating ticks, or circle-with-crosshairs). Stroke-based, `currentColor`, `stroke-width="2"`, `stroke-linecap="round"`, matching the existing icon conventions.
- Add four new translation keys to `Translations` interface and both locale files:
  - `fab.pin` — EN "Pin", FR "\u00c9pingler" (Épingler). This is the short label for the radial menu button's `aria-label` and tooltip.
  - `pin.instruction` — EN "Comment on element" (the toolbar instruction, also used as the FAB tooltip per ticket ACs), FR "Commenter un \u00e9l\u00e9ment".
  - `pin.cancel` — EN "Cancel", FR "Annuler".
  - `pin.ariaLabel` — EN "Pin mode", FR "Mode \u00e9pingle".
- The ticket specifies tooltip "Comment on element". Use `pin.instruction` for both the FAB item's `aria-label` and the toolbar instruction, or introduce a separate key if disambiguation is needed at implementation time.

**Patterns to follow:**
- `ICON_EDIT_TEXT` and `ICON_IMAGE_SWAP` in `icons.ts` lines 32-35.
- `textEdit.*` and `imageSwap.*` key clusters in `en.ts` and `fr.ts`.

**Test scenarios:**
- Happy path — `createT("en")("pin.instruction")` returns "Comment on element"; `createT("fr")("pin.instruction")` returns the French equivalent.
- Happy path — `ICON_PIN` parses as valid SVG via `parseSvg()` (existing helper) without throwing.

**Verification:**
- TypeScript `bun run check` passes (both locale files implement `Translations`).
- No placeholder `[missing]` value in either locale for any new key.

---

- [ ] **Unit 3: Create PinMode class with state machine + overlay/outline/badge rendering**

**Goal:** New `pin-mode.ts` module implementing the idle → hovering → popup-open state machine, overlay-based hover detection, outline/badge rendering, and Escape-to-cancel.

**Requirements:** R3, R4, R7

**Dependencies:** Unit 1 (helper), Unit 2 (i18n + icon)

**Files:**
- Create: `packages/widget/src/pin-mode.ts`
- Test: `packages/widget/__tests__/widget/pin-mode.test.ts`

**Approach:**
- Class `PinMode` constructed with `(colors, bus, t, openPopupForElement, shouldIgnoreElement)`.
  - `openPopupForElement: (el: HTMLElement) => Promise<void>` — wrapper injected by `launcher.ts`, closes over the `Annotator`'s popup reference and calls the Unit 1 helper. Pin mode does NOT know about `Popup` or `projectName` directly.
  - `shouldIgnoreElement: (el: Element) => boolean` — same predicate already used by `TextEditMode` and `ImageSwapMode` (excludes the widget host + descendants).
- `constructor` subscribes to `bus.on("pin:start", () => this.activate())`.
- `activate()` creates a fixed-position overlay (cursor `crosshair`) + a glassmorphism toolbar with the `pin.instruction` text and a cancel button. Registers `mousemove`, `click`, and `keydown` (for Escape) listeners. Locks `body.overflow = "hidden"`. Emits nothing (the bus event that activated it was `pin:start`).
- `deactivate()` tears down overlay, toolbar, any hover outline; unregisters listeners; restores body overflow; emits `"pin:end"`.
- `onOverlayMouseMove` mirrors `text-edit-mode.ts:146-168` — temporarily drop `overlay.pointerEvents`, call `document.elementFromPoint`, restore, apply/clear outline + badge.
- `applyHoverOutline(target)` — inline `outline: 2px solid ${colors.accent} !important` + `outline-offset: 2px`. Badge is a small fixed-positioned pill near the element's bottom-right showing the tag name, styled via the glassmorphism tokens. Badge lives in `document.body` (not inside the outlined element) so it doesn't alter the host page's layout.
- `clearHoverOutline()` — remove inline outline styles, remove badge.
- `onOverlayClick` — at click time, re-resolve the element via `elementFromPoint` (same pattern as text-edit), clear the outline, then await `this.openPopupForElement(target)`. After resolution (whether the user submitted or cancelled the popup), call `this.deactivate()`. The popup result does not come back to pin — it flows straight through the bus to `launcher.ts`'s `submitAnnotation`.
- `onKeyDown` listens for `Escape` at `document` level and calls `deactivate()`. Mirrors `annotator.ts:188`.
- `destroy()` public method calls `deactivate()` — matches `Annotator.destroy()` / `TextEditMode.destroy()` shape.

**Patterns to follow:**
- `packages/widget/src/text-edit-mode.ts` — hover overlay + `elementFromPoint` toggle.
- `packages/widget/src/annotator.ts` — toolbar glassmorphism styling (lines 76-137).
- `packages/widget/src/image-swap-mode.ts` — second reference for overlay lifecycle.

**Test scenarios:**
- Happy path — construct with a stubbed `openPopupForElement`; emit `pin:start`; assert an overlay and toolbar are appended to `document.body`.
- Happy path — while active, dispatching a `mousemove` over a test element causes that element to receive an inline `outline` style matching `colors.accent`.
- Happy path — dispatching a `click` event while over a test element calls the injected `openPopupForElement` with that element and subsequently calls `deactivate` (toolbar + overlay removed).
- Edge case — mousemove over the widget host element (`shouldIgnoreElement` returns true) does NOT apply an outline.
- Edge case — mousemove to a new element clears the previous element's inline outline before applying the new one (no orphaned outlines).
- Edge case — `activate()` is idempotent: calling `pin:start` a second time while already active does not stack overlays.
- Error path — if `openPopupForElement` throws, the mode still deactivates cleanly (listeners removed, body overflow restored).
- Error path — pressing Escape at `document` level during `HOVERING` deactivates the mode and emits `"pin:end"` without calling `openPopupForElement`.
- Integration — one full round-trip: emit `pin:start` → dispatch mousemove then click → `openPopupForElement` receives the correct element.

**Verification:**
- The state-machine test suite covers every arrow in the diagram above.
- `bun run check` passes with `exactOptionalPropertyTypes`.

---

- [ ] **Unit 4: Wire pin:start / pin:end events into the bus**

**Goal:** Register the two new bus events in `events.ts` so TypeScript knows about them, and surface optional public callbacks `onPinStart` / `onPinEnd` for parity with `onAnnotationStart` / `onAnnotationEnd`.

**Requirements:** R4, R7 (supports)

**Dependencies:** None (can land alongside Unit 3)

**Files:**
- Modify: `packages/widget/src/events.ts`
- Modify: `packages/core/src/types.ts` — add `onPinStart?: () => void` and `onPinEnd?: () => void` to `CcmFeedbackConfig` near the existing `onAnnotationStart` / `onAnnotationEnd` (lines ~54-60 in the excerpt read during research).

**Approach:**
- Add to `WidgetEvents`:
  - `"pin:start": []`
  - `"pin:end": []`
- Add to `CcmFeedbackConfig` in `@ccm-feedback/core`:
  - `onPinStart?: () => void`
  - `onPinEnd?: () => void`
- In `launcher.ts`, wire them the same way `onAnnotationStart` is wired at line 117: `if (config.onPinStart) bus.on("pin:start", config.onPinStart);`.
- No change to `PublicWidgetEvents` unless we decide to expose these events on `CcmFeedbackInstance.on(...)`. For parity, start mode events are NOT exposed on `CcmFeedbackInstance` today (annotation:start isn't either); keep the symmetry.

**Patterns to follow:**
- `annotation:start` / `annotation:end` handling in `events.ts:57-58` + `launcher.ts:117-118`.

**Test scenarios:**
- Happy path — subscribing to `bus.on("pin:start")` fires when `PinMode.activate()` runs.
- Happy path — `config.onPinStart` callback fires when the widget launcher wires it.
- Test expectation for `events.ts`: none — this file is pure type declarations; covered indirectly by Unit 3 and Unit 5 tests.

**Verification:**
- `bun run check` passes (strict typing catches an unhandled new event).
- No runtime regression in `annotation:*` events.

---

- [ ] **Unit 5: Add pin to FAB as the default item**

**Goal:** Insert pin as the first item in the FAB radial menu and route its click to `bus.emit("pin:start")`. Existing items shift by one; pin becomes the first-focused item when the FAB opens.

**Requirements:** R1, R2, R6

**Dependencies:** Unit 2 (icon + i18n), Unit 4 (event)

**Files:**
- Modify: `packages/widget/src/fab.ts`
- Test: `packages/widget/__tests__/widget/fab.test.ts`

**Approach:**
- In `Fab.constructor` (lines 50-57), prepend `{ id: "pin", icon: ICON_PIN, label: t("fab.pin") }` as the first entry of `this.items`. Other items retain their current order.
- In `handleItemClick(id)` (lines 227-253), add `case "pin":` that calls `this.bus.emit("pin:start")`.
- Verify (visually + via test) that `fab.open()`'s `firstItem.focus()` (lines 199-202) now focuses the pin button. No code change needed if the query selector returns items in DOM order — which it does, because items are appended in order at lines 73-98.
- The button's `aria-label` uses `t("fab.pin")`. If the ticket's "tooltip reads 'Comment on element'" AC requires the tooltip to be the longer instruction text rather than the short label, use `t("pin.instruction")` for the `aria-label` (which radix-free native tooltips surface) instead. Decide during implementation.

**Patterns to follow:**
- Existing FAB items pattern (lines 50-98).
- `handleItemClick` switch at lines 230-252.

**Test scenarios:**
- Happy path — the FAB now renders **six** radial items (was 5: chat, annotate, edit-text, swap-image, toggle-annotations — now with pin prepended).
- Happy path — the first radial item (DOM order) has `data-item-id="pin"`.
- Happy path — clicking the pin radial item emits `"pin:start"` on the bus exactly once.
- Happy path — the pin item's `aria-label` resolves to the EN or FR tooltip string per the active locale.
- Integration — opening the FAB (programmatic click on `.sp-fab`) auto-focuses the pin item after the `requestAnimationFrame` tick.
- Edge case — clicking the `data-item-id="annotate"` item still emits `"annotation:start"` (area mode not broken).

**Verification:**
- Existing `fab.test.ts` expectation `expect(items.length).toBe(5)` updates to `toBe(6)` and the comment reflects CCM-291.
- New tests assert the first-focus invariant and the pin click path.

---

- [ ] **Unit 6: Wire PinMode into the launcher**

**Goal:** Instantiate `PinMode` in `launcher.ts`, inject the popup-opening wrapper, register the lifecycle callbacks, and include pin teardown in `destroy()`.

**Requirements:** R4, R5

**Dependencies:** Units 1, 3, 4

**Files:**
- Modify: `packages/widget/src/launcher.ts`
- Test: `packages/widget/__tests__/widget/launcher-integration.test.ts`

**Approach:**
- After constructing `annotator` at line 203, construct pin:
  - Build a wrapper `openPopupForPinnedElement = (el: HTMLElement) => openCommentPopupForElement(el, annotator.getPopup(), config.projectName, bus)`. Either expose a `getPopup()` accessor on `Annotator` or change the `Annotator` constructor to accept a pre-built `Popup` that `launcher.ts` owns directly. Prefer the latter (decouples popup ownership) but the accessor is acceptable — decide during implementation.
  - `const pinMode = new PinMode(colors, bus, t, openPopupForPinnedElement, shouldIgnoreElement);`
- Register optional callbacks: `if (config.onPinStart) bus.on("pin:start", config.onPinStart); if (config.onPinEnd) bus.on("pin:end", config.onPinEnd);`.
- Add debug log lines matching lines 131-132: `bus.on("pin:start", () => log("Pin mode started")); bus.on("pin:end", () => log("Pin mode ended"));`.
- In `instance.destroy` (line 342-358), call `pinMode.destroy()` between `annotator.destroy()` and `textEditMode.destroy()`.
- No change needed to `submitAnnotation` — pin emits `"annotation:complete"`, which is already subscribed at line 314.

**Patterns to follow:**
- `TextEditMode` wiring at line 206 + teardown at line 350.
- Optional config callback wiring at lines 117-118.

**Test scenarios:**
- Integration — initializing the widget with a default config creates a pin mode that can be activated via the bus; emitting `pin:start` shows an overlay; clicking an element triggers `client.sendFeedback` with a payload whose `annotations[0]` has a populated `anchor` and `rect: {xPct:0, yPct:0, wPct:1, hPct:1}`.
- Integration — the sent `FeedbackPayload.annotations[0]` does NOT carry a `type` field (defaults to rectangle server-side), confirming shape parity with area mode.
- Integration — `config.onPinStart` and `config.onPinEnd` are called once each for a single pin session.
- Edge case — calling `instance.destroy()` while pin mode is active tears down the overlay without throwing.

**Verification:**
- Existing `launcher-integration.test.ts` suite still passes.
- New integration test asserts payload shape parity with a comparable area-mode test fixture.

---

- [ ] **Unit 7: Demo attribute + Playwright E2E**

**Goal:** Add a stable test hook to a heading in the demo and write one Playwright test that opens the FAB (pin is default), clicks the heading, fills the popup, submits, and asserts the feedback appears with an element-anchored annotation. Update the stale radial-item count assertion at `e2e/widget.spec.ts:109-113`.

**Requirements:** R8, R9

**Dependencies:** Units 5, 6

**Files:**
- Modify: `apps/demo/src/components/demo/demo-site.tsx` (or the nearest existing demo component that renders a top-level heading) — add `data-ccm-pin-target="true"` to one `<h1>` or `<h2>`.
- Modify: `e2e/widget.spec.ts` — update existing "shows 3 items" assertion to the new count (5 before this plan if that stale test had already been fixed for CCM-282, or 6 after this plan — verify during implementation against the actual current count in the tree), and add a new `test.describe("Pin mode", ...)` block.

**Approach:**
- Playwright test outline:
  1. `page.goto` the demo per existing `beforeEach`.
  2. `shadow(page).click(".sp-fab")` → wait for `.sp-radial-item--open`.
  3. Confirm the first visible radial item has `data-item-id="pin"`.
  4. `shadow(page).click('[data-item-id="pin"]')` (or press Enter, since pin is auto-focused).
  5. Wait for the pin toolbar to appear (a visible DOM sibling added to `document.body`, not inside the shadow root — same pattern as the area-mode test).
  6. Hover the element matching `[data-ccm-pin-target="true"]` — assert the element receives an inline `outline` style.
  7. Click the element. A comment popup appears (same popup DOM area-mode uses).
  8. Select a feedback type, fill the textarea, submit.
  9. Assert: `/api/feedback` received a POST with `annotations: [{ anchor: { cssSelector: matches heading, ... }, rect: {xPct:0, yPct:0, wPct:1, hPct:1}, type not set, ... }]`. Either use an in-memory store hook (like existing area-mode tests) or query the demo's list endpoint after submission.
  10. Additional smoke: after successful pin submission, re-open FAB, click `data-item-id="annotate"`, confirm area-mode overlay activates — proves area mode still works.
- Fix the stale assertion in `widget.spec.ts:113` from `toBe(3)` to the correct current item count after this plan ships (6). Note in the test message: "CCM-291: pin added as default".
- Keep the Escape-cancels-pin-mode check as a second, smaller E2E test or a unit test (Unit 3 already covers the state transition, so a dedicated E2E is optional; prefer unit coverage).

**Patterns to follow:**
- `e2e/widget.spec.ts` annotate-mode flow at lines 177-270 (activates overlay, fills popup, submits, verifies).
- The `shadow()` helper block at lines 22-86 for querying the shadow root.
- The existing `before/afterEach` reset route `GET /api/reset?projectName=...` at line 5.

**Test scenarios:**
- Happy path (E2E) — the pin-mode end-to-end test described above runs green on `bun run test:e2e`.
- Happy path (E2E) — opening the FAB shows 6 radial items (updated count).
- Happy path (E2E) — area mode flow still works after the default change (existing test in `widget.spec.ts:177-270` remains green).
- Edge case (E2E, optional) — pressing `Escape` while the pin overlay is active tears down the overlay without submitting any feedback.

**Verification:**
- `bun run build && bun run test:run && bun run test:e2e` all pass.
- The demo page at `/demo` exposes a stable `[data-ccm-pin-target="true"]` node for repeatable manual verification.

## System-Wide Impact

- **Interaction graph:** Pin mode plugs into the existing `annotation:complete` → `submitAnnotation` pipeline in `launcher.ts`. No new submission path. The popup is shared with `Annotator` (single instance, injected). Markers, panel refresh, and webhook dispatch are untouched.
- **Error propagation:** Submission errors follow the existing pipeline — `feedback:error` emits exactly as area mode does. Orphaned-asset logic (for `image_swap`) does not apply to pin.
- **State lifecycle risks:** The overlay temporarily locks `body.overflow`. If `PinMode` throws during `activate()`, `deactivate()` must still restore it. Use try/finally or mirror the existing Annotator teardown pattern.
- **API surface parity:** No change to `FeedbackPayload` or `AnnotationPayload`. Webhook contract unchanged. Adapter layer unchanged.
- **Integration coverage:** The new launcher integration test (Unit 6) proves the payload is shape-compatible with what area mode writes today — exercised at the level that unit-mocked generator calls can't.
- **Unchanged invariants:**
  - Area mode (`annotation:start` → Annotator) behavior is unchanged.
  - Text-edit and image-swap modes are unchanged.
  - The `submitting` flag in `launcher.ts` is the sole concurrency guard for submissions; pin does not introduce a second guard.
  - `AnnotationPayload.type` continues to default to `"rectangle"` when omitted (per `packages/core/src/types.ts:655-656`).
  - Prisma schema (`prisma/schema.prisma`) and `CCM_FEEDBACK_MODELS` (per `CLAUDE.md`) are not touched.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Hover outline flickers when the reviewer moves across densely nested elements | Use the same `text-edit-mode.ts` pattern of clearing the previous outline before applying a new one; only apply when the target element actually changes (reference check). |
| Users expect area mode to be default (muscle memory) | The ticket mandates pin as default. Address by keeping area visibly available in the FAB and matching the existing icon/tooltip conventions so the mode switch is discoverable. |
| `elementFromPoint` returns the widget host or shadow boundary on certain pages | `shouldIgnoreElement` already excludes host + descendants. Same filter used by text-edit and image-swap in production. |
| The extracted popup helper breaks the existing keyboard Enter path in Annotator | Covered by the existing `annotator.test.ts` keyboard-Enter assertions, which must continue to pass after the refactor. |
| Playwright test flakiness due to async outline application | Use `page.waitForFunction` to assert the inline `outline` style before clicking, matching the existing "wait for overlay" pattern. |
| FAB focus behavior changes when pin is prepended (first-focus invariant) | Assert first-focus in a unit test (`fab.test.ts`) and an E2E test. `fab.open()`'s current `firstItem.focus()` already respects DOM order. |

## Documentation / Operational Notes

- `CHANGELOG.md` — add an entry under the next release: `feat(widget): pin mode — click-to-anchor comments on DOM elements [CCM-291]`.
- `docs/spec.md` — if it enumerates widget modes, add pin under the list. (Scan during implementation; update if present.)
- No migrations. No webhook-contract change. No admin runbook change.
- Rollout is safe: feature is pure UI inside the widget bundle. No database or API surface affected.

## Sources & References

- Linear ticket: CCM-291
- Origin: feature description in the `/compound-engineering:ce-plan` invocation (no prior `docs/brainstorms/*-requirements.md` for this feature)
- Related code:
  - `packages/widget/src/annotator.ts` (helper extraction target; anchor helper usage at line 210)
  - `packages/widget/src/text-edit-mode.ts` (hover-overlay blueprint)
  - `packages/widget/src/image-swap-mode.ts` (second hover-overlay blueprint)
  - `packages/widget/src/fab.ts` (radial menu + item registration)
  - `packages/widget/src/launcher.ts` (mode wiring + submission pipeline)
  - `packages/widget/src/events.ts` (event bus typing)
  - `packages/widget/src/icons.ts` (icon registry)
  - `packages/widget/src/i18n/{en,fr,types}.ts` (label registry)
  - `packages/widget/src/popup.ts` (popup.show contract)
  - `packages/core/src/types.ts` (AnnotationPayload shape, optional default type)
  - `e2e/widget.spec.ts` (Playwright patterns)
- Related plans:
  - `docs/plans/2026-04-20-003-feat-ccm-282-annotation-intents-plan.md` (pattern precedent for text-edit + image-swap modes)

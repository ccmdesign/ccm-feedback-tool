# Feature spec: relocate pins + popover tweaks

Status: proposed · Scope: v1 · Owner: TBD ·
Baseline: branch `dev` after PRO-66 replies spec is in place (migrations
through `0005_repair_rls.sql`)

Three related changes that all touch `src/markers.ts` and the marker
popover surface. Specifying them together because they share the same
edit window, the same store contract extension, and the same realtime
path.

1. **Relocate**: click-and-hold a pin to enter drag mode, drop on a new
   target to re-anchor the comment.
2. **Scrollable popover**: long comment bodies (and reply threads, once
   PRO-66 lands) should scroll inside the popover instead of pushing it
   off-viewport.
3. **Status dropdown**: replace the cycle-on-click status pill with a
   proper dropdown so reviewers pick a status in one click instead of
   tab-cycling through three to get from `todo` to `question`.

## Goal

Make the three operations that currently require multiple awkward clicks
or are impossible today (relocate) feel like one obvious gesture each.
None of these change the data model in a way that breaks existing rows.

## Non-goals (v1)

- **No resize** of `area` markers via drag. Area drag = translation only
  (see below).
- **No multi-select / bulk move.** One marker at a time.
- **No keyboard-driven relocate** (arrow-keys to nudge). Mouse only.
- **No history / undo** of relocates beyond the standard
  `feedback:updated` event.
- **No conversion between kinds via the dropdown.** Kind is set at
  creation time (target / pin / area); the dropdown only flips
  `status`.

---

## 1. Relocate a pin (drag-drop re-anchor)

### Trigger

`mousedown` on a marker starts a watcher. Outcome decided by what
happens before `mouseup`:

| Gesture | Outcome |
|---|---|
| `mouseup` within 250 ms AND pointer moved < 6 px | Click — opens popover (current behavior). |
| Pointer moves ≥ 6 px in any direction before `mouseup` | Drag — enters relocate mode. The pending click is suppressed. |
| `mousedown` held > 250 ms with no movement | Drag — enters relocate mode (long-press affordance, matches mobile expectation). |

6 px is the same threshold the browser uses to distinguish click from
drag for native HTML5 drag, which matches reviewer muscle memory. 250 ms
is the long-press threshold reused from common UI libraries; keep it as
a named constant `DRAG_LONGPRESS_MS` next to `MARKER_SIZE`.

Cursor changes to `grab` on `mouseenter` of any marker, `grabbing`
once drag mode engages.

### Drag mode

Visually identical to `PinMode` (`src/pin-mode.ts`) but driven by the
existing marker rather than a new pin selection:

1. Insert a transparent full-viewport overlay (`position:fixed; inset:0;
   z-index: Z_INDEX_MAX - 1`) that captures `mousemove` / `mouseup`.
   Reuse the toolbar visual from `PinMode` with a different instruction
   string: `relocate.instruction = "Drop on a new target. ESC to
   cancel."`
2. On every `mousemove`:
   - `elementFromPoint(e.clientX, e.clientY)` after temporarily zeroing
     overlay `pointer-events` (same trick as `PinMode.onOverlayMouseMove`).
   - Apply the same outline + tag-name badge from `PinMode.applyHoverOutline`
     to the element underneath. Snapshot + restore inline outline
     priority on unhover (`PinMode` already handles this correctly —
     extract into `src/dom/hover-outline.ts` so both modes share it
     instead of duplicating the snapshot/restore dance).
   - Move the marker itself to follow the cursor as a "ghost" — set
     `entry.node.style.opacity = "0.75"` and update its
     `top`/`left` to the current cursor position. Skip the standard
     `clampX` clamp during drag so the marker can be over any pixel.
3. ESC or right-click cancels: restore the marker to its previous
   position by re-running `reposition()` for that one entry. No store
   write.
4. `mouseup` resolves the drop:
   - Element resolves (matches `PinMode`'s eligibility rules — not the
     widget host, not `<html>`/`<body>`, passes `shouldIgnoreElement`) →
     **target re-anchor** (see below).
   - Drop happens over the widget host, the document root, or an
     ignored element → **coord-only update** (see below).
   - Drop outside the viewport (shouldn't happen — overlay covers it,
     but defensive) → treat as cancel.

### What changes on drop

The drop algorithm is one decision: did we drop on an element we can
anchor to?

**Case A — re-anchor to new element.** Regardless of the comment's
original kind (`target` / `pin` / `area`):

1. `generateAnchor(element)` (already exists in `src/dom/anchor.ts`)
   produces fresh `cssSelector`, `xpath`, `textSnippet`, `elementTag`,
   `elementId`, `textPrefix`, `textSuffix`, `fingerprint`,
   `neighborText`.
2. Compute the drop point inside the element as a percentage:
   `xPct = (clientX - rect.left) / rect.width`,
   `yPct = (clientY - rect.top) / rect.height`. Use the actual drop
   coordinates, not the element center — reviewers expect the marker to
   land where they let go.
3. `wPct` / `hPct` reset to 0 (the marker is a point on the new element,
   not a region).
4. `kind = "target"`. `pinX/pinY/areaX/Y/W/H` cleared.
5. Persist via `store.updateAnchor(id, { kind, anchor, rect, pin: null,
   area: null })`.

**Case B — coord pin (no usable element under cursor).**

1. `kind = "pin"`, `pinX/pinY` = drop coordinates in **document** space
   (`clientX + scrollX`, `clientY + scrollY` — current pins live in
   document coords, see `reposition()` where `pinY` is read directly
   as a page-absolute `top`).
2. Anchor fields cleared to empty strings (`generateAnchor` not called).
3. `wPct = hPct = 0`. `areaX/Y/W/H` cleared.
4. Persist via the same `updateAnchor` call with the pin payload.

`area` markers always become `pin` or `target` on drop. An area
comment dragged anywhere loses its rectangle — translating the rectangle
intact is out of v1 scope; reviewers re-draw an area if they need one.
Call this out in the cancel toast / UI affordance is **not** worth the
complexity for v1, but document it in `docs/data-model.md` under "kind
transitions".

### Store contract

`AnnotationStore` gains one method, mirroring `updateStatus`:

```ts
export interface UpdateAnchorInput {
  kind: AnnotationKind;
  anchor: AnchorData;
  rect: RectData;
  /** Set only when kind === "pin". */
  pin?: { x: number; y: number } | null;
  /** Set only when kind === "area". v1 never produces this from drag. */
  area?: { x: number; y: number; w: number; h: number } | null;
}

export interface AnnotationStore {
  // …existing…
  updateAnchor?(id: string, input: UpdateAnchorInput): boolean;
}
```

Optional method (matches `updateStatus?` shape) so the field stays
backward-compatible with any future store impls.

#### `Store` (localStorage)

Straight field overwrite on the loaded record. Anchor fields all
overwritten verbatim from `input.anchor`. `xPct/yPct/wPct/hPct` from
`input.rect`. `kind` set. `pin` / `area` fields nulled out when not in
input, written when present. Persist.

#### `CloudStore` (Supabase)

`pushUpdate(id, patch)` already accepts `Partial<CloudRow>` (see
`src/cloud-store.ts:337`). Build the patch:

```ts
const patch: Partial<CloudRow> = {
  kind: input.kind,
  css_selector: input.anchor.cssSelector,
  xpath: input.anchor.xpath,
  text_snippet: input.anchor.textSnippet,
  element_tag: input.anchor.elementTag,
  element_id: input.anchor.elementId ?? null,
  text_prefix: input.anchor.textPrefix,
  text_suffix: input.anchor.textSuffix,
  fingerprint: input.anchor.fingerprint,
  neighbor_text: input.anchor.neighborText,
  x_pct: input.rect.xPct,
  y_pct: input.rect.yPct,
  w_pct: input.rect.wPct,
  h_pct: input.rect.hPct,
  pin_x: input.pin?.x ?? null,
  pin_y: input.pin?.y ?? null,
  area_x: input.area?.x ?? null,
  area_y: input.area?.y ?? null,
  area_w: input.area?.w ?? null,
  area_h: input.area?.h ?? null,
};
void this.pushUpdate(id, patch);
```

Optimistic cache mutation before the PATCH, same pattern as
`updateStatus`. PATCH no-op rows already log via the recent PRO-65 fix —
no new error handling needed.

#### Realtime

`pushUpdate` produces a PostgREST PATCH → Supabase emits an UPDATE on
the replication slot → the existing realtime subscription delivers
`onUpdate(row)`. That handler must:

- Find the cached record by id; replace the anchor/rect/kind/pin/area
  fields wholesale from the incoming row (status field still handled by
  its own path).
- Emit `feedback:updated` so the marker re-renders.
- Call `MarkerManager.refresh()` (or a finer-grained reposition for the
  one entry) so the marker moves on the other reviewer's screen.

Existing realtime UPDATE handling already covers `status`; verify it
forwards **all** non-status field changes, not just `status`. If it
currently short-circuits on `status` only, broaden it (small, isolated
edit in the realtime onUpdate handler).

### Migration

**None.** All target columns (`css_selector`, `xpath`, `pin_x`, etc.)
already exist (`0001_init.sql` + `0002_status_pin_area.sql`). No schema
change.

### Events

Reuse `feedback:updated[AnnotationRecord]` — the same event that fires
on status change. Host integrations get the full updated record and can
diff fields if they care which changed. No new bus surface.

### Edge cases

- **Drop on the same element.** Detect by comparing the resolved
  element identity (or fingerprint) to the entry's existing `anchorEl`
  → no-op, skip the store write, skip emitting `feedback:updated`. Saves
  a realtime round-trip when the reviewer "accidentally" drags and
  drops on the same target.
- **Drop on an element inside the widget's own shadow host.**
  `shouldIgnoreElement` already rejects this. Falls into Case B (coord
  pin) and lands at the drop coordinates. Acceptable but ugly —
  defensively, on Case B drops within the widget's host bounds, cancel
  instead.
- **Drop on an orphaned marker's parking lane element.** The right-edge
  parking lane (`reposition()` orphan path) has no DOM element behind
  it — `elementFromPoint` returns whatever real page element is under
  it. The drag operates against page DOM, not against other markers.
  Re-anchoring an orphan to a real element on the new page = exactly the
  reviewer's intent ("this is what I was trying to point at"). 
- **Drag during scroll.** The overlay covers the viewport but the user
  can wheel/trackpad-scroll the page underneath. Reposition the
  hover-outline on `scroll` events while drag is active, otherwise the
  outlined element drifts away from the cursor. Reuse the existing
  marker `scheduleReposition` debounce so we don't thrash.
- **SPA navigation during drag.** `popstate` / `pushState` mid-drag
  cancels drag (same as ESC) — the destination page has different DOM,
  and the original record's `path` would no longer match. Hook the
  existing `lastPath` check.
- **Touch / pointer events.** v1 = mouse only. Use `mousedown` /
  `mousemove` / `mouseup`. Touch devices fall back to the existing
  click-to-open behavior (no drag). Flag `pointerdown`/`pointermove`
  retrofit as a follow-up in `docs/plans/` if requested.
- **Drag a marker whose status is `done` while the drawer's Done filter
  is off.** Can't happen — markers with `status === "done"` are
  unmounted unless `setIncludeDone(true)` (see
  `MarkerManager.shouldRender`). Re-rendering after the store update
  preserves filter state.

---

## 2. Scrollable popover body

### Problem

The popover (`MarkerManager.openPopover`) has:
- Fixed `max-width:300px`, no `max-height`.
- A constant `POPOVER_NOMINAL_HEIGHT = 180` used only for the
  below-vs-above flip heuristic.
- A `body` div containing `record.message` with no scroll.

A 30-line comment renders as a 1000-px tall popover that overflows
viewport top and bottom. The same problem will hit the PRO-66 reply
thread once it lands.

### Fix

Make the popover itself a scroll container, and recompute the flip
threshold from the actual rendered height:

1. On the outer `pop` element: add
   `max-height: min(70vh, ${POPOVER_NOMINAL_HEIGHT * 3}px); overflow-y:
   auto;`. 70vh leaves comfortable space top + bottom; the
   `POPOVER_NOMINAL_HEIGHT * 3` cap stops the popover from growing
   absurdly tall on giant viewports.
2. Style the body div with `overflow-wrap: anywhere` (already has
   `word-break: break-word`) and keep `white-space: pre-wrap`. No body
   max-height — the outer container handles the scroll so one scrollbar
   covers body + (future) reply thread + composer.
3. Replace the placement logic that uses `POPOVER_NOMINAL_HEIGHT`:
   - Append `pop` to `document.body` with initial `top: -10000px` so
     the browser lays it out (measures real height) without flashing
     on-screen.
   - Read `pop.getBoundingClientRect().height` (which respects the
     `max-height` clamp), then run the flip / clamp logic with the real
     height. Only after computing `top`/`left` do we set them.
   - Remove `POPOVER_NOMINAL_HEIGHT` constant entirely.
4. Add a custom scrollbar style block (scoped to the popover so it
   doesn't leak to the host page):

   ```css
   .ccm-popover::-webkit-scrollbar { width: 6px; }
   .ccm-popover::-webkit-scrollbar-thumb {
     background: ${colors.glassBorder}; border-radius: 3px;
   }
   ```

   Inject once via the same pattern as the existing `ccm-marker-anim`
   style block. Add `class="ccm-popover"` to `pop`.

### Interaction with PRO-66 (replies)

PRO-66 (replies) already calls out this same change:
> "add `max-height` + `overflow-y:auto` to the popover and recompute the
> flip threshold from the actual rendered height instead of the 180
> constant."

**Land this change as part of whichever PR ships first.** If PRO-66 has
not yet merged when this spec is executed, do the popover-scroll work
here and PRO-66 inherits it. If PRO-66 has merged, this section is a
no-op — drop it from the implementation checklist.

### Edge cases

- Popover scrolled to bottom, new reply arrives via realtime → keep
  scroll pinned to bottom (`scrollTop = scrollHeight` after re-render)
  so the latest reply is visible. Only auto-scroll when already pinned
  to bottom; if the reviewer scrolled up to read history, leave their
  scroll position alone.
- Popover taller than viewport even at 70vh (e.g. mobile landscape on a
  small phone). Flip logic chooses whichever side has more room; the
  scrollbar handles the overflow.

---

## 3. Status dropdown

### Problem

`statusPill.addEventListener("click", () => this.cycleStatus(record))`
cycles through `todo → review → done → question → todo`. To go from
`todo` to `question` the reviewer clicks three times AND the popover
closes + reopens between each click (see `cycleStatus`: it calls
`closePopover()` then `refresh()`).

### Fix

Convert the pill into a dropdown trigger. The four statuses are listed
explicitly with their colors; reviewer clicks one; popover stays open.

#### Markup

Replace the single `statusPill` with a `<div role="combobox">` wrapper:

```
┌ [STATUS PILL ▾]  ← click toggles menu
│   ┌──────────────────┐
│   │ ● Todo           │
│   │ ● Review         │
│   │ ● Done           │
│   │ ● Question       │
│   └──────────────────┘
```

- Trigger button: same visual as the current pill (uses `STATUS_COLORS`
  for the current status background/border/fg). Append a small ▾
  caret glyph (or chevron SVG from `icons.ts` if one exists).
- `aria-haspopup="listbox"`, `aria-expanded` toggles, `aria-controls`
  points at the menu id.

#### Menu

- Positioned `absolute` immediately below the pill, inside the popover
  (so the popover's scroll container clips it correctly when the menu
  would overflow). `z-index` one above the popover content.
- Each option = a button with: a 10×10 colored dot (`STATUS_COLORS[s].border`),
  status label (`t(\`status.${s}\`)`), and a check icon if `s === current`.
- Hover state: `background: colors.glassBgHeavy`.
- Click handler:

  ```ts
  const onPick = (next: FeedbackStatus) => {
    if (next === current) { closeMenu(); return; }
    this.store.updateStatus?.(record.id, next);
    record.status = next;
    this.bus.emit("feedback:updated", record);
    // Re-render pill in place — do NOT close the popover.
    renderStatusPill(next);
    closeMenu();
    // Refresh the marker color underneath without closing popover.
    this.repositionAndRecolor(record.id);
  };
  ```

- Outside-click closes the menu only (popover-level outside-click
  closes the popover, as today).
- ESC closes menu first; if menu already closed, ESC closes popover
  (standard nested-popover behavior). Capture `keydown` on the
  dropdown's root and `stopPropagation()` when handled.

#### Why not a native `<select>`

Native is keyboard-accessible for free but:
- The visual mismatch with the existing glass pill is significant —
  the popover already uses styled-from-scratch UI throughout.
- The chevron / option dot styling needs custom rendering anyway.
- Keyboard accessibility on the custom version is straightforward:
  `role=listbox` on the menu, `role=option` on each item, `aria-selected`
  on the current one, Arrow Up/Down to navigate, Enter to select, Esc to
  close. Spec it, then implement.

Trade-off recorded: custom dropdown is ~30 LOC vs ~5 for a styled
`<select>`. The visual + interaction consistency is worth it for the
popover, which is the highest-touch surface in the widget.

### Refactor: replace `cycleStatus`

After the dropdown lands, `MarkerManager.cycleStatus()` has no callers.
Delete the method. The new path lives entirely inside the dropdown's
`onPick` handler. Don't keep `cycleStatus` as a "fallback" — there's no
caller and no test suite to worry about regressing.

`repositionAndRecolor(id)`: a new small helper that mutates the marker
node's `background` + `data-status` in place without tearing down the
popover. Avoids the current `closePopover() + refresh()` round trip
that destroys the popover the reviewer is mid-interaction with.

```ts
private repositionAndRecolor(id: string): void {
  const entry = this.entries.find((e) => e.record.id === id);
  if (!entry) return;
  const status = entry.record.status ?? "todo";
  const sc = STATUS_COLORS[status];
  entry.node.style.background = sc.border;
  entry.node.dataset.status = status;
  // Stop / start the question-pulse animation as needed.
  entry.node.style.animation =
    status === "question" ? "ccm-pulse 1.6s ease-in-out infinite" : "";
}
```

### Realtime

Existing `updateStatus` path is unchanged. Other reviewers receive the
UPDATE event and re-render their markers via the same mechanism. The
dropdown is purely a UI change on the originating tab.

### i18n (`src/i18n.ts`)

Add:

```ts
"marker.popover.statusAria": "Change status",
"marker.popover.statusMenuAria": "Statuses",
```

Status labels already exist (`status.todo`, `status.review`, etc.).

### Edge cases

- **Reviewer opens dropdown, status changes via realtime from another
  client.** The menu's "current" check moves under their cursor.
  Acceptable — they pick what they want; last write wins. (Optional
  enhancement: re-render the menu when the parent record updates; flag
  as nice-to-have, not v1.)
- **Status field unsupported by the store** (`updateStatus?` is
  optional). Hide the dropdown / fall back to read-only pill. Detect by
  `typeof this.store.updateStatus === "function"`.
- **Long status labels** in future locales. Menu min-width 140 px,
  text-overflow ellipsis at very long names. FR labels (`status.review`
  = "À vérifier") fit comfortably.

---

## Verification

No test suite. Before merge:

- `bun run check` + `bun run lint` clean.
- Manual relocate:
  - Drag a `target` marker, drop on a different element → marker re-anchors,
    page reload preserves new position, anchor data updated in
    localStorage / DB row.
  - Drag a `target` marker into empty space (e.g. `<body>` background)
    → becomes `pin`, persists across reload.
  - Drag a `pin` marker, drop on an element → becomes `target`,
    anchor populated, `pinX/pinY` cleared.
  - Drag a `pin` marker, drop in empty space → stays `pin`, new
    coords.
  - Drag an `area` marker → becomes `target` or `pin` per drop;
    `areaX/Y/W/H` cleared. Document the "area drag = lossy" behavior
    so reviewers aren't surprised.
  - ESC mid-drag → marker returns to original position, no store write,
    no realtime event.
  - Click without movement < 6 px → popover opens (no relocate).
  - Long-press > 250 ms without movement → drag mode engages
    (long-press path).
- Manual scrollable popover:
  - Comment with 50 lines of body text → popover height capped at 70vh,
    scrolls inside. Popover flip logic still chooses correct side when
    marker is near viewport edge.
  - Reply thread with 10 replies (post-PRO-66) → scrolls correctly.
- Manual status dropdown:
  - One click to flip `todo` → `question` directly. Popover stays open.
  - Marker color underneath updates without popover re-mount.
  - Realtime: open the same comment in two browsers, change status in
    one, the other's marker color updates and (if popover open)
    the pill updates.
- Cloud mode two-window test:
  - Window A drags marker, window B sees the marker move within
    realtime debounce window (≤ 1–2 s).
  - Window A opens dropdown and selects `done` → window B's marker
    disappears (subject to its Done filter state) or recolors.

---

## Implementation checklist

1. `src/dom/hover-outline.ts`: extract the outline + tag-badge
   snapshot/restore from `PinMode.applyHoverOutline` /
   `clearHoverOutline` into a small reusable helper. Update `PinMode`
   to call it. (Pure refactor — same behavior, no functional change.)
2. `src/types.ts`: no changes (all needed fields exist).
3. `src/store.ts`: add `UpdateAnchorInput`, `updateAnchor?` on
   `AnnotationStore`, implementation on `Store`.
4. `src/cloud-store.ts`: implement `updateAnchor` mirroring
   `updateStatus`. Broaden realtime `onUpdate` to apply all
   anchor/kind/pin/area columns from the incoming row (not just
   `status`).
5. `src/markers.ts`:
   - Replace `mousedown`/`mouseup`/`click` handling on each marker
     with a drag-or-click watcher governed by `DRAG_LONGPRESS_MS` and
     a 6-px move threshold.
   - Add `enterDragMode(entry, startEvent)` overlay/toolbar/ghost
     logic.
   - On drop: call `store.updateAnchor(...)`, emit `feedback:updated`,
     reposition the one entry.
   - Popover: add `class="ccm-popover"`, `max-height`/`overflow-y`,
     measure real height for flip logic. Remove `POPOVER_NOMINAL_HEIGHT`.
   - Replace `statusPill` cycle handler with the dropdown component
     (inline; small enough not to warrant a new file).
   - Delete `cycleStatus`. Add `repositionAndRecolor(id)`.
   - Inject the `.ccm-popover` scrollbar styles next to
     `#ccm-marker-anim`.
6. `src/i18n.ts`: add `relocate.instruction`, `relocate.cancel`,
   `marker.popover.statusAria`, `marker.popover.statusMenuAria`.
7. `src/events.ts`: no changes (reuse `feedback:updated`).
8. `docs/data-model.md`: document kind-transitions-on-drag
   (target ↔ pin, area → target/pin lossy).
9. `docs/architecture.md`: note that the drag overlay shares the
   hover-outline helper with `PinMode`.
10. Verify per above.

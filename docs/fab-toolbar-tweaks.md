# Feature spec: FAB + capture toolbar tweaks

Status: proposed · Scope: v1 · Owner: TBD ·
Baseline: branch `dev` after PRO-67 marker/popover changes. Item #6
(drawer card status change) reuses the status dropdown component
introduced by PRO-67, so PRO-67 must land first or extract the
dropdown into a shared module as part of this work.

Eight related changes to the FAB radial menu, the in-mode capture
toolbars, the navigator drawer, the marker layer's collision
behavior, and comment identity.

1. **Double-click FAB opens the navigator drawer.** Remove the
   `navigator` (chat icon) radial item — the gesture replaces it.
2. **FAB shifts left when the drawer is open.** The radial fan today
   sits under the open drawer's panel and the buttons are unreachable.
3. **Eye (annotations toggle) moves from the FAB radial to the
   in-mode capture toolbar.** Visibility is a marker-layer concern,
   not a FAB concern.
4. **Capture mode buttons (target / pin / area) do not close the FAB
   radial on click.** Reviewer can drop multiple comments in sequence
   without re-opening the menu each time.
5. **Two count badges on the FAB**: yellow = todo count, blue = review
   count. Replaces today's single total-count badge.
6. **Drawer cards expose the status dropdown.** Each card's status
   badge becomes the same dropdown trigger used in the marker popover
   (PRO-67), so reviewers can sweep through the drawer changing
   statuses without jumping out to each marker individually.
7. **Fan-out colocated pins.** When multiple markers land on the same
   spot, lay them out side-by-side so every pin stays clickable. No
   marker is hidden behind another.
8. **Persistent comment sequence numbers per project.** Each comment
   gets a stable number assigned at create time, monotonically
   increasing for the project's full history. `done` items count
   toward the running total — if a project has 57 done + 4 review + 9
   todo = 70 comments, the next one is #71. Deleting a comment does
   not free its number.

## Goal

Cut a multi-click loop down to one gesture for the common reviewer
workflows: opening the drawer, dropping a stream of comments, and
seeing what still needs attention at a glance.

## Non-goals (v1)

- **No drag-to-reorder** of radial items.
- **No persistence** of FAB position (after the drawer-shift, FAB
  always returns to the bottom-right anchor on drawer close).
- **No new mode entries** in the capture toolbar. The eye sits next
  to the existing `Cancel` button; no other restructure.
- **No badge styling theme override** for hosts. Yellow + blue are
  hardcoded against `STATUS_COLORS.todo` / `STATUS_COLORS.review`.

---

## 1. Double-click FAB opens the drawer

### Current behavior

`Fab` already handles double-click — `dblclick` calls `openAll()` which
opens the full radial (up + left items). The navigator opens via a
single-click on the `navigator` radial item, which fires
`bus.emit("navigator:open")` → `drawer.open()` (see `index.ts:132`).

### Change

- `dblclick` on the FAB → `bus.emit("navigator:open")` instead of
  `openAll()`. Drawer opens directly, radial does **not** expand.
- Single-click on the FAB still does `toggle()` — opens / closes the
  radial in `"up"` mode. (The full `"all"` mode is currently only
  reachable via the dblclick gesture we're repurposing — remove `"all"`
  + `openAll()` + the `direction: "left"` slot logic, and put the
  three currently-`left` items (`export`, `copyUrl`, `clear`) into the
  `"up"` radial alongside the others. Six items in one fan is fine.)
- Remove the `navigator` radial item entirely. `ICON_CHAT` import goes
  with it; if no other file imports it, drop from `icons.ts`. (Verify
  with grep before deleting.)

### Click vs double-click disambiguation

`Fab` today gates single-click with `if (e.detail >= 2) return;` so
double-clicks don't double-fire the toggle. Keep that gate. The
default browser double-click delay (~500 ms) is fine — no custom
threshold. The brief radial-flash on first click is the standard
"undo me with a second click" affordance.

### Bus / events

No new events. `navigator:open` already exists.

---

## 2. FAB shifts left when drawer opens

### Problem

`.sp-panel` is `position: fixed; right: 0; width: 400px;` (`styles/base.ts:235`).
`.sp-fab--bottom-right` is `bottom: 24px; right: 24px;`. With the
drawer open, the FAB and its radial fan render under the drawer panel
and become unclickable.

### Fix

- Add a CSS modifier class `.sp-fab--drawer-open` that sets
  `right: calc(400px + 24px);`. On screens ≤ 480 px (where the panel is
  `width: 100vw`) the modifier sets `right: 100vw`, effectively pushing
  the FAB off-screen — match the existing media query by hiding the
  FAB entirely with `display: none` instead. Reviewer uses the drawer
  to navigate in the narrow-viewport case.
- `Fab` exposes `setDrawerOpen(open: boolean)` that toggles the
  modifier class on `this.fab` (and the radial container — the radial
  uses `.sp-radial--bottom-right` and shares the same anchor).
- Drawer wires it: `index.ts` already has `bus.on("navigator:open",
  () => drawer.open())`. Add a `drawer:opened` / `drawer:closed`
  event pair (or pass `fab` into `Drawer` constructor — flag the
  trade-off). Bus events are the more loosely-coupled choice; use those.
- Transition: animate via `transition: right 0.25s ease;` on
  `.sp-fab--bottom-right` so the shift feels intentional, not
  teleporting. Match the drawer's slide-in timing if it differs (check
  `styles/animations.ts:119` for the `.sp-panel` transition; align
  curves and durations).

### Events (`src/events.ts`)

```ts
"drawer:opened": [];
"drawer:closed": [];
```

`Drawer.open()` emits `drawer:opened`, `Drawer.close()` emits
`drawer:closed`. `Fab` subscribes to both and calls
`setDrawerOpen(true|false)`.

### Edge cases

- Drawer opened, host resizes viewport below 480 px → media query
  hides FAB, no JS change needed (the class is still applied).
- Drawer closed mid-transition → snap back to default anchor; the
  `transition: right` covers the visual smoothness.
- Custom panel widths (future) → make `400px` a CSS custom property
  (`--sp-panel-width`) shared between `.sp-panel` and the FAB shift.
  Spec it as a one-line refactor (current `400px` literal stays the
  default value).

---

## 3. Eye toggle moves to the capture toolbar

### Problem

The eye (annotations on/off) is the only FAB radial item that toggles
state rather than entering a mode. It's also useful **during** a
capture mode (e.g. reviewer wants to hide existing markers while
placing a new one) — but today the FAB radial collapses when a mode
activates, so the toggle is unreachable until you cancel.

### Fix

- Remove the `toggle` item from `Fab.items`. `ICON_EYE` / `ICON_EYE_OFF`
  imports stay (the toolbar uses them).
- The three capture modes — `PinMode`, `AreaMode`, target-pick — each
  render their own fixed top toolbar (see `src/pin-mode.ts` `this.toolbar`
  in `activate()` and the same pattern in `src/capture-modes.ts`). Add
  an "eye" button to each toolbar, between the instruction text and
  the cancel button.
- The eye button reflects + mutates the same `annotationsVisible`
  state the FAB used to own. Move that state into a single place
  reachable by all three modes — simplest is the bus:
  - New event `annotations:state` (no payload) → all consumers
    publish; subscribers reply. Too clever.
  - Simpler: read current state from `MarkerManager.visible` getter
    (add one) and emit `annotations:toggle` with the inverted value
    on click. Three lines per toolbar.
- The toolbar eye is the **only** place to toggle visibility in v1.
  When no capture mode is active, visibility cannot be changed —
  document this in `docs/architecture.md`. (If reviewers complain
  it's hidden, follow-up spec adds a keyboard shortcut.)

### Trade-off

The eye-only-in-toolbars rule means "hide everything to see the page
naked" is no longer a one-click action when *not* in a capture mode.
Two-click cost: enter pin mode, click eye, ESC to cancel mode. If this
turns out to be daily-driver behavior, move the eye to the always-on
FAB visible state (top-right of the FAB itself, outside the radial) in
v2. Recording the decision here.

---

## 4. Capture mode click does not close the FAB radial

### Current behavior

`Fab.handleItemClick(id)` calls `this.close()` for every id, including
`target`, `pin`, `area`. The reviewer has to re-open the radial after
each comment.

### Fix

- Move the `this.close()` call out of the top of `handleItemClick`
  and into per-case branches.
- For `target`, `pin`, `area`: do **not** close. The radial stays
  open behind the mode toolbar/overlay. When the mode finishes
  (`target:end` / `pin:end` / `area:end` bus events, all already
  exist), the radial is still open and the next click can drop
  another comment.
- For `toggle` (now removed), `export`, `copyUrl`, `clear`: still
  close — these are one-shot terminal actions.
- `navigator` is removed; no decision needed.

### Visual conflict during capture mode

`PinMode.activate()` (and the area / target equivalents) render a
fixed overlay at `z-index: Z_INDEX_MAX - 1`. The FAB's z-index is
inherited from the widget shadow host — verify it sits *above* the
overlay so the radial stays clickable. If not, bump the FAB's
container z-index to `Z_INDEX_MAX` while a mode is active and restore
on `*:end`. Same `setDrawerOpen` pattern — `setModeActive(active:
boolean)` on `Fab`.

The mode toolbars (top bar) currently don't conflict with the FAB
visually (top vs bottom), but the **mode overlay** swallows pointer
events. Concretely:

- Overlay covers entire viewport including the FAB area.
- The FAB host is inside the widget shadow root; the overlay is a
  sibling appended to `document.body`. Pointer-events on the overlay
  block clicks behind it.
- Either (a) exclude a circular hit-area around the FAB from the
  overlay (clip-path donut) or (b) raise the FAB host to z-index
  *above* the overlay. (b) is simpler — go with it. The overlay's
  `pointer-events: auto` is bypassed because z-index stacking puts the
  FAB on top.

### Edge cases

- Reviewer in pin mode, opens drawer via double-click on FAB → drawer
  opens, capture mode persists. Capture toolbar still visible on top.
  Acceptable, but ugly. Decide at implementation time whether
  `drawer:opened` should cancel any active capture mode (emit
  `*:end`). Recommend yes — drawer + active capture mode = visual
  confusion.
- Reviewer drops a comment, popup submits successfully — the radial
  still open. Re-clicking the same mode immediately works (same
  `target:start` / `pin:start` / `area:start` bus emit, the mode's
  `activate()` short-circuits if already active — verify
  `if (this.isActive) return;` guard in each mode; it's there).

---

## 5. Two count badges on the FAB

### Problem

Single badge = total annotations on this page. Not actionable —
reviewer wants "is there work left for me?" which is `todo + review`,
not the total. `done` items in the count are noise.

### Fix

Replace `Fab.updateCount(count: number)` with `updateCounts(counts:
{ todo: number; review: number })`. The FAB renders **up to two**
small badges:

- Yellow (`STATUS_COLORS.todo`) badge: top-right of FAB, current
  position of the existing single badge. Shows `todo` count. Hidden
  when zero.
- Blue (`STATUS_COLORS.review`) badge: top-left of FAB. Shows `review`
  count. Hidden when zero.

(Hex / token sources — pull from `STATUS_COLORS` so any future palette
change carries through. The `border` color in `STATUS_COLORS[status]`
is the canonical chip color.)

Both badges:
- Same dimensions / typography as today's single badge
  (`.sp-fab-badge`).
- `99+` cap unchanged.
- `aria-live: polite`. Combine both into one
  `aria-label="3 todo, 1 review"` rather than two separate live
  regions screaming at once.

Implementation:

- `MarkerManager` (or a small new `Counts` helper in `store.ts`)
  computes `{ todo, review }` for the current path from
  `store.listForPath(location.pathname)`. Excludes records where
  `parentId` is set (replies — see PRO-66) and any other
  non-actionable status.
- `index.ts` already calls `fab.updateCount(store.list().length)` in
  several spots. Replace with `fab.updateCounts(computeCounts())`.
- Hooks that previously triggered `updateCount`: `feedback:created`,
  `feedback:updated` (status changes!), `feedback:deleted`, store
  init. All of these already exist; just swap the call site.

### Visual

Two badges fit comfortably around a 56-px FAB:

```
   [B]──────[Y]      ← blue top-left, yellow top-right
    │  FAB  │
    │       │
    └───────┘
```

Each badge is ~20 px wide minimum (matches `.sp-fab-badge`). Tested
mentally — no overlap with the FAB icon at the center.

### Edge cases

- Path with no annotations → no badges. FAB looks clean.
- 100+ todos and 100+ reviews → both show `99+`. Acceptable.
- `done` count → not shown anywhere on the FAB. Drawer still surfaces
  it via the filter chip; that's the right place.
- `question` count → not shown on FAB in v1. If question backlog grows
  large in practice, add a third badge (orange) in v2.

---

## 6. Drawer card status change

### Problem

Drawer is read-only today (`drawer.ts:26` comment: "View + navigate
only — no editing or status changes here."). To change a comment from
`todo` → `review`, the reviewer must:

1. Click the card → page scrolls + marker flashes
2. Click the marker → popover opens
3. Click the status pill (PRO-67 dropdown) → pick new status
4. Repeat per card

For a triage pass through 20 comments, that's 60+ clicks. The drawer
already shows the status badge on every card; it should be a
one-click affordance to change it.

### Fix

Promote the card's status badge into the **same status dropdown
component** used in the marker popover (PRO-67 section 3). One
implementation, two call sites.

#### Component extraction (depends on PRO-67)

PRO-67 specs the dropdown inline inside `MarkerManager.openPopover`.
For this ticket, that dropdown must be a standalone component:

```
src/status-dropdown.ts
  export function buildStatusDropdown({
    current: FeedbackStatus,
    onPick: (next: FeedbackStatus) => void,
    colors: ThemeColors,
    t: TFunction,
  }): HTMLElement
```

The returned element is the trigger pill; it owns its own menu
overlay, keyboard nav, outside-click-to-close, ESC handling. Both
`markers.ts` and `drawer.ts` consume the same factory.

If PRO-67 has already landed with the dropdown inlined, the first
step of this work is the extract refactor (pure move; no behavior
change). Verify the popover dropdown still works identically before
wiring the drawer call site.

#### Drawer integration (`src/drawer.ts`)

- `buildCard` currently renders the status as a passive `sp-badge`
  span (line 334–338). Replace with `buildStatusDropdown(...)`.
- `onPick` handler:

  ```ts
  const onPick = (next: FeedbackStatus) => {
    if (next === record.status) return;
    this.store.updateStatus?.(record.id, next);
    record.status = next;
    this.bus.emit("feedback:updated", record);
    // Re-render only this card so the badge color + filter membership
    // refresh in place. If the card no longer matches the current
    // filter (e.g. todo → done), animate it out instead of full re-render.
    this.render();
  };
  ```

- **Card click vs dropdown click**. The card itself is a `<button>`
  that jumps to the marker on click. The dropdown is inside that
  button — clicks on the dropdown trigger / menu items must
  `stopPropagation()` so they don't also fire the card-jump. The
  marker popover dropdown already does this; the extracted component
  carries the same behavior.
- **Filter membership change.** Changing a card's status from `todo`
  → `review` while the drawer filter is `todo` means the card no
  longer belongs in the list. Re-render: card disappears. Acceptable
  in v1 — no fade-out animation, no "undo" toast. Document the snap
  behavior.
- **Cross-page rows.** Cards under "Other pages" are now also
  status-editable. The status field is page-independent, so no extra
  logic needed. Reviewer triages without leaving the current page.

#### Marker layer sync

When the drawer changes a status, the marker layer must:
- Re-color the corresponding marker (use the new
  `repositionAndRecolor(id)` helper introduced in PRO-67).
- Filter the marker in/out per `setIncludeDone` if status crosses
  the `done` boundary while the drawer's filter is not `done`.

The `feedback:updated` event already drives this. Verify the index.ts
subscriber path calls `markers.refresh()` or
`markers.repositionAndRecolor(id)` on update. If currently a full
refresh, downgrade to per-id where possible.

#### Realtime

Other reviewers receive the UPDATE via realtime, their drawer's
`refreshIfOpen()` already fires on `feedback:updated`, so their card
re-renders with the new status. No new realtime work.

### Edge cases

- Reviewer opens dropdown on a drawer card, status changes from
  another tab via realtime → menu's "current" check moves. Same
  trade-off as PRO-67 popover dropdown. Acceptable.
- Reviewer changes the card's status while the marker popover for
  the same comment is open (popover and drawer both open simultaneously
  is possible). The popover's pill must reflect the new status —
  subscribe the popover render to `feedback:updated` for `record.id`
  and re-render its pill in place. PRO-67 specs this for the
  dropdown side; same hook covers drawer-driven updates.
- Reviewer fast-double-picks a status while a previous PATCH is
  in-flight (cloud mode). Optimistic local update + fire-and-forget
  PATCH matches `updateStatus` today; last write wins on the server.
  No new safeguard.
- Drawer card for a comment whose `updateStatus` is not supported by
  the store (impossible in practice — both Store impls implement it,
  but type-system-wise it's optional). Fall back to a read-only
  badge with `aria-disabled` and a tooltip. Detect via
  `typeof this.store.updateStatus === "function"`.

---

## 7. Fan-out colocated pins

### Problem

`MarkerManager.reposition()` (`src/markers.ts:457`) places every marker
at the exact coordinate its anchor / pin / area dictates. When N
markers resolve to the same anchor element (or land within a few pixels
of each other for coord pins), they stack on top of one another. The
top-of-stack marker eats all clicks; the buried markers are
unreachable until their sibling is deleted or moved.

This is a common case in practice: reviewers leaving multiple comments
on the same heading, button, hero image, or empty-state component.

### Fix

After every entry's "natural" position is computed in `reposition()`,
run a second pass that detects overlapping clusters and offsets each
cluster member along the horizontal axis so they sit side by side.

#### Algorithm

After the existing kind-specific positioning block (the loop that sets
`entry.node.style.top` / `style.left` for each entry):

1. Build a list of `{ entry, x, y }` triples in render order (which
   today is store order — newest first because `addOne` unshifts).
2. For each pair, treat two markers as colliding when their centers
   are within `COLLISION_RADIUS = MARKER_SIZE` pixels of each other
   (square / Chebyshev distance is fine — markers are circles inside
   a square box). Union-find the pairs into clusters.
3. For each cluster of size N > 1:
   - Sort members by `createdAt` ascending (oldest leftmost — gives
     the cluster a stable visual order across reloads).
   - Use the cluster's mean center as the cluster anchor (`cx`, `cy`).
     Falling back to the first member's position is fine; pick mean
     for fairness when sizes differ.
   - Lay members at `cy` (same row) and
     `cx + (i - (N - 1) / 2) * (MARKER_SIZE + GAP)` for i in 0..N-1,
     where `GAP = 4`. This centers the row on the cluster anchor.
   - Clamp the entire row inside the viewport via the existing
     `clampX` so the rightmost member doesn't fall off the edge.
     If clamping happens, shift the whole row leftward by the
     overshoot so spacing inside the row stays even.
4. Decorate each clustered marker with `dataset.clusterSize = String(N)`
   and `dataset.clusterIndex = String(i)` so future styling (e.g. a
   small connecting line on hover) can latch on. Non-clustered markers
   leave the attributes unset.

Numbers (`#1`, `#2`, ...) still match store order (the existing
`renumber()` path is untouched). The cluster ordering only affects
visual placement, not the label digits.

#### Why side-by-side, not stack-with-indicator

Considered: render the top-of-stack normally, show a small "+N" badge,
expand-on-hover. Rejected for v1 because:
- The reviewer's mental model already treats every comment as a
  first-class clickable thing. Hiding N-1 of them behind a badge
  breaks scannability.
- Hover-to-expand doesn't work for touch.
- Side-by-side is one screen of layout code; the cluster/expand UI is
  a small component plus animation timing.

If clusters routinely exceed ~6 members in practice, revisit with a
"+N overflow" affordance in v2.

#### Interaction with PRO-67 drag-relocate

PRO-67 lets reviewers drag a marker to re-anchor. When the dragged
marker is dropped onto an element that already has markers attached
(or onto a coord near existing pins), the existing markers get a new
cluster mate. The fan-out pass runs on the next `reposition()` so the
group lays out automatically — no special-case code in the drag path.
Document the cross-spec interaction in `docs/architecture.md`.

#### Interaction with right-edge orphan lane

`reposition()` already parks target-kind markers with unresolved
anchors along the right viewport edge, stacked vertically. That's a
different stacking mode (vertical, intentional, single column) and the
fan-out logic must skip orphan entries — clustering them horizontally
would defeat the "always reachable on the edge" rule. Gate the
fan-out pass with `entry.node.dataset.orphan === "false"`.

#### Interaction with area markers

`area` markers position at `(areaX + areaW, areaY)` — the top-right
corner of the captured area. Two area markers with overlapping rects
will produce overlapping markers, exactly the same collision case as
pin/target. Fan-out treats them identically; no special area-kind
branch.

### Edge cases

- **Three markers, A at (100, 100), B at (110, 105), C at (130, 100).**
  AB collide (10 px apart) → cluster. BC collide (~20 px apart) →
  also within `COLLISION_RADIUS = 26`. Union-find groups all three.
  Lay out at mean center, side by side. Acceptable.
- **Marker added live via `addOne(record)`.** `addOne` already calls
  `reposition()` at the end — the fan-out pass runs and re-clusters
  with the new entry. No targeted "add to cluster" path needed.
- **Marker deleted while in a cluster.** `refresh()` rebuilds the
  entry list and re-runs `reposition()`, which re-runs fan-out. The
  remaining cluster siblings shift back toward center.
- **Cluster spans the viewport edge.** Right-edge clamp shifts the
  whole row leftward; left-edge case is symmetrical. Cluster never
  splits across the edge.
- **Marker count exceeds ~10 at one spot.** Row gets very long. The
  `clampX` shift compresses it from the edge; the leftmost members
  may push off-screen left. Accept in v1 — the upstream "+N
  overflow" affordance is the right fix when this stops being an
  edge case.
- **Drawer jump (`scrollToAndFlash`) lands on a clustered marker.**
  The flash still hits the right node (we have its entry directly,
  not a position-based lookup). Acceptable.
- **Marker drag while inside a cluster.** PRO-67 drag detaches the
  marker visually (ghost follows cursor); the remaining cluster
  re-flows during the next `reposition()` triggered by drop. ESC
  cancel: drag returns the marker to its previous cluster slot via
  the cluster re-run.

### Constants

Add to the top of `src/markers.ts`:

```ts
const COLLISION_RADIUS = MARKER_SIZE; // 26 px — center-to-center cutoff
const CLUSTER_GAP = 4;                // px between marker edges in a row
```

### Verification (delta from PRO-68 main verification)

- Add 3 markers on the same `<h1>` element — they render side-by-side,
  all clickable. Click each, popover for the right one opens.
- Add 5 markers on the same hero image — row of 5, centered on the
  natural anchor point. Clamp test: trigger near the right edge,
  whole row shifts left, no marker off-screen.
- Add a marker on top of an existing one (drop a pin at the same coord
  as an existing one): both visible side-by-side after drop.
- Cloud realtime: window A drops a 4th marker at the same anchor as 3
  existing ones in window B → window B's cluster re-flows to a 4-wide
  row.

---

## 8. Persistent comment sequence numbers

### Problem

Today both `MarkerManager.buildMarker` and `Drawer.buildCard` derive a
display number from the **render order** of the current entries list
(`markers.ts:271` `buildMarker(record, idx + 1)`,
`markers.ts:309` `renumber()`, `drawer.ts:333` `setText(num,
\`#${number}\`)`). Consequences:

- Numbers shift every time a comment is added, deleted, or filtered.
  "Comment #5" today is "Comment #4" tomorrow if anything earlier is
  deleted.
- Marker numbers and drawer card numbers can drift apart (different
  filtering rules).
- "I'm looking at issue #12" is meaningless across reviewers — each
  client computes its own number from its own render order.
- Cross-page references break — the drawer numbers cards across pages,
  the marker layer numbers only the current page.

Reviewers want comment identity. "#71" should mean the same record
forever, for every client, regardless of what's been deleted, what
filter is active, or whether other comments share its anchor.

### Fix

Add a new persisted field `sequenceNumber: number` on
`AnnotationRecord`. Assigned exactly once at create time. Scope =
`projectName`. Monotonic. Never reused.

Counting rule (matches user's stated example: 57 done + 4 review + 9
todo = 70 → next is #71):
- All top-level comments (no `parentId`) count toward the sequence,
  regardless of status.
- Replies (`parentId` set) do **not** consume sequence numbers.
- Deleted comments still consume their number — the next insert always
  uses `max(existing) + 1`, not the smallest unused integer.

### Data model

#### Type change (`src/types.ts`)

```ts
export interface AnnotationRecord extends AnchorData, RectData {
  // …existing…
  /**
   * Project-scoped monotonic identifier. Assigned at create time, never
   * reused. Counts toward the project's sequence iff `parentId` is not
   * set (replies don't get a number). Optional for read-tolerance with
   * pre-migration localStorage data; required on every record written
   * by current code.
   */
  sequenceNumber?: number;
}
```

`?` keeps decoding tolerant of stale localStorage rows from before the
migration. Display falls back to `record.id.slice(0, 6)` (or `?`) for
any record missing the field — happens only during the one-time client
upgrade.

### Cloud migration

`supabase/migrations/0006_sequence_number.sql`:

```sql
alter table public.ccm_widget_annotations
  add column if not exists sequence_number bigint;

-- Backfill: number existing rows per project by creation order. Replies
-- are excluded from the sequence — their `sequence_number` stays NULL.
with ordered as (
  select id,
         row_number() over (
           partition by project_name
           order by created_at, id
         ) as seq
  from public.ccm_widget_annotations
  where parent_id is null
)
update public.ccm_widget_annotations a
  set sequence_number = o.seq
  from ordered o
  where a.id = o.id;

create index if not exists ccm_widget_annotations_project_seq_idx
  on public.ccm_widget_annotations (project_name, sequence_number);

-- BEFORE INSERT trigger: atomically assign next sequence number per
-- project. Skipped for replies (parent_id is not null). Race-safe via
-- the implicit row lock on the max() read inside the trigger body —
-- Postgres serializes concurrent inserts on the same project.
create or replace function public.ccm_widget_assign_sequence()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    return new;
  end if;
  if new.sequence_number is null then
    select coalesce(max(sequence_number), 0) + 1
      into new.sequence_number
      from public.ccm_widget_annotations
      where project_name = new.project_name
        and parent_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists ccm_widget_assign_sequence_trg
  on public.ccm_widget_annotations;
create trigger ccm_widget_assign_sequence_trg
  before insert on public.ccm_widget_annotations
  for each row execute function public.ccm_widget_assign_sequence();
```

Notes:
- `max() + 1` under a BEFORE INSERT trigger relies on Postgres'
  default behavior of serializing writes that conflict on the same
  index range. For the volumes this widget targets (≤ hundreds of
  comments per project, single-digit concurrent reviewers), the
  trigger is sufficient without an explicit advisory lock. If we
  ever see duplicate sequence numbers in the wild, switch to
  `pg_advisory_xact_lock(hashtext(project_name))` inside the
  function.
- Existing RLS policies (`using (true)`) cover the new column with no
  change.
- REPLICA IDENTITY FULL (migration 0003) means the new column
  participates in realtime UPDATE payloads automatically.

Self-hosters: add `0006` to `scripts/apply-migrations.sh`,
`docs/self-hosting.md`, `docs/cloud-mode.md`. Run after 0001–0005.

### Store contract

#### `Store` (localStorage)

`buildRecord` assigns `sequenceNumber` at save time:

```ts
export function buildRecord(input: SaveInput, existing: AnnotationRecord[]): AnnotationRecord {
  const maxSeq = existing.reduce(
    (m, r) => (r.parentId ? m : Math.max(m, r.sequenceNumber ?? 0)),
    0,
  );
  const record: AnnotationRecord = {
    // …existing fields…
    sequenceNumber: maxSeq + 1,
  };
  // …rest unchanged…
}
```

`Store.save(input)` already has the loaded array in hand — pass it
through. Same for the cloud store's `save`, which builds the record
locally before push (the trigger will overwrite `sequence_number` on
the server but the optimistic UI rendering uses the local guess; in
practice both will match because the client is the only writer).

#### `CloudStore` (Supabase)

Two options for the optimistic local value:
1. Compute `max(cache) + 1` client-side (matches localStorage path,
   may briefly mismatch the server's authoritative value if two
   reviewers write concurrently).
2. Insert with `sequenceNumber = null` and rely on the trigger to
   set it; await the response and patch the cache.

Pick (1) for v1 — the existing `pushInsert` is fire-and-forget,
matching the new behavior. If a concurrent insert assigned the same
number to a different record, the realtime UPDATE / INSERT from the
peer client carries the real values; reconcile by trusting the server
on `id` match (already the existing pattern in `onInsert`).

Document the trade-off in `docs/architecture.md` under "sequence
number race window".

#### Reply records

`buildReplyRecord` (PRO-66) does **not** assign `sequenceNumber`. The
field stays undefined. Reply ingestion in `apply-ccm-feedback` already
skips reply rows as standalone work items — no display number needed.

### Backfill of pre-migration localStorage data

When `Store` loads on init, scan the array. Any top-level record (no
`parentId`) missing `sequenceNumber` gets one assigned in
`createdAt` order, then the array is persisted. One-time pass; idempotent.

```ts
function backfillSequenceNumbers(items: AnnotationRecord[]): boolean {
  const tops = items.filter(r => !r.parentId);
  if (tops.every(r => typeof r.sequenceNumber === "number")) return false;
  tops
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((r, i) => {
      if (typeof r.sequenceNumber !== "number") r.sequenceNumber = i + 1;
    });
  // Rewrite any numbered tops with their backfilled index too? No —
  // only fill missing values, preserve existing numbers.
  return true;
}
```

Run on `Store` construction; persist if it returned true.

### Render

#### Marker (`src/markers.ts`)

- `buildMarker(record)` reads `record.sequenceNumber` instead of taking
  an index parameter. Display the number directly. Fallback for legacy
  rows: `?` or `record.id.slice(0, 6)`.
- Delete the `renumber()` method and every call site. Numbers are
  immutable once assigned — no re-numbering ever.
- The `addOne` path simplifies: no `renumber()` call.
- `refresh()` no longer passes `idx + 1` — drop the index.
- `marker.ariaLabel` interpolation still receives the same `{ n }`
  parameter; pass `record.sequenceNumber`.

#### Drawer (`src/drawer.ts`)

- `buildCard(record)` drops its `number: number` parameter. Read from
  `record.sequenceNumber`.
- The `render()` loop that maintains `let n = 0; ++n` for card
  numbering is deleted. Cards display whatever number the record was
  born with, regardless of filter or grouping.
- "This page" and "Other pages" sections show their respective records
  in `createdAt` desc order (existing sort) but the visible number is
  the persisted one, not a render-index. So a current-page card might
  read `#47` followed by `#12` followed by `#71` — correct, because
  those are the canonical identifiers.

### Cross-cutting

- **Export** (`src/export-utils.ts`): the dumped JSON already includes
  the full record — `sequenceNumber` rides along. Consumers
  (`apply-ccm-feedback` skill, `scripts/feedback.ts`) gain a stable
  reference for cross-message identity ("see #71" in a follow-up
  comment is now traceable).
- **`apply-ccm-feedback` skill**: when reading comments from the
  export payload, prefer `record.sequenceNumber` over the array index
  for any human-facing reference. Update the SKILL.md doc.
- **Realtime INSERT**: `onInsert` for a peer-created comment carries
  the server-assigned `sequence_number`. Cache the row as-is; markers
  re-render with that number. No client-side reconciliation needed.

### Claude resolves "comment #N" by sequence number

The whole point of persistent identifiers is that a reviewer can say
"let's work on comment 67" in chat and Claude lands on exactly the
right row. Three places need updating to make that work:

#### 1. `scripts/feedback.ts` accepts `#N` everywhere a UUID is taken

Today `get <id>` / `set-status <id> ...` / `delete <id>` take a UUID.
Extend each to also accept:
- `#67` (with the hash)
- `67` (bare integer, when unambiguous)

Resolution logic, factored once:

```ts
async function resolveAnnotationId(
  endpoint: string,
  headers: Record<string, string>,
  token: string,
  project?: string,
): Promise<string> {
  const trimmed = token.startsWith("#") ? token.slice(1) : token;
  // UUID shape — pass through as-is.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  // Integer shape — look up sequence_number within project.
  if (!/^\d+$/.test(trimmed)) fail(`unrecognized id: ${token}`);
  if (!project) fail(`--project required when looking up by sequence number`);
  const seq = Number.parseInt(trimmed, 10);
  const url = `${endpoint}?project_name=eq.${encodeURIComponent(project)}` +
              `&sequence_number=eq.${seq}` +
              `&parent_id=is.null&select=id`;
  const rows = (await request(url, { headers })) as Array<{ id: string }>;
  if (rows.length === 0) fail(`no comment #${seq} in project ${project}`);
  if (rows.length > 1) fail(`ambiguous: ${rows.length} rows match #${seq} in project ${project} — schema invariant violated`);
  return rows[0].id;
}
```

Every command that takes `<id>` runs the token through this resolver
first. The `--project` flag becomes required for any non-UUID token
(it's already required for `list` / `create`; trivial to require for
`get` / `set-status` / `delete` when the token isn't a UUID).

Usage examples after the change:

```
bun run feedback set-status #67 review --project mysite
bun run feedback set-status 67 review --project mysite
bun run feedback get #71 --project mysite
bun run feedback delete #4 --project mysite
```

#### 2. `list` output leads with `#N`

Current line format:

```
${uuid}  ${status}  ${path}  ${truncated message}
```

New format (UUID kept as the trailing column so existing scripts
that parse columns still work, and so the human-grokkable `#N`
leads):

```
#${sequenceNumber}  ${status}  ${path}  ${truncated message}  ${uuid}
```

For replies, `#N` is empty (or rendered as `↳`). The existing reply
indent already signals their nature; add the `↳` glyph next to the
parent's `#N` so threading reads naturally.

#### 3. `skills/apply-ccm-feedback/SKILL.md` rules

Add a section near the top:

> **Comment reference resolution.** When the human refers to a
> comment by number ("comment 67", "#67", "issue 71"), resolve it to
> the row whose `sequence_number = N` AND `project_name = <current
> project>` AND `parent_id IS NULL`. There is exactly one such row;
> if the lookup returns zero or more than one, halt and ask the
> human to clarify.
>
> Always confirm before acting: `> Found #67 — "Header copy should
> say 'Welcome back' instead of 'Hello'" on /home. Working on it.`
> The confirmation echoes back the comment body so the human can
> catch a wrong number before edits land.
>
> Numbers are stable. A previously-deleted #67 stays deleted; the
> next new comment becomes #N where N = max(seq) + 1, not #67.
> "Comment #67" always refers to the same row for the project's
> lifetime.

Add an example session block:

> **Example**
>
> User: *let's work on comment 67*
>
> Skill (internally): `feedback get #67 --project mysite` →
> resolves UUID, fetches row.
>
> Claude: *Found #67 on /pricing — "Make the CTA blue instead of
> green". Editing the component now.*

#### 4. `lfg-tracked` / Plane sync

`lfg-tracked` already uses sequence IDs for Plane work items
(`CCM-103`). The comment sequence number is a different namespace —
mirror the convention: human says `feedback #67`, agent looks up
`sequence_number = 67` in the active ccm-feedback project. Document
in `lfg-tracked.md` if it currently references feedback rows by UUID.

#### Edge case: human ambiguity

User says "67" without `#`. Two possibilities:
- Comment with `sequence_number = 67`.
- The first 67 characters of something.

Skill convention: if the bare integer appears in the **command
position** (`work on 67`, `look at 67`, `fix 67`), treat as a
sequence reference. If it appears mid-sentence in body text, ignore.
When in doubt, ask: *"Did you mean comment #67? (y/n)"*.

The CLI itself is unambiguous — anything passed where `<id>` is
expected is either a UUID or a sequence reference, never anything
else.

### Edge cases

- **Two reviewers create a comment within the same second on different
  clients.** Trigger runs per-row; first commit wins #71, second
  becomes #72. Both clients reconcile on realtime INSERT carrying the
  server values.
- **localStorage user with sequence number, then enables cloud mode
  and migrates via `migrateFromLocal`.** The migration POSTs each
  local record with its existing `sequenceNumber`. Trigger respects
  the supplied value (`if new.sequence_number is null`). After
  migration, any non-null local numbers survive. Conflicts (two
  rows trying to share the same `(project_name, sequence_number)`)
  are rare — there's no unique constraint on the pair in v1 (only an
  index). Accept the duplicate in the rare migration-conflict case;
  document under "known limitations" in `docs/cloud-mode.md`.

  If duplicates become a real problem, add `unique (project_name,
  sequence_number) deferrable initially deferred` in a follow-up
  migration and resolve conflicts during migrate.
- **Stale localStorage from pre-migration code on a project that
  already has cloud rows.** `migrateFromLocal` is the right place to
  drop client `sequenceNumber` and let the trigger assign fresh ones
  — pre-migration local numbers are render-index, not canonical.
  Best path: clear `sequenceNumber` from the migration payload so
  the server trigger generates authoritative numbers. Document this
  decision.
- **Cluster fan-out (item 7) and numbers.** A clustered row of 4
  markers might read `#3 #71 #14 #58` if those are the canonical
  identifiers in `createdAt` ascending order. Acceptable —
  identifiers are more useful than visual ordering of small numerals.
- **Number gaps.** Reviewer deletes #3 → next insert is still #71 (or
  whatever the prior max was). Gaps are normal and expected.

### i18n

`marker.ariaLabel` and `drawer.rowAria` already accept `{ n }`. Pass
`record.sequenceNumber`. No new strings.

### Verification (delta from PRO-68 main verification)

- Fresh project (cloud): add 3 comments → `#1, #2, #3`. Delete `#2`,
  add a new one → new comment is `#4`, not `#2`.
- Project with 70 existing comments (the user's New Commons case):
  add a new comment → it renders as `#71` on both the marker AND
  the drawer card.
- Reply on `#71` → no new number assigned. Reply does not appear in
  any other comment's numbering.
- Two windows on same project: window A adds a comment → window B
  receives realtime INSERT with `sequence_number` set, marker
  renders identically (`#N` matches A).
- Pre-migration localStorage: open widget once → backfill assigns
  numbers by `createdAt`; subsequent reload renders them stable.
- Filter the drawer to `done` → cards show their original numbers
  (not 1..N renumbered).

---

## Store / data model

Item 8 introduces a new persisted field on `AnnotationRecord` and a
schema migration. Items 1–7 are UI-only and read from the existing
store / bus surface.

## Migration

None.

## Events (`src/events.ts`)

Add:

```ts
"drawer:opened": [];
"drawer:closed": [];
```

Reuse:

- `annotations:toggle` (eye → toolbar)
- `navigator:open` (dblclick FAB)
- `target:start` / `pin:start` / `area:start` / `*:end`
- `feedback:created` / `feedback:updated` / `feedback:deleted` for
  count recomputation

## i18n (`src/i18n.ts`)

Add toolbar-eye labels:

```ts
"toolbar.toggleOn": "Hide markers",
"toolbar.toggleOff": "Show markers",
```

Remove (after verifying no other call sites):

```ts
"fab.toggleOn"   // moved to toolbar.toggleOn
"fab.toggleOff"  // moved to toolbar.toggleOff
"fab.navigatorLabel"  // navigator item removed
```

The "open drawer" gesture is invisible (double-click) — no string.
Surface it in `docs/architecture.md` and a future onboarding tooltip.

---

## Verification

No test suite. Before merge:

- `bun run check` + `bun run lint` clean.
- Manual: open FAB radial — six items visible (target, pin, area,
  export, copyUrl, clear, plus a sixth if I'm miscounting; recount
  during implementation). Navigator gone.
- Double-click FAB → drawer opens directly. Radial does not expand.
- Drawer open → FAB and radial shift left by `panel-width + 24 px`
  with a 0.25 s transition. All radial items clickable.
- Drawer close → FAB returns to bottom-right anchor.
- Resize ≤ 480 px while drawer open → FAB hidden.
- Enter pin mode → toolbar shows eye + cancel. Click eye → markers
  hide. Click eye again → markers reappear. ESC out of pin mode.
- Click pin mode in radial → mode activates, radial stays open
  underneath. Drop comment, popup submits. Radial still open. Click
  pin again immediately → next comment flow starts. No re-open
  needed.
- Page with 3 `todo`, 1 `review`, 2 `done` → yellow "3" top-right,
  blue "1" top-left. Mark a todo as review → yellow drops to 2, blue
  rises to 2. Mark all as done → both badges disappear.
- Cloud mode realtime: window A flips a status, window B's FAB
  badges update.
- A11y: tab to FAB, screen reader reads "Feedback widget, 3 todo, 1
  review" (or whatever the combined `aria-label` resolves to).
- Drawer status change: open drawer, click a card's status badge →
  dropdown opens. Pick a new status → card re-renders (or drops out
  of view if filter no longer matches). Marker color underneath
  updates. Reviewer can sweep through 10 cards without leaving the
  drawer.
- Both surfaces share component: change in marker popover updates
  drawer card (when both visible), and vice versa.

---

## Implementation checklist

1. `src/events.ts`: add `drawer:opened`, `drawer:closed`.
2. `src/drawer.ts`: emit `drawer:opened` in `open()`, `drawer:closed`
   in `close()`.
3. `src/fab.ts`:
   - Remove `navigator` and `toggle` from `items`. Move `export`,
     `copyUrl`, `clear` to `direction: "up"`. Delete `openAll` and
     the `"all"` mode; collapse `OpenMode` to `closed | open`.
   - `dblclick` → `bus.emit("navigator:open")` instead of `openAll()`.
   - In `handleItemClick`, hoist `this.close()` into per-case
     branches; skip for `target` / `pin` / `area`.
   - Replace `updateCount(count)` with `updateCounts({ todo, review
     })`. Render up to two `.sp-fab-badge` nodes; second badge =
     `.sp-fab-badge.sp-fab-badge--left`.
   - Subscribe to `drawer:opened` / `drawer:closed`, call
     `setDrawerOpen(boolean)` that toggles `.sp-fab--drawer-open` on
     the host + radial container.
   - Subscribe to `*:start` / `*:end`, call `setModeActive(boolean)`
     that bumps z-index on the widget shadow host (or its FAB
     container) above `Z_INDEX_MAX - 1`.
4. `src/pin-mode.ts`, `src/capture-modes.ts` (PinMode/AreaMode/target):
   each toolbar gets an "eye" button between instruction and cancel.
   Button click emits `annotations:toggle` with the inverted
   `MarkerManager.visible` state. Add a `visible` getter on
   `MarkerManager` (it has the field, just needs the public surface).
5. `src/markers.ts`: add `get visible(): boolean { return this.visible; }`
   (or expose the field).
6. `src/index.ts`:
   - Replace every `fab.updateCount(...)` call with
     `fab.updateCounts(computeCounts())`. Define `computeCounts()` once
     near the top of `init()`:
     ```ts
     const computeCounts = () => {
       const records = store.listForPath(window.location.pathname)
         .filter(r => !r.parentId);
       let todo = 0, review = 0;
       for (const r of records) {
         const s = r.status ?? "todo";
         if (s === "todo") todo++;
         else if (s === "review") review++;
       }
       return { todo, review };
     };
     ```
   - Wire it to `feedback:created`, `feedback:updated`,
     `feedback:deleted`, and the cloud-store realtime change handler.
7. `src/styles/base.ts`:
   - `.sp-fab--drawer-open` (and `.sp-radial--drawer-open`?) with
     `right: calc(var(--sp-panel-width, 400px) + 24px); transition:
     right 0.25s ease;`. The `<=480px` media query sets
     `display: none` for both.
   - `.sp-fab-badge--left` mirrors `.sp-fab-badge` but with
     `left: -4px;` instead of `right: -4px;`.
   - Define `--sp-panel-width: 400px` on the widget root and
     reference it from `.sp-panel { width: var(--sp-panel-width); }`.
8. `src/i18n.ts`: add `toolbar.toggleOn` / `toolbar.toggleOff`. Remove
   `fab.toggleOn` / `fab.toggleOff` / `fab.navigatorLabel`.
9. `src/icons.ts`: drop `ICON_CHAT` if no other importer remains
   (grep first).
10. `docs/architecture.md`: document the dblclick-opens-drawer gesture
    and the toolbar-only visibility toggle rule.
11. **Drawer card status change** (depends on PRO-67):
    - Extract the popover status dropdown into
      `src/status-dropdown.ts` exporting `buildStatusDropdown({
      current, onPick, colors, t })`.
    - `src/markers.ts`: replace inline dropdown with
      `buildStatusDropdown(...)` consumer (pure refactor).
    - `src/drawer.ts`: replace the passive `sp-badge` span in
      `buildCard` with `buildStatusDropdown(...)`. On pick, call
      `store.updateStatus`, emit `feedback:updated`, re-render the
      drawer list.
    - `src/markers.ts`: subscribe the open popover (if any) to
      `feedback:updated` so its pill reflects drawer-driven changes.
12. **Fan-out colocated pins**:
    - `src/markers.ts`: add `COLLISION_RADIUS` + `CLUSTER_GAP`
      constants. After the kind-specific positioning loop in
      `reposition()`, add a cluster-detection pass (union-find on
      pairwise distance) and a layout pass that fans cluster
      members horizontally around the mean center. Skip orphan
      entries. Set `dataset.clusterSize` / `dataset.clusterIndex` for
      future styling.
    - `docs/architecture.md`: document cluster fan-out + its
      interaction with PRO-67 drag-relocate.
13. **Persistent sequence numbers**:
    - `supabase/migrations/0006_sequence_number.sql`: add column,
      backfill via `row_number()`, create `(project_name,
      sequence_number)` index, install BEFORE INSERT trigger.
    - `scripts/apply-migrations.sh`, `docs/self-hosting.md`,
      `docs/cloud-mode.md`: add 0006 to migration list.
    - `src/types.ts`: add `sequenceNumber?: number` on
      `AnnotationRecord`.
    - `src/store.ts`: `buildRecord` takes the existing list, computes
      `maxSeq + 1`. Add one-time `backfillSequenceNumbers` pass on
      `Store` construction; persist if modified.
    - `src/cloud-store.ts`: `CloudRow.sequence_number?: number | null`;
      `recordToRow` / `rowToRecord` mappers; `migrateFromLocal` drops
      `sequenceNumber` from payload so the trigger reassigns.
    - `src/markers.ts`: `buildMarker(record)` reads
      `record.sequenceNumber`. Delete `renumber()` and all callers.
      `addOne` / `refresh` drop the index argument.
    - `src/drawer.ts`: `buildCard(record)` reads
      `record.sequenceNumber`. Delete the `let n = 0; ++n` loop in
      `render()`.
    - `skills/apply-ccm-feedback/SKILL.md`: prefer
      `record.sequenceNumber` over array index for any "#N" human
      reference. Add the "Comment reference resolution" section
      (look up `sequence_number = N AND project_name = X AND
      parent_id IS NULL`, confirm before acting with echo-back).
    - `scripts/feedback.ts`: factor `resolveAnnotationId(token,
      project)` that accepts UUID, `#N`, or bare `N`. Wire into
      `get` / `set-status` / `delete`. Reformat `list` output to
      lead with `#N` (UUID demoted to trailing column). Render `↳`
      for replies.
    - `docs/data-model.md`: document the sequence rule (top-level
      only, monotonic, never reused, replies excluded) + the
      `#N`-by-project-name uniqueness contract.
14. Verify per above.

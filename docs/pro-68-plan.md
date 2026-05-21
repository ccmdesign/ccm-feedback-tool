---
status: active
created: 2026-05-21
ticket: PRO-68
branch: feature/PRO-68-fab-toolbar-tweaks
origin: docs/fab-toolbar-tweaks.md
target_repo: ccmdesign/feedback-layer
pr_target: dev
---

# feat: PRO-68 FAB + capture toolbar tweaks

## Summary

Implement the eight related changes called out in `docs/fab-toolbar-tweaks.md`:
dblclick FAB opens the drawer, FAB shifts when drawer opens, eye toggle
moves to the in-mode capture toolbars, capture buttons stop closing the
radial, FAB exposes split todo/review badges, drawer cards become
status-editable via the shared dropdown, colocated markers fan out
horizontally, and every top-level comment carries a persistent
project-scoped sequence number that the CLI and `apply-ccm-feedback`
skill resolve as `#N`.

Origin: `docs/fab-toolbar-tweaks.md` (in worktree root). That document is
the canonical scope — this plan only sequences and de-risks it.

## Problem Frame

Reviewer workflows in the current widget require too many clicks:
the navigator is buried in the radial, the FAB and radial collide with
the open drawer panel, the eye toggle disappears the moment a capture
mode is active, every comment dropped needs a fresh radial open, the
single total-count badge mixes resolved and pending work, drawer cards
can't change status, multiple markers on the same anchor stack on top
of each other (only the top one is clickable), and there is no stable
human-grokkable identifier for "comment #67" across reloads, filters,
or clients.

PRO-67 has already shipped the shared `status-dropdown.ts` factory the
drawer needs — verified below. PRO-66 shipped reply records (rows with
`parent_id` set) which must be excluded from sequence numbering.

## PRO-67 Dependency Verification

Before writing this plan, the worktree was checked for what PRO-67
actually shipped:

- `src/status-dropdown.ts` exists (9.8 KB) and exports
  `createStatusDropdown({ current, colors, t, onPick }): StatusDropdownHandle`.
- `src/markers.ts` already consumes it via
  `import { createStatusDropdown, type StatusDropdownHandle }` and
  uses it inside the marker popover (lines 10, 62, 899, 1199).
- The spec section 6 / checklist item 11 asks for an "extract refactor".
  **That extract is already done.** The work in this plan reduces to
  consuming the existing factory inside `src/drawer.ts`. No refactor of
  `src/markers.ts` is needed — only a subscription tweak so the popover
  pill reflects drawer-driven status changes.
- Migration `supabase/migrations/0006_replies.sql` is already taken by
  PRO-66. The sequence-number migration in this plan ships as
  `supabase/migrations/0007_sequence_number.sql`, not `0006` as the
  spec text proposes. All other migration content is unchanged.

These two corrections are the only deltas from the spec's prose.

## Requirements

Traceability map back to the eight numbered sections of
`docs/fab-toolbar-tweaks.md` (origin). R-IDs are this plan's local IDs;
the spec headings carry the canonical scope.

- **R1** Double-click FAB opens the navigator drawer; navigator radial
  item removed (origin §1).
- **R2** FAB and radial shift left by `panel-width + 24px` while the
  drawer is open; hidden entirely below 480px viewport (origin §2).
- **R3** Eye toggle moves from FAB radial to each capture mode toolbar
  (PinMode, AreaMode, target-pick); FAB no longer owns visibility
  (origin §3).
- **R4** Capture mode clicks (`target`, `pin`, `area`) do not close
  the radial; one-shot actions (`export`, `copyUrl`, `clear`) still
  do; FAB sits above the capture overlay during a mode (origin §4).
- **R5** FAB renders up to two badges — yellow (`todo`) top-right,
  blue (`review`) top-left — sourced from `STATUS_COLORS`, both
  hidden at zero, combined `aria-label="N todo, M review"`
  (origin §5).
- **R6** Drawer cards expose the shared status dropdown so reviewers
  can sweep statuses without leaving the drawer; the existing
  `src/status-dropdown.ts` factory is reused (origin §6).
- **R7** Colocated markers fan out horizontally around the cluster's
  mean center with `MARKER_SIZE + 4px` spacing, clamped inside the
  viewport, skipping right-edge orphans (origin §7).
- **R8** Every top-level comment carries a persisted
  `sequenceNumber: number`, assigned once at create time, scoped per
  `projectName`, monotonic, never reused, never assigned to replies.
  Both stores plus a Supabase BEFORE INSERT trigger maintain the
  invariant; the CLI + skill resolve `#N` and bare `N` to the
  underlying UUID (origin §8).

## Scope Boundaries

### In scope
- All eight items above and their supporting `src/events.ts`,
  `src/i18n.ts`, `src/icons.ts`, `src/styles/base.ts`, `docs/`
  touch-ups.
- Supabase migration `0007_sequence_number.sql` plus self-host
  surface (`scripts/apply-migrations.sh`, `docs/self-hosting.md`,
  `docs/cloud-mode.md`).
- CLI changes in `scripts/feedback.ts` and skill rule update in
  `skills/apply-ccm-feedback/SKILL.md`.

### Non-goals (carried verbatim from origin §"Non-goals (v1)")
- No drag-to-reorder of radial items.
- No persistence of FAB position; FAB always returns to bottom-right
  on drawer close.
- No new mode entries in the capture toolbar; eye sits beside `Cancel`.
- No badge styling theme override for hosts; yellow + blue are
  hardcoded against `STATUS_COLORS.todo` / `STATUS_COLORS.review`.
- No keyboard shortcut for visibility toggle when no capture mode is
  active (origin §3 trade-off accepted).
- No "+N overflow" affordance for clusters larger than ~6 (origin §7).
- No unique `(project_name, sequence_number)` constraint in v1 —
  documented limitation, follow-up only if duplicates appear in the
  wild (origin §8).
- No automatic cancel of an active capture mode when the drawer opens
  via dblclick (origin §4 edge-case — explicit "recommend yes" left
  to implementer judgement; default is **do** cancel via
  `bus.emit("*:end")` on `drawer:opened`, see U2 verification).

### Deferred to Follow-Up Work
- `--sp-panel-width` CSS custom property refactor for host
  overrides — origin §2 calls it a one-line refactor but holds the
  `400px` literal as the default. Land the variable but do not yet
  expose it in `docs/cloud-mode.md` as a public theming knob.
- "+N overflow" affordance on clusters > 6 members — revisit if real
  usage hits the limit.
- `unique (project_name, sequence_number)` constraint — only if the
  migration race window produces duplicates in production.
- Keyboard shortcut to toggle marker visibility outside capture mode.

## Key Technical Decisions

1. **PRO-67 already extracted `status-dropdown.ts`.** No refactor of
   `src/markers.ts` for the dropdown — `src/drawer.ts` consumes the
   existing factory directly. Saves one whole implementation unit
   versus the spec text. (See PRO-67 Dependency Verification above.)
2. **Migration number is `0007`, not `0006`.** PRO-66 already used
   `0006_replies.sql`. Migration filename and `scripts/apply-migrations.sh`
   reference 0007 throughout.
3. **Drawer↔FAB coupling is via bus events, not constructor injection.**
   New `drawer:opened` / `drawer:closed` events keep the two
   components loosely coupled (origin §2 trade-off — bus wins).
4. **Capture overlay z-index dominance.** FAB host bumps to
   `Z_INDEX_MAX` (above the `Z_INDEX_MAX - 1` overlay) while a mode is
   active via `setModeActive(true)`; restored on `*:end`. Simpler than
   a clip-path donut on the overlay (origin §4).
5. **Counts source.** `computeCounts()` lives in `src/index.ts` and
   reads `store.listForPath(location.pathname)`, filters out replies
   (`!r.parentId`), and increments todo / review. Single call site,
   driven by `feedback:created` / `feedback:updated` /
   `feedback:deleted` / realtime change.
6. **Cluster fan-out runs as a second pass inside `reposition()`.**
   Union-find on pairwise Chebyshev distance < `MARKER_SIZE`,
   horizontal layout around cluster mean center, clamped inside
   viewport, gated by `dataset.orphan === "false"`. No per-kind branch
   for area markers (they collide the same way as pins).
7. **Sequence numbers: localStorage computes client-side, cloud relies
   on a BEFORE INSERT trigger.** Both stores write the same shape on
   create. `CloudStore.migrateFromLocal` drops local `sequenceNumber`
   from payload so the trigger reassigns authoritative values. Race
   window for two concurrent cloud writers is accepted as v1
   limitation (origin §8 cross-cuttings).
8. **CLI resolver token shape.** `scripts/feedback.ts` factors
   `resolveAnnotationId(token, project)` that accepts UUID, `#N`, or
   bare `N` and rejects anything else with a clear error message.
   `--project` becomes required for any non-UUID token; existing UUID
   call sites are untouched.
9. **`list` output reorder.** `#N` leads, UUID demoted to last column,
   replies render `↳` in the `#N` slot. Preserves columnar parseability.
10. **No constructor-time backfill rewrite for cloud rows.** Cloud
    rows are backfilled by the migration's `row_number() over (...)`
    pass. Only `Store` (localStorage) runs the client-side
    `backfillSequenceNumbers` on construction.

## System-Wide Impact

Stakeholders touched by this change:

- **Reviewers using the widget.** Net win — fewer clicks for drawer
  open, status sweeps, multi-comment capture sessions; stable `#N`
  identifiers for cross-message references.
- **Self-hosters running Supabase.** New migration `0007` must be
  applied before deploying the new `dist/w.js`; `apply-migrations.sh`
  and `docs/self-hosting.md` updated.
- **The `apply-ccm-feedback` skill consumers (Claude in client repos).**
  Skill rules updated to resolve `#N` references — behavior change in
  how Claude lands on a row.
- **CLI users (`bun run feedback ...`).** New token shapes accepted;
  existing UUID workflows continue to work; `list` column order
  changes (UUID now trailing).

Cross-spec interaction with PRO-67 drag-relocate: cluster fan-out
re-runs on every `reposition()`, so dropping a marker on an
already-clustered anchor lays the new arrangement automatically — no
special path in the drag code. Document in `docs/architecture.md`.

Cross-spec interaction with PRO-66 replies: replies (`parentId` set)
are excluded from sequence numbering and from FAB count badges.
Migration backfill respects this via `where parent_id is null`.

---

## Implementation Units

Units are sequenced so each phase ends at a verification gate. Every
gate is the same: `bun run check` (tsc --noEmit) + `bun run lint`
(biome check) + `bun run build` + a manual smoke listed under that
phase's verification block. The widget has no test suite — verification
is type-check, lint, build, and browser smoke on the demo page (open
`public/index.html` via `bun run serve` and exercise the called-out
flows).

### Phase A — Scaffolding & FAB restructure

#### U1. Add drawer lifecycle events and wire `Drawer` emits

**Goal:** Establish the bus events PRO-68 needs without changing UI yet.

**Requirements:** R1, R2.

**Dependencies:** none.

**Files:**
- `src/events.ts` — add `"drawer:opened": []` and `"drawer:closed": []`
  to the `WidgetEvents` interface.
- `src/drawer.ts` — emit `drawer:opened` in `open()`, `drawer:closed`
  in `close()`. Match the existing `bus.emit("navigator:close")`
  pattern in `close()`.

**Approach:** Pure event-surface addition. No subscribers wired in
this unit — they land in U2 and U7. Keep the existing
`navigator:open` / `navigator:close` events untouched; they coexist
with the new ones.

**Test expectation:** none — pure event-surface scaffolding. No
behavior visible to the user until U2 subscribes.

**Verification:** `bun run check` clean. No runtime change.

#### U2. FAB restructure — radial collapse, dblclick gesture, drawer shift, mode z-index

**Goal:** Land items 1, 2, and 4 of the spec in one unit. Single radial
fan in `"up"` direction with all six action items; navigator gone;
dblclick opens drawer; FAB shifts when drawer opens; FAB sits above
the capture overlay; capture-mode clicks no longer close.

**Requirements:** R1, R2, R4.

**Dependencies:** U1.

**Files:**
- `src/fab.ts`:
  - Remove `navigator` and `toggle` from `items`; move `export`,
    `copyUrl`, `clear` to `direction: "up"` (six items in one fan).
  - Collapse `OpenMode` to `"closed" | "open"`. Delete `openAll()`
    and the `"all"` mode path.
  - `dblclick` handler emits `bus.emit("navigator:open")` instead of
    calling `openAll()`. Keep the `if (e.detail >= 2) return;` gate
    on single-click.
  - Delete `case "navigator":` and `case "toggle":` branches in
    `handleItemClick`. Hoist `this.close()` out of the top of the
    method into per-case branches; skip for `target`, `pin`, `area`.
  - Add `setDrawerOpen(open: boolean)` that toggles
    `.sp-fab--drawer-open` on `this.fab` and on the radial container
    (which uses `.sp-radial--bottom-right`).
  - Add `setModeActive(active: boolean)` that bumps the host's
    z-index to `Z_INDEX_MAX` while a mode is active and restores on
    exit.
  - Subscribe to `drawer:opened` / `drawer:closed` and
    `target:start` / `pin:start` / `area:start` / `*:end` in the
    constructor; call `setDrawerOpen` / `setModeActive` accordingly.
  - Drop the `ICON_CHAT` import.
- `src/icons.ts` — delete `export const ICON_CHAT = …` (grep confirmed
  no other importer).
- `src/styles/base.ts`:
  - Add `.sp-fab--drawer-open` and `.sp-radial--drawer-open` rules
    with `right: calc(var(--sp-panel-width, 400px) + 24px);
    transition: right 0.25s ease;`.
  - Add `--sp-panel-width: 400px` on the widget root and reference
    it from `.sp-panel { width: var(--sp-panel-width); }`.
  - Inside the existing `@media (max-width: 480px)` block, set
    `display: none` on `.sp-fab--drawer-open` and
    `.sp-radial--drawer-open`.
- `src/i18n.ts` — delete `fab.navigatorLabel` (both locales). Keep
  `fab.toggleOn` / `fab.toggleOff` for now (U3 moves and renames them
  to `toolbar.*`).

**Approach:** All FAB-side changes happen in one unit because they
share the same dispatch / class plumbing and splitting them would
churn `handleItemClick` twice. The spec's section 4 z-index decision
("bump FAB to `Z_INDEX_MAX`") is implemented via `setModeActive`. Per
origin §4 edge case: when drawer opens via dblclick during an active
capture mode, also emit the matching `*:end` so the mode cleanly
deactivates — the spec recommends this. Hook in `Fab`'s
`drawer:opened` subscriber:

```ts
// directional sketch — not implementation
bus.on("drawer:opened", () => {
  this.setDrawerOpen(true);
  // matching cancellation if a mode is mid-flight
  if (this.activeMode) bus.emit(`${this.activeMode}:end`);
});
```

**Test scenarios:**
- Open FAB radial → six items render (target, pin, area, export,
  copyUrl, clear). No navigator. No eye toggle.
- Double-click FAB → drawer slide-opens, radial does **not** expand,
  and FAB anchor shifts left.
- Drawer open, click each radial item → all reachable, none
  underneath the panel.
- Enter pin mode from radial → radial stays open behind the mode
  overlay; pin button stays clickable.
- Drop pin → popup submits, mode ends, radial still open. Click
  `pin` again immediately → next pin flow starts.
- Click `export` → action fires, radial closes.
- Click `clear` → action fires, radial closes.
- Resize viewport to ≤480px while drawer open → FAB hidden.
- Drawer-while-in-mode: enter pin mode, double-click FAB → drawer
  opens, mode cleanly cancels (no orphan overlay).

**Patterns to follow:**
- Existing `case "export":` branch in `handleItemClick` for one-shot
  action shape.
- Existing `.sp-radial--bottom-right` anchor class for the radial
  container.
- Existing media-query block in `src/styles/base.ts` for the panel.

**Verification:** type-check + lint + build clean. Manual smoke per
test scenarios above on the demo page. **Phase A gate:** commit before
moving to Phase B.

---

### Phase B — Capture toolbar eye

#### U3. Move eye toggle from FAB radial to in-mode capture toolbars

**Goal:** Each capture mode (PinMode, AreaMode, target-pick) renders
an eye button next to `Cancel`. Clicking it flips marker visibility
via `annotations:toggle`. No other surface controls visibility in v1.

**Requirements:** R3.

**Dependencies:** U2 (FAB eye item already removed there).

**Files:**
- `src/markers.ts` — expose a `get visible(): boolean` accessor on
  `MarkerManager` (the field is already private at line 52).
- `src/pin-mode.ts` — in the `this.toolbar` construction, insert an
  eye button between the instruction text and the cancel button.
  Click handler reads `markers.visible`, emits
  `bus.emit("annotations:toggle", !markers.visible)`. Swap icon
  (`ICON_EYE` ↔ `ICON_EYE_OFF`) and `aria-label` to mirror current
  state. Subscribe to `annotations:toggle` to keep the button in
  sync when other toolbars toggle.
- `src/capture-modes.ts` — same eye-button pattern in `AreaMode`
  and the target-pick mode. (Both already render their own top
  toolbars — locate the equivalent of PinMode's
  `this.toolbar.append(...)` site.)
- `src/i18n.ts`:
  - Add `toolbar.toggleOn`: "Hide markers", `toolbar.toggleOff`:
    "Show markers" (both locales — verify FR copy with origin §i18n
    note, fall back to "Masquer les commentaires" /
    "Afficher les commentaires" matching existing tone).
  - Remove `fab.toggleOn` / `fab.toggleOff` (grep first to confirm
    no other importer beyond the now-removed FAB toggle branch).
- `src/index.ts` — `MarkerManager` already subscribes to
  `annotations:toggle` in its constructor (line 203); no new wiring
  needed at the index level.

**Approach:** Three nearly-identical button additions; factor a
`buildToolbarEyeButton({ markers, bus, t })` helper colocated with
PinMode (or in `src/dom-utils.ts` if the export shape is clean) so
all three toolbars share the same code. The helper owns the
icon-swap subscription.

**Test scenarios:**
- Enter pin mode → eye button visible between instruction and
  cancel. Click eye → all existing markers disappear. Icon swaps
  to "eye-off". Click again → markers reappear.
- Enter area mode → same eye + cancel layout. Toggle works.
- Enter target-pick mode → same eye + cancel layout. Toggle works.
- Toggle visibility in pin mode, ESC → toolbar disappears; markers
  stay in the last-toggled state.
- Cloud realtime: window A toggles eye → window B's marker layer
  does NOT change (visibility is local state per origin §3 trade-off).
- Outside any capture mode → no way to toggle visibility (accepted
  trade-off; document in `docs/architecture.md` in U10).

**Patterns to follow:**
- The cancel button construction inside `PinMode.activate()`.
- The existing `annotations:toggle` listener in `markers.ts:203`.

**Verification:** type-check + lint + build clean. Manual smoke per
test scenarios.

---

### Phase C — FAB count badges

#### U4. Split single count badge into yellow `todo` + blue `review`

**Goal:** FAB renders up to two badges per origin §5. Replaces the
existing `updateCount(count: number)` surface with
`updateCounts({ todo, review })`. Both badges read from
`STATUS_COLORS`, render `99+` cap, share an `aria-label`.

**Requirements:** R5.

**Dependencies:** U2 (FAB structure stable).

**Files:**
- `src/fab.ts`:
  - Replace `updateCount(count: number)` with
    `updateCounts(counts: { todo: number; review: number }): void`.
  - Render up to two `.sp-fab-badge` nodes: existing class for
    todo (top-right), new `.sp-fab-badge.sp-fab-badge--left` for
    review (top-left). Hide each when its count is zero.
  - Single combined `aria-label="N todo, M review"` on the FAB
    button when either is > 0.
- `src/styles/base.ts`:
  - Existing `.sp-fab-badge` keeps yellow background (already
    references `STATUS_COLORS.todo` via inline style — verify and
    keep). Add `.sp-fab-badge--left` modifier mirroring the
    positioning rules with `left: -4px;` instead of `right: -4px;`
    and blue background pulled from `STATUS_COLORS.review.border`.
- `src/index.ts`:
  - Define `computeCounts()` near the top of `init()`:

    ```ts
    // directional sketch — not implementation
    const computeCounts = () => {
      const records = store
        .listForPath(window.location.pathname)
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

  - Replace every `fab.updateCount(...)` call site (grep) with
    `fab.updateCounts(computeCounts())`. Existing subscribers on
    `feedback:created`, `feedback:updated`, `feedback:deleted` plus
    the cloud-store realtime change handler all use the new helper.

**Approach:** Counts must update on any status mutation, not just
create / delete — `feedback:updated` is the load-bearing subscriber
because Phase D (drawer dropdown) will fire it on every drawer
status change. Verify in the test scenarios.

**Test scenarios:**
- Page with 3 todo, 1 review, 2 done → yellow "3" top-right, blue
  "1" top-left, no badge for done.
- Mark a todo as review → yellow drops to 2, blue rises to 2,
  same render call.
- Mark all as done → both badges disappear; FAB has no badge.
- 100+ todos and 100+ reviews → both badges show `99+`.
- Replies on a todo (PRO-66) → reply does NOT increment todo count.
- Cross-page records ignored — counts respect
  `listForPath(location.pathname)` filter.
- Cloud realtime: window A changes a status → window B's FAB
  badges update via the cloud-store realtime subscriber's
  `computeCounts()` call.
- Screen reader on FAB → reads `"Feedback widget, 3 todo, 1
  review"` (combined `aria-label`).

**Patterns to follow:**
- Existing `.sp-fab-badge` render path in `Fab.updateCount`.
- `STATUS_COLORS` import in `src/popup.ts` for the canonical
  todo / review chip colors.

**Verification:** type-check + lint + build clean. Manual smoke per
test scenarios. **Phase C gate.**

---

### Phase D — Drawer status dropdown

#### U5. Replace drawer card status badge with the shared dropdown

**Goal:** Drawer cards expose the same status dropdown PRO-67 already
ships in `src/status-dropdown.ts`. Card click still jumps to the
marker; dropdown click changes status without jumping.

**Requirements:** R6.

**Dependencies:** U4 (counts update on `feedback:updated`, which this
unit fires).

**Files:**
- `src/drawer.ts` — `buildCard` currently renders status as a
  passive `sp-badge` span around line 334. Replace with a call into
  `createStatusDropdown({ current: record.status, colors, t,
  onPick })`. The dropdown trigger lives inside the card `<button>`;
  the trigger and its menu items must `stopPropagation()` on click
  so the card-jump doesn't fire. (`createStatusDropdown` already
  does this for the popover use; verify by reading
  `src/status-dropdown.ts` — if it does not, add the guard locally
  in the drawer call site rather than mutating the shared module.)
- `src/drawer.ts` — `onPick` handler:

  ```ts
  // directional sketch — not implementation
  const onPick = (next: FeedbackStatus) => {
    if (next === record.status) return;
    this.store.updateStatus?.(record.id, next);
    record.status = next;
    this.bus.emit("feedback:updated", record);
    this.render();
  };
  ```

  Re-render the drawer list so the card refreshes color + filter
  membership in place. If the card no longer matches the active
  filter chip, it disappears from the list (accepted snap behavior,
  no animation).
- `src/markers.ts` — the open popover should reflect drawer-driven
  status changes when both surfaces are open simultaneously.
  Subscribe the open popover's pill to `feedback:updated` for
  `record.id` and call the existing `repositionAndRecolor(id)`
  helper (PRO-67). Locate the popover lifecycle around line 899
  (`createStatusDropdown` call inside `openPopover`).

**Approach:** Pure consumer change. The factory already encapsulates
ARIA, keyboard nav, outside-click. The unique drawer wrinkle is
the card-jump conflict — handle via `stopPropagation` at the
dropdown root.

Fallback path for stores without `updateStatus`: detect via
`typeof this.store.updateStatus === "function"`; render a read-only
`sp-badge` with `aria-disabled` when absent (per origin §6 edge case).
Both shipped stores implement it, so this is type-safety paranoia.

**Test scenarios:**
- Drawer open → each card shows the dropdown trigger pill
  matching its status color.
- Click card body → page scrolls + marker flashes (existing
  behavior preserved).
- Click dropdown trigger → menu opens; card does NOT jump.
- Pick a new status → store updates, badge color changes in
  place, marker color underneath updates, FAB count badges
  refresh (because U4 listens to `feedback:updated`).
- Drawer filter set to `todo`, change card's status to `review`
  → card disappears from the list immediately (no animation).
- Cards under "Other pages" section → dropdown works the same
  (status field is page-independent).
- Both popover and drawer open for the same record → change
  status from drawer → popover pill updates via the
  `feedback:updated` subscriber added to `markers.ts`.
- Change status from popover → drawer card updates on next
  `refreshIfOpen()` (already wired on `feedback:updated`).
- Realtime: window A changes a status from drawer → window B's
  drawer card re-renders with new status (existing realtime
  path; no new work).
- Store without `updateStatus` (type-system possibility only) →
  read-only badge renders with `aria-disabled`.

**Patterns to follow:**
- `src/markers.ts:899` for the existing `createStatusDropdown`
  call site shape.
- `src/drawer.ts` existing `buildCard` structure for where to
  splice the dropdown.

**Verification:** type-check + lint + build clean. Manual smoke per
test scenarios. **Phase D gate.**

---

### Phase E — Cluster fan-out

#### U6. Lay out colocated markers side-by-side in `reposition()`

**Goal:** When two or more markers resolve to the same anchor or land
within `MARKER_SIZE` pixels of each other, fan them out horizontally
around the cluster's mean center so each stays clickable.

**Requirements:** R7.

**Dependencies:** none (the marker layer is independent of the FAB /
drawer / counts work — could in principle land in parallel, but
sequencing serially keeps verification gates clean).

**Files:**
- `src/markers.ts`:
  - Add constants near the top of the file (alongside `MARKER_SIZE`):

    ```ts
    // directional sketch — not implementation
    const COLLISION_RADIUS = MARKER_SIZE; // 26 px center-to-center
    const CLUSTER_GAP = 4;                // px between marker edges
    ```

  - After the kind-specific positioning loop inside `reposition()`
    (around line 1273+ where `entry.node.style.display = …` is set),
    add a cluster-detection pass:
    1. Collect non-orphan entries (`dataset.orphan !== "true"`) into
       `{ entry, cx, cy }` triples using the just-computed `top` /
       `left`.
    2. Union-find pairs whose Chebyshev distance < `COLLISION_RADIUS`.
    3. For each cluster of size N > 1, sort by `record.createdAt`
       ascending, compute mean center, lay members at
       `cy` with x = `meanCx + (i - (N - 1) / 2) * (MARKER_SIZE +
       CLUSTER_GAP)`. Clamp the whole row inside the viewport via
       the existing `clampX` (shift the entire row left if the
       rightmost overshoots).
    4. Decorate clustered nodes with `dataset.clusterSize` /
       `dataset.clusterIndex`; clear them on non-clustered nodes.

**Approach:** Pure layout pass appended to `reposition()`. No
re-render on its own — every existing `reposition()` trigger
(`addOne`, `refresh`, scroll, resize) drives the new pass.
Right-edge orphan lane is preserved by the `dataset.orphan === "true"`
skip. Renumbering is unaffected (sequence numbers from U7 are
canonical identifiers, not render-position labels).

**Technical design (directional only):**

```text
After existing positioning loop:
  candidates = entries.filter(orphan == false)
  pairs = []
  for (i, j) in candidates.pairs():
    if chebyshev(centers[i], centers[j]) < COLLISION_RADIUS:
      pairs.push([i, j])
  clusters = unionFind(candidates, pairs)
  for cluster in clusters where cluster.size > 1:
    members = sortBy(cluster, r => createdAt asc)
    meanCx = average(members.cx); meanCy = average(members.cy)
    rowWidth = (N - 1) * (MARKER_SIZE + CLUSTER_GAP)
    for (i, m) in members:
      m.cx = meanCx + (i - (N-1)/2) * (MARKER_SIZE + CLUSTER_GAP)
      m.cy = meanCy
    clampRow(members)  // shift left if rightmost > viewport
    write style.top / style.left + dataset.clusterSize/clusterIndex
```

This is illustrative, not implementation spec.

**Test scenarios:**
- Three markers on the same `<h1>` element → render side-by-side,
  all clickable, popover for each opens the correct record.
- Five markers on the same hero image → row of 5 centered on the
  natural anchor. Trigger near the right edge → whole row shifts
  left, no marker off-screen.
- Drop a pin at the exact coord of an existing pin → both visible
  side-by-side after drop (no special drag-path code).
- Marker A at (100, 100), B at (110, 105), C at (130, 100) →
  union-find groups all three into one cluster (A-B and B-C both
  within `COLLISION_RADIUS = 26`), laid out as a row of 3.
- Delete one marker from a 4-cluster → remaining 3 shift back
  toward the new mean center on the next `reposition()` call.
- Orphan lane (right-edge target markers with unresolved anchor)
  → stays vertical-stack, NOT clustered horizontally.
- Two area markers with overlapping rects → fan out the same as
  pins (no special area-kind branch).
- Cluster of 10 → row gets long, leftward clamp pushes leftmost
  members past the left edge (accepted v1 limitation per
  origin §7).
- PRO-67 drag-relocate: drag a marker into a cluster → drop →
  cluster re-flows on next `reposition()`.
- Cloud realtime: window A adds a 4th marker to a 3-marker
  cluster in window B → B reflows to a 4-wide row.

**Patterns to follow:**
- The existing `clampX` helper inside `reposition()` for
  edge-clamp logic.
- `dataset.orphan` flag set elsewhere in `reposition()` for the
  right-edge target lane.

**Verification:** type-check + lint + build clean. Manual smoke per
test scenarios. **Phase E gate.**

---

### Phase F — Persistent sequence numbers

This phase has the biggest blast radius — schema migration, two
stores, two render call sites, CLI, skill. Both stores move together;
do not split.

#### U7. Add `sequenceNumber` to the data model + Supabase migration

**Goal:** Land the type, the migration, and the trigger so cloud
writes are race-safe. Backfill existing rows.

**Requirements:** R8.

**Dependencies:** none (independent of UI work, but lands here so the
later units can rely on the field).

**Files:**
- `src/types.ts` — add `sequenceNumber?: number` to
  `AnnotationRecord` interface with the docblock from origin §8.
- `supabase/migrations/0007_sequence_number.sql` (NOTE: `0007`, not
  `0006` — PRO-66 took `0006_replies.sql`). Content matches origin §8
  "Cloud migration" verbatim:
  - `alter table … add column if not exists sequence_number bigint;`
  - Backfill via `with ordered as (select id, row_number() over
    (partition by project_name order by created_at, id) as seq from
    … where parent_id is null) update … from ordered o where a.id =
    o.id;`
  - Index: `create index if not exists
    ccm_widget_annotations_project_seq_idx on … (project_name,
    sequence_number);`
  - BEFORE INSERT trigger function `ccm_widget_assign_sequence` that
    returns early when `new.parent_id is not null`, then assigns
    `coalesce(max(sequence_number), 0) + 1` scoped to the
    project_name + `parent_id is null`.
  - `drop trigger if exists … create trigger
    ccm_widget_assign_sequence_trg before insert …`.
- `scripts/apply-migrations.sh` — append `0007_sequence_number.sql`
  to the applied list.
- `docs/self-hosting.md` — add 0007 to the migration sequence with
  one-line description.
- `docs/cloud-mode.md` — same, plus note the race-window known
  limitation under "Known limitations".

**Approach:** Migration is self-contained and idempotent (`if not
exists` on column, index, trigger). REPLICA IDENTITY FULL from
migration 0003 means the new column propagates via realtime
automatically. No RLS changes needed (existing `using (true)` covers
the new column).

**Test expectation:** none — schema/scaffolding. Verification is
applying the migration against a fresh + a populated dev Supabase
project and confirming backfill correctness.

**Verification:**
- `psql` (or supabase CLI) shows the new column + index + trigger
  after applying 0007.
- On a project with existing rows: every top-level row has a
  `sequence_number`, replies have `null`, and `select max(...)
  group by project_name` matches the row count of non-reply rows
  per project.
- Insert two new top-level rows for the same project back to back
  → second row's `sequence_number = first + 1`.
- Insert a reply row → its `sequence_number` stays `null`.
- `bun run check` clean (type change only).

#### U8. localStorage `Store` writes + reads + backfill

**Goal:** `Store` (localStorage) assigns `sequenceNumber` on every
top-level create, runs a one-time backfill on construction for
pre-migration data, and exposes the field on reads.

**Requirements:** R8.

**Dependencies:** U7 (type field exists).

**Files:**
- `src/store.ts`:
  - `buildRecord(input, existing)` — compute
    `maxSeq = existing.reduce((m, r) => r.parentId ? m :
    Math.max(m, r.sequenceNumber ?? 0), 0)` and set
    `sequenceNumber: maxSeq + 1` on the record. Replies (already
    built via `buildReplyRecord`) do **not** get a number — leave
    the branch as-is.
  - Add `backfillSequenceNumbers(items)` helper: filter top-level,
    if any are missing `sequenceNumber` assign in `createdAt`
    ascending order starting at 1, return `true` if anything
    changed.
  - In `Store` constructor (or first `load()` call site), run the
    backfill once; persist if it returned true. Idempotent — second
    call is a no-op.

**Approach:** Spec text in origin §8 "Store contract" → "localStorage"
is directional but exact enough — implement it. The one decision is
where the backfill runs: pick the constructor over lazy-on-first-
`list()` because `Store` instances are short-lived and the cost is
minimal.

**Test scenarios:**
- Fresh project (no localStorage data): add 3 comments → `#1, #2, #3`.
  Delete `#2`. Add a new comment → it's `#4`, not `#2` (max-based,
  not gap-fill).
- Pre-migration localStorage (records without `sequenceNumber`):
  open widget → backfill assigns numbers in `createdAt` order,
  persists. Reload widget → numbers stable; no re-backfill.
- Mixed pre/post-migration data (some numbered, some not):
  backfill assigns numbers only to the unnumbered ones; existing
  numbers preserved.
- Add a reply via `buildReplyRecord` → no number assigned.
- `buildRecord` called with empty `existing` → first record is `#1`.

**Patterns to follow:**
- Existing `buildReplyRecord` for the no-number branch.
- Existing `Store.save` / `load` for the persistence write path.

**Verification:** type-check + lint + build clean. Manual smoke per
scenarios on the demo page with localStorage backing.

#### U9. `CloudStore` writes + reads + migrateFromLocal handling

**Goal:** `CloudStore` mirrors `Store`'s write behavior (optimistic
local `maxSeq + 1`), reads `sequence_number` from the row mapper, and
drops local sequence numbers in `migrateFromLocal` so the trigger
reassigns authoritative values.

**Requirements:** R8.

**Dependencies:** U7 + U8.

**Files:**
- `src/cloud-store.ts`:
  - `CloudRow` interface (search for the row-shape type) — add
    `sequence_number?: number | null`.
  - `recordToRow` — include `sequence_number: record.sequenceNumber
    ?? null`. The server trigger overwrites `null` for new top-level
    rows; replies pass through as `null` because the trigger early-
    returns on `parent_id is not null`.
  - `rowToRecord` — include `sequenceNumber: row.sequence_number ??
    undefined`.
  - `migrateFromLocal` — strip `sequenceNumber` from each row
    before POST so the trigger reassigns. Document the conflict
    rationale inline.
  - The optimistic create path uses the cached `maxSeq + 1` same as
    `Store` (per Key Decision 7).

**Approach:** Origin §8 lays out option (1) vs (2) for the
optimistic local value — pick (1) per Key Decision 7. The race window
between two concurrent cloud writers is the known limitation
(documented in U7's `cloud-mode.md` update).

**Test scenarios:**
- Cloud mode fresh project: add 3 comments → `#1, #2, #3` on both
  the optimistic local cache and on the server (verify via direct
  PostgREST `select`).
- Delete `#2`, add new → `#4` (server-assigned via trigger; local
  cache reconciles on realtime).
- Two windows, same project: A adds a comment → B receives
  realtime INSERT with `sequence_number` set; B's marker shows
  same `#N` as A's.
- `migrateFromLocal` with localStorage rows numbered #1–#10 →
  cloud rows get fresh sequential numbers assigned by trigger
  (may differ from local numbers if other reviewers exist).
- Reply create in cloud mode → `sequence_number` stays NULL on
  server, `sequenceNumber` stays undefined locally.
- Race window (origin §8 edge case): two windows insert
  near-simultaneously → both rows persist with distinct
  `sequence_number` values (Postgres serializes the `max() + 1`
  read inside the trigger).

**Patterns to follow:**
- Existing `recordToRow` / `rowToRecord` shape (search for
  `parent_id` to find both functions).
- Existing `migrateFromLocal` POST batching.

**Verification:** type-check + lint + build clean. Manual smoke per
scenarios using the maintainer demo Supabase project.

#### U10. Render sequence numbers in markers + drawer + docs

**Goal:** Both surfaces display `record.sequenceNumber` as the
canonical identifier. Remove `renumber()` and all render-index loops.

**Requirements:** R8.

**Dependencies:** U7–U9 (records have the field).

**Files:**
- `src/markers.ts`:
  - `buildMarker(record)` — drop the `idx + 1` parameter; read
    `record.sequenceNumber` directly. Fallback for legacy rows:
    display `?` (or `record.id.slice(0, 6)` per origin —
    pick `?` for visual brevity; document in `docs/architecture.md`).
  - Delete `renumber()` method and every call site (search for
    `renumber`).
  - `addOne(record)` — drop the index arg; passes the record
    straight to `buildMarker`.
  - `refresh()` — same; drop the `entries.forEach((e, idx) =>
    buildMarker(e.record, idx + 1))` shape if present.
  - `marker.ariaLabel` — pass `record.sequenceNumber` (or fallback)
    for the `{ n }` interpolation.
- `src/drawer.ts`:
  - `buildCard(record)` — drop `number: number` parameter; read
    `record.sequenceNumber` (or fallback) for the displayed `#N`.
  - `render()` — delete the `let n = 0; ++n` numbering loop. Cards
    show canonical numbers regardless of filter or grouping.
- `docs/architecture.md`:
  - Document the dblclick-opens-drawer gesture (from U2).
  - Document the toolbar-only visibility toggle rule (from U3).
  - Document cluster fan-out + interaction with PRO-67 drag-relocate
    (from U6).
  - Document the sequence-number contract: top-level only,
    monotonic, never reused, replies excluded, `?` fallback for
    legacy rows.
- `docs/data-model.md` — add a "Sequence numbers" section: top-level
  only, monotonic per `projectName`, never reused, replies excluded,
  `(project_name, sequence_number)` uniqueness is enforced by
  convention (no DB constraint in v1).

**Approach:** Mechanical replacement — record carries its own number,
all render call sites read it. The delete-`renumber()` step touches
the most code; grep first to enumerate call sites.

**Test scenarios:**
- Fresh project, add 3 comments → markers labeled `#1`, `#2`, `#3`.
  Delete `#2`, add new → marker is `#4`. Sequence holds on reload.
- Drawer with comments numbered 47, 12, 71 in `createdAt` desc
  order → cards display `#47`, `#12`, `#71` (not 1/2/3 render
  indices).
- Filter drawer to `done` → cards show their original numbers,
  not 1..N renumbered.
- Cluster of 4 markers (from U6) at one anchor → row reads
  `#3 #71 #14 #58` if those are the canonical IDs in `createdAt`
  ascending order. Acceptable per origin §8 edge case.
- Reply in popover → no `#N` shown (origin §8 "Reply records").
- Pre-migration localStorage row missing `sequenceNumber` →
  marker renders `?`; drawer card renders `?`. After backfill (U8)
  reload → real number shows.

**Patterns to follow:**
- `src/markers.ts:271` (old `buildMarker(record, idx + 1)`) call
  site shape to invert.
- `src/drawer.ts:333` (`setText(num, '#${number}')` site) to
  invert.

**Verification:** type-check + lint + build clean. Manual smoke per
scenarios. **Phase F core gate.**

---

### Phase G — CLI + skill `#N` resolution

#### U11. CLI: resolver, `list` reformat, `↳` reply marker

**Goal:** `bun run feedback ...` accepts `#N`, bare `N`, or UUID
anywhere a comment ID is taken. `list` output leads with `#N`, UUID
demoted to last column, replies show `↳`.

**Requirements:** R8.

**Dependencies:** U7 (`sequence_number` column exists in DB).

**Files:**
- `scripts/feedback.ts`:
  - Factor `resolveAnnotationId(endpoint, headers, token,
    project): Promise<string>` per origin §8 "Claude resolves
    'comment #N'" section 1. Validates UUID shape; otherwise
    treats `#N` or bare integer as a sequence reference and
    queries
    `?project_name=eq.<project>&sequence_number=eq.<N>&parent_id=is.null&select=id`.
    Errors clearly when no match, ambiguous match, or
    `--project` missing for non-UUID token.
  - Wire the resolver into `get`, `set-status`, `delete`.
    `--project` becomes required when the supplied token is not a
    UUID (it's already required for `list` / `create`).
  - `list` output reorder: new format
    `#${seq}  ${status}  ${path}  ${truncated message}  ${uuid}`.
    Replies render `↳` in the `#N` column.
  - Update inline `--help` text to document the new token shapes
    and `list` column order.

**Approach:** Origin §8 has the implementation sketch — adapt it.
Keep the existing column-parseable layout (whitespace-separated, UUID
trailing); downstream scripts that parse columns continue to work
because UUID is still present.

**Test scenarios:**
- `bun run feedback list --project mysite` → lines start with
  `#N`, UUID is the trailing column, replies show `↳`.
- `bun run feedback set-status #67 review --project mysite` →
  resolves to UUID, sets status, exits 0.
- `bun run feedback set-status 67 review --project mysite` →
  same as above (bare integer accepted).
- `bun run feedback get <uuid>` → resolves UUID directly (no
  `--project` needed).
- `bun run feedback delete #99999 --project mysite` (no such
  number) → exits non-zero with `"no comment #99999 in project
  mysite"`.
- `bun run feedback set-status 67 review` (no `--project` flag)
  → exits non-zero with clear message.
- Numbers from origin §8 "Claude resolves" section verified:
  `set-status #67 review`, `get #71`, `delete #4` all work.

**Patterns to follow:**
- Existing CLI command structure for `get` / `set-status` /
  `delete` (locate via `grep '^async function cmd'`).
- Existing PostgREST query string assembly for `?param=eq.value`
  shape.

**Verification:** type-check + lint + build clean. Run the CLI
against the dev Supabase project and exercise each command shape.

#### U12. `apply-ccm-feedback` skill rule update + lfg-tracked note

**Goal:** Document the `#N` resolution contract for Claude consumers
of the skill. Add the worked example session block.

**Requirements:** R8.

**Dependencies:** U7 (sequence numbers exist), U11 (CLI surface to
invoke).

**Files:**
- `skills/apply-ccm-feedback/SKILL.md` — add the "Comment
  reference resolution" section near the top, verbatim from
  origin §8 section 3 ("When the human refers to a comment by
  number..."). Include the worked example session block.
  Reference the CLI form: `feedback get #67 --project <name>`.
- `skills/apply-ccm-feedback/SKILL.md` — instruct the skill to
  prefer `record.sequenceNumber` over array index when reading
  export payloads.
- (Optional, per origin §8 section 4) — note in
  `~/.claude/.../lfg-tracked.md` only if that doc currently
  references feedback rows by UUID. If lfg-tracked is not in
  this repo, mention as a known follow-up in
  `docs/architecture.md` instead. **Skip** if lfg-tracked is not
  reachable from the worktree — do not introduce a new skill
  file outside this repo.

**Approach:** Pure documentation edit. The skill executor (Claude
in a client repo) honors these rules at runtime; no code change
needed beyond what U11 already shipped.

**Test scenarios:** none — documentation-only. Verification is a
read-through to confirm the section is present, the example block
is accurate, and the "halt on zero or many" rule is explicit.

**Verification:**
- `grep "#N" skills/apply-ccm-feedback/SKILL.md` returns the new
  section.
- `bun run lint` clean (no code change).
- Skill author re-reads the section and confirms it matches
  origin §8.

---

## Verification Strategy

The widget has no test suite. Verification at every phase gate is:

1. `bun run check` — TypeScript strict, `--noEmit`, must be clean.
2. `bun run lint` — biome check, must be clean.
3. `bun run build` — esbuild to `dist/w.js` (also copied to
   `public/w.js`), must succeed.
4. Manual browser smoke on the demo page via `bun run serve`
   (`http://localhost:5173`). The per-phase smoke checklists are the
   `Test scenarios` blocks under each unit; execute them all at the
   end of the phase before committing.

End-to-end smoke (after U12, before PR):

- FAB radial has six items (origin §"Verification" main
  checklist).
- Double-click FAB → drawer opens, radial does NOT expand.
- Drawer open → FAB and radial shift left with 0.25s transition;
  all six radial items reachable.
- Drawer close → FAB returns to bottom-right.
- ≤480px viewport + drawer open → FAB hidden.
- Enter pin mode → toolbar has eye + cancel. Toggle eye, drop
  multiple pins without re-opening radial.
- Yellow + blue badges reflect todo / review counts; cross-status
  changes update both surfaces.
- Drawer card status change → marker color updates, FAB badges
  refresh, both surfaces stay in sync.
- Three markers on one anchor → fan out side-by-side.
- Cloud mode realtime: window A changes status / drops marker /
  adds comment → window B's FAB / drawer / markers all update,
  `#N` matches A's.
- `bun run feedback list --project demo` shows `#N` leading
  column; `set-status #N review` works; `↳` shows for replies.
- Apply migration 0007 against a fresh dev project → no errors,
  trigger fires on insert.

## Risks & Mitigations

1. **Cluster fan-out conflicts with right-edge orphan lane.** Mitigation:
   gate the fan-out pass on `dataset.orphan === "false"`; verify
   with the orphan test scenario in U6.
2. **`renumber()` deletion leaves dangling call sites.** Mitigation:
   grep for `renumber` before the delete; run `bun run check` after.
3. **Cloud trigger race window producing duplicate sequence numbers.**
   Mitigation: accepted as v1 limitation, documented in
   `docs/cloud-mode.md`. Follow-up is the `unique
   (project_name, sequence_number)` constraint if seen.
4. **Pre-migration localStorage backfill running twice and re-assigning
   numbers.** Mitigation: backfill only fills missing values, never
   rewrites existing — verify in U8 test scenarios.
5. **FAB six-item radial wraps awkwardly on smaller screens.**
   Mitigation: smoke at 768px, 1024px, 1440px; if the fan visually
   collides at 768px, fall back to a two-row layout — document in
   `docs/architecture.md` and add to deferred work.
6. **PRO-67 popover dropdown re-render on drawer-driven status change
   may misfire if the popover is closing.** Mitigation: U5 subscriber
   checks `this.popoverStatusDropdown != null` before re-rendering;
   destroy path nulls the handle (already present in PRO-67 at
   `markers.ts:1231`).
7. **Migration `0007` ordering in `apply-migrations.sh` matters if a
   self-hoster has run 0006 partially.** Mitigation: `0007` is
   idempotent (`if not exists`); apply-migrations.sh appends to the
   ordered list. No backfill issue because the backfill respects
   `where parent_id is null` and PRO-66's reply rows already have
   `parent_id` set.

## Deferred Implementation Notes

Items not knowable until execution touches real code:

- The exact location of the area-mode toolbar construction in
  `src/capture-modes.ts` — `PinMode.activate()` is the reference;
  apply the same pattern.
- The eye-button helper signature in U3 (`buildToolbarEyeButton`
  vs inline in each mode) — pick at implementation time based on
  whether the bus subscription cleanly factors out.
- The fallback display for legacy rows missing `sequenceNumber` in
  U10 — `?` is the working assumption; switch to
  `record.id.slice(0, 6)` if `?` is visually awkward in the
  marker chip.
- FR i18n strings for `toolbar.toggleOn` / `toolbar.toggleOff`
  in U3 — verify with the existing `fab.toggleOn` translation
  tone; use a French-speaker review if the maintainer prefers.
- Whether `lfg-tracked.md` lives in this repo or globally
  (U12) — if not in repo, do not introduce.

## Branch & PR

- Branch: `feature/PRO-68-fab-toolbar-tweaks` (already created,
  do not switch).
- PR target: `dev`. **Never** merge to `main` per project CLAUDE.md.
- Commit per phase gate (A, B, C, D, E, F-core, G).
- Final PR description references this plan plus
  `docs/fab-toolbar-tweaks.md`.

## Pattern References

- `src/status-dropdown.ts` — PRO-67 shared dropdown (already
  exists; U5 consumes it).
- `src/markers.ts:899` — popover `createStatusDropdown` call site.
- `src/markers.ts:1199` — `onStatusPicked` handler shape.
- `src/markers.ts:203` — existing `annotations:toggle`
  subscription on `MarkerManager`.
- `src/fab.ts:230-242` — existing `case "toggle":` and
  `case "navigator":` branches being removed in U2.
- `src/store.ts:173` — `buildReplyRecord` reference for the
  no-sequence-number branch in U8.
- `src/cloud-store.ts` — `recordToRow` / `rowToRecord` pair to
  extend in U9.
- `supabase/migrations/0006_replies.sql` — PRO-66 migration
  precedent for the new 0007 file's shape.
- `scripts/feedback.ts` — existing `get` / `set-status` /
  `delete` command structure for U11.

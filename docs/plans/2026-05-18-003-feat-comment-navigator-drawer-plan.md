---
title: "feat: PRO-58 — comment navigator drawer"
type: feat
status: active
created: 2026-05-18
ticket: PRO-58
depth: standard
---

# feat: PRO-58 — comment navigator drawer

## Summary

Add a read-only **comment navigator drawer** to the `ccm-feedback` widget: a side panel inside the widget's open Shadow DOM that lists every annotation for the current project, filters by status, groups by page (current path first, other pages under a collapsible section), and jumps + flashes a marker when a row is clicked. View + navigate only — no editing or status changes from the drawer this pass.

Three findings from codebase research materially de-risk and shape this work:

1. **The drawer CSS already exists.** `src/styles/base.ts` ships a complete, currently-unused `.sp-panel` / `.sp-panel-header` / `.sp-filters` / `.sp-chips` / `.sp-chip` / `.sp-list` / `.sp-card` / `.sp-badge` / `.sp-empty` stylesheet (leftover SitePing panel CSS), and `src/styles/animations.ts` ships the `.sp-panel` slide-in transition (`.sp-panel--open` → `translateX(0)`) plus `.sp-card` stagger and forced-colors handling. No CSS authoring is required for the core layout — the work is wiring a new component to existing classes.
2. **Double-click on the FAB is already taken.** `src/fab.ts` binds `dblclick` → `openAll()` (opens the full radial menu including left-direction items) and guards single-click with `if (e.detail >= 2) return;`. The ticket's decision flag therefore resolves to **a dedicated FAB radial menu item**, not double-click — see Key Technical Decisions D1.
3. **i18n is English-only with FR carried as inline comments.** `src/i18n.ts` is a flat `STRINGS: Record<string,string>` map; PRO-57 added French as inline `// FR: "…"` annotations next to the English value (e.g. `"status.review": "Review", // FR: "À vérifier"`). The plan follows that exact convention — no locale map is introduced (D4).

This is a **Standard** plan. Local patterns are strong (the FAB radial-item pattern, the `MarkerManager` popover, the `Popup` focus trap, the four-strategy resolver, and the `el()`/`setText()` DOM helpers are all directly reusable), so no external research was performed.

---

## Problem Frame

The widget today surfaces comments only as on-page markers scoped to the current `path`. There is no way to see "everything for this project" in one place, no way to filter by status, and no way to find a comment that lives on a different page or scrolled far off-screen. PRO-57 added the `review` status to the agent loop; reviewers verifying agent work need a list view that shows what is in `review` and lets them jump straight to each marker to verify the edit in context.

PRO-58 adds that list as a side drawer. It is deliberately **read-only**: editing and status transitions stay on the marker popover (`src/markers.ts`) so the drawer is a navigation aid, not a second editing surface. Store mode (localStorage vs Supabase) is transparent — the drawer reads the active `AnnotationStore` through the existing common contract and renders identically either way.

Dependency context: PRO-57 Phase 1 is **merged to `dev`** (commit `c9bdeb2 feat(status): add review status end-to-end`). `FeedbackStatus = "todo" | "review" | "done" | "question"`, `FEEDBACK_STATUSES` includes `review`, and `STATUS_COLORS.review` is the blue/indigo entry in `src/popup.ts`. The drawer must render the `review` badge using that same `STATUS_COLORS` map so colors stay single-sourced.

---

## Scope Boundaries

**In scope:**

- A new `Drawer` component (`src/drawer.ts`) mounted inside the widget's open Shadow DOM, wired in `src/index.ts` alongside `Fab`, `Popup`, `MarkerManager`.
- A new dedicated FAB radial menu item that opens the drawer (D1).
- List of **all** annotations for the project via `store.list()`: truncated `message`, `authorName`, status badge (todo/review/done/question, colors from `STATUS_COLORS`), `kind` (target/pin/area), `path`.
- Status filter (chip row, reusing `.sp-chips` / `.sp-chip` / `.sp-chip--active`).
- Grouping: comments whose normalized `path` equals the current page path render first; all others render under a collapsible **"Other pages"** section.
- Row click → scroll to that annotation's marker and flash/highlight it, reusing the existing resolver (`src/dom/resolver.ts`) and `MarkerManager`.
- Unresolved-anchor row state ("can't locate on this page") — no crash; the row is visibly non-actionable.
- Close via X button, Esc key, and click-outside.
- Focus trap while open; Esc closes; list rows keyboard-navigable.
- All new strings in `src/i18n.ts`, English value + inline `// FR:` comment (D4).
- A new `EventBus` event so the FAB item opens the drawer through the existing typed pub/sub (D2).

**Out of scope / non-goals:**

- Editing, deleting, or changing status of comments from the drawer. View + navigate only. (Editing/status stays on the marker popover.)
- Any localStorage-vs-cloud behavioral difference or store-specific UI. The drawer reads whatever store is active; no Realtime-specific drawer logic beyond the existing `onChange` refresh hook (see D5).
- Double-click-FAB as the trigger (rejected — see D1).
- Search box. The leftover CSS includes `.sp-search`; the ticket asks for *filter by status* and *grouping*, not free-text search. Not building it. (Flagged below.)
- Cross-page navigation that changes `window.location`. Jump only scrolls/flashes when the anchor resolves **on the current page**; off-page rows show a passive "on another page" affordance, they do not navigate.
- Pagination / virtualized list. Comment counts are expected < 1000 (see `docs/architecture.md` performance notes); a plain scrolling list is acceptable. `.sp-load-more` CSS exists but is not wired.

### Deferred to Follow-Up Work

- **Free-text search in the drawer.** `.sp-search` + `.sp-search-icon` CSS already exist and `ICON_SEARCH` is defined in `src/icons.ts`, so a search box is cheap to add later, but it is outside PRO-58's stated scope (filter-by-status only). Flagged, not built.
- **Cross-page jump.** Clicking an "Other pages" row could push history / navigate to that path and then scroll. Out of scope here (anchoring is single-page by design per `docs/anchoring.md`); a later ticket could add opt-in navigation.
- **Deep-linking to a comment** (e.g. `#ccm-comment=<id>`). Not requested; noted as a natural follow-up to cross-page jump.

---

## Key Technical Decisions

### D1 — Trigger: dedicated FAB radial menu item (NOT double-click). **Decided.**

**Decision:** Add a new radial menu item (id `"navigator"`, label "Comments", left-direction) to the FAB's `items` array in `src/fab.ts`. Clicking it emits a new bus event that opens the drawer and closes the radial menu.

**Rationale (resolved by reading `src/fab.ts`):** Double-click on the FAB is already bound — `this.fab.addEventListener("dblclick", …) → this.openAll()` (lines 83–86), and single-click is explicitly guarded against double (`if (e.detail >= 2) return;`, line 80). `openAll()` is the documented gesture to reveal the full radial menu (the `"left"`-direction items: export, copyUrl, clear). Rebinding double-click to the navigator would either (a) silently break the existing "double-click reveals all actions" affordance, or (b) require a fragile single-vs-double timing race. For an unattended run that is an unacceptable regression risk. The radial menu is the established, discoverable home for every other top-level action (target, pin, area, toggle, export, copyUrl, clear) and already has icon + label + a11y + disabled-state plumbing the new item inherits for free. Direction `"left"` groups it with the other "manage existing feedback" actions (export/copyUrl/clear) rather than the "create new feedback" actions (target/pin/area), which is the correct mental model for a navigator. Reuse `ICON_CHAT` (a speech-bubble already in `src/icons.ts`) or `ICON_SEARCH`; implementer picks — see Open Questions Q1.

### D2 — Open via a new typed EventBus event, not a direct method call. **Decided.**

Add `"navigator:open": []` (and, if a programmatic close is wanted, `"navigator:close": []`) to `WidgetEvents` in `src/events.ts`. The FAB's `handleItemClick` emits `navigator:open` exactly as it emits `export:click` / `clear:click` today; `src/index.ts` subscribes and calls `drawer.open()`. This mirrors the existing FAB → bus → index.ts wiring for every other item and keeps `Fab` ignorant of `Drawer`. Esc / click-outside / X are handled inside `Drawer` directly (no bus round-trip needed for close), matching how `Popup` and the `MarkerManager` popover self-manage dismissal.

### D3 — Drawer lives in the Shadow DOM; markers stay outside it. **Decided.**

The ticket requires CSS isolation, and the leftover `.sp-panel` CSS is authored for the shadow root (uses `--sp-*` custom properties defined on `:host`). `Drawer` takes the `ShadowRoot` in its constructor and appends its root there, exactly like `Fab` (`shadowRoot.appendChild(this.root)`). Markers remain in the `document.body` overlay container owned by `MarkerManager` (they must hit-test against page elements). The jump action therefore crosses the boundary: the drawer (in shadow) asks `MarkerManager` (overlay outside shadow) to resolve + scroll + flash a given annotation id. That cross-boundary call is brokered through a new public method on `MarkerManager` (D6), not by reaching into the DOM.

### D4 — i18n: extend the flat `STRINGS` map with English values + inline `// FR:` comments. **Decided.**

`src/i18n.ts` is intentionally English-only for the MVP (a flat `Record<string,string>`), with French preserved as inline trailing comments next to each translatable string — the convention PRO-57 established (`"status.review": "Review", // FR: "À vérifier"`, `"fab.copyUrl": "…", // FR: "…"`). The plan adds every new drawer string the same way: English as the live value, `// FR: "…"` comment alongside. This satisfies the ticket's "EN + FR" requirement under the codebase's actual i18n reality without inventing a locale map (which would be out of scope and a much larger change). Status labels are **already** in the map (`status.todo|review|done|question`, `status.label`) and are reused as-is — the drawer must not duplicate them.

### D5 — Refresh strategy: re-render on open + hook the existing change signals. **Decided.**

The drawer reads `store.list()` when opened (always fresh). To stay live while open: (a) cloud mode already calls an `onChange` callback in `src/index.ts` (`markers.refresh(); fab.updateCount(...)`) on Realtime events and on `cs.init()` — extend that callback to also call `drawer.refreshIfOpen()`; (b) the existing `feedback:saved` / `feedback:deleted` bus events fire on local create/delete — `index.ts` can call `drawer.refreshIfOpen()` from those handlers too. No new store API and no store-specific UI (honors the out-of-scope boundary). If the drawer is closed, refresh is a no-op (cheap).

### D6 — Jump = new `MarkerManager.scrollToAndFlash(id)` public method reusing existing resolution. **Decided.**

`MarkerManager` already owns the resolved anchor for every rendered marker (`entry.anchorEl` is populated in `reposition()` via `resolveAnnotation`). Add a public method that: looks up the `MarkerEntry` by `record.id`; if the entry exists and is currently positioned (anchor resolved or pin/area coords present), `window.scrollTo` to bring the marker into view and apply a transient flash class; if the entry's anchor did not resolve (`display:none` / `anchorEl == null` and not a pin/area), return a boolean/false so the drawer can render the "can't locate" state. This reuses the four-strategy resolver indirectly (the marker was already resolved during `refresh()`/`reposition()`), so the drawer never re-implements anchoring. The flash reuses the existing animation vocabulary (`sp-anim-flash` / the `ccm-pulse` keyframe pattern) — implementer chooses the exact visual; the marker already supports a `ccm-pulse` box-shadow animation for `question` status that is a good model.

---

## High-Level Technical Design

```
                         Shadow DOM (CSS-isolated)            document.body (page-coordinate overlay)
                        ┌──────────────────────────┐         ┌───────────────────────────────────┐
  user clicks FAB       │  Fab                      │         │  MarkerManager                    │
  "Comments" item  ───▶ │   handleItemClick(        │         │   entries[]: {record, node,       │
                        │     "navigator")          │         │     anchorEl}                     │
                        │     bus.emit(             │         │   scrollToAndFlash(id) ◀──┐       │
                        │       "navigator:open")   │         │     → window.scrollTo     │       │
                        └───────────┬──────────────┘         │     → add flash class     │       │
                                    │                         └───────────────────────────┼──────┘
                          index.ts subscribes                                              │
                          bus.on("navigator:open",                                         │
                            () => drawer.open())                                           │
                                    │                                                      │
                        ┌───────────▼──────────────┐    row click (annotation id)          │
                        │  Drawer  (src/drawer.ts)  │───────────────────────────────────────┘
                        │   .sp-panel (existing CSS)│
                        │   header + X (Esc/outside)│   reads store.list()
                        │   .sp-chips status filter │   groups by normalizePath() vs
                        │   .sp-list                │   window.location.pathname
                        │     current-path cards    │
                        │     ── Other pages ▾ ──   │   refreshIfOpen() ← feedback:saved /
                        │     other-path cards      │      feedback:deleted / cloud onChange
                        │   focus trap, role=dialog │
                        └───────────────────────────┘
```

*This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

---

## Implementation Units

### U1. Add drawer i18n strings (EN value + inline FR comment)

**Goal:** Add every string the drawer needs to the `STRINGS` map in `src/i18n.ts`, following the established English-value + `// FR:` inline-comment convention. Reuse existing `status.*` and `status.label` keys (do not duplicate).

**Requirements:** PRO-58 "i18n: all drawer strings in src/i18n.ts — EN + FR".

**Dependencies:** none.

**Files:**
- `src/i18n.ts` (modify)

**Approach:**
- Add keys under a `drawer.*` namespace, e.g.: `drawer.title` ("Comments"), `drawer.aria` (panel `aria-label`), `drawer.close` (X button `aria-label`), `drawer.filterAll` ("All"), `drawer.empty` ("No comments yet"), `drawer.emptyFiltered` ("No comments match this filter"), `drawer.otherPages` ("Other pages"), `drawer.otherPagesCount` ("Other pages ({n})"), `drawer.currentPage` ("This page"), `drawer.cantLocate` ("Can't locate on this page"), `drawer.openAria` / `fab.navigatorLabel` ("Comments" — the FAB item label), `drawer.rowAria` ("Comment {n}: {message}") as needed.
- Each new entry carries a trailing `// FR: "…"` comment with the French translation, mirroring `"status.review": "Review", // FR: "À vérifier"`. Suggested FR: `drawer.title` → "Commentaires", `drawer.otherPages` → "Autres pages", `drawer.cantLocate` → "Introuvable sur cette page", `drawer.empty` → "Aucun commentaire", `fab.navigatorLabel` → "Commentaires". (Implementer may refine FR wording; the structural requirement is the inline-comment convention, not exact phrasing.)
- Do NOT add a locale map or change `createT()` — value stays English, FR stays in comments (D4).
- Reuse `status.todo|review|done|question` and `status.label` for badges and the filter row; the only new status-related string is the "All" filter chip (`drawer.filterAll`).

**Patterns to follow:** Existing `STRINGS` entries with `// FR:` comments (`fab.copyUrl`, `fab.copyUrlLocalOnly`, `status.review`, `toast.urlCopied`, `toast.urlCopyFailed`). Interpolation uses `{n}` / `{message}` placeholders resolved by the existing `createT()` regex.

**Test scenarios:** `Test expectation: none -- pure string-table additions, no behavioral logic. Exercised indirectly by U3/U4 verification (labels render in EN; FR comments are present and reviewable). Covered by bun run check + bun run lint.`

**Verification:**
- `bun run check` green; `bun run lint` green.
- Every new `drawer.*` / `fab.navigatorLabel` key has both an English value and a `// FR:` trailing comment.
- No duplication of existing `status.*` keys.

---

### U2. Add the FAB "Comments" radial item + `navigator:open` event

**Goal:** Add a dedicated radial menu item that, when clicked, emits a new typed bus event to open the drawer; wire the new event into `src/events.ts`. No change to single-click or double-click FAB behavior.

**Requirements:** PRO-58 "Trigger: … fall back to a dedicated FAB menu item — the plan must pick one" (resolved: dedicated item, D1).

**Dependencies:** U1 (uses `fab.navigatorLabel`).

**Files:**
- `src/events.ts` (modify — add `"navigator:open": []` to `WidgetEvents`; optionally `"navigator:close": []`)
- `src/fab.ts` (modify — add the `navigator` item to `items`, handle it in `handleItemClick`)
- `src/icons.ts` (no change expected — reuse `ICON_CHAT` or `ICON_SEARCH`; only add a new icon if neither fits, see Q1)

**Approach:**
- In `src/fab.ts`, extend the `RadialItem` `id` union with `"navigator"` and push `{ id: "navigator", icon: ICON_CHAT, label: t("fab.navigatorLabel"), direction: "left" }` into `this.items`. Placing it `"left"` groups it with export/copyUrl/clear (manage-existing actions) and keeps the `"up"` create actions (target/pin/area/toggle) unchanged. Confirm the existing `--sp-i` stagger index and `slot.left` offset math in `openMode()` handle the extra left item without overlap (the offset is computed dynamically per direction, so it should — verify visually).
- In `handleItemClick`, add `case "navigator": this.bus.emit("navigator:open"); break;` (note `this.close()` already runs first in `handleItemClick`, so the radial menu collapses before the drawer opens — desired).
- Do NOT touch the `click` (`e.detail >= 2` guard) or `dblclick` (`openAll()`) listeners. Double-click continues to open the full radial menu; the navigator item is reachable from both the single-click "up" menu? — No: it is `"left"`, so it shows only in `openAll()` / "all" mode. Decision sub-point: to make the navigator reachable from a **single** FAB click, the item must be reachable in `"up"` mode OR the FAB needs an always-visible affordance. See Open Questions Q2 for the recommended resolution (default: make the navigator item `direction: "up"` so a single FAB click surfaces it, consistent with target/pin/area/toggle being the primary single-click actions).

**Patterns to follow:** The existing radial items (`export`, `copyUrl`, `clear`) — same `RadialItem` shape, same `bus.emit` in `handleItemClick`, same `direction` semantics. Event addition mirrors `"export:click": []` / `"clear:click": []` in `WidgetEvents`.

**Test scenarios:**
- Happy path: clicking the "Comments" radial item emits `navigator:open` exactly once and collapses the radial menu (FAB returns to closed state, `aria-expanded="false"`).
- Edge: single FAB click opens the radial menu and the "Comments" item is present and focusable among the visible items (per Q2 resolution).
- Edge: double-click FAB still calls `openAll()` and reveals all items including "Comments"; double-click behavior is unchanged from before this unit.
- A11y: the new item has `role="menuitem"` and an `aria-label` from `fab.navigatorLabel` (inherited from the existing item-construction loop).
- Regression: target/pin/area/toggle/export/copyUrl/clear still emit their original events; no item id collision.

**Verification:**
- `bun run check` green (the `RadialItem["id"]` union and `WidgetEvents` addition typecheck end-to-end).
- Manual: open FAB → "Comments" item visible with icon + label; clicking it opens the drawer (after U3); other items unaffected.

---

### U3. Build the `Drawer` component (panel shell, list, status filter, grouping, close)

**Goal:** Implement `src/drawer.ts` — a Shadow-DOM side panel that renders all project annotations as cards, filters by status, groups current-path-first with a collapsible "Other pages" section, and closes via X / Esc / click-outside, with a focus trap and keyboard-navigable rows.

**Requirements:** PRO-58 "Drawer", "Grouping/filter", "Close", "A11y". (Jump behavior is U4.)

**Dependencies:** U1 (strings), U2 (the `navigator:open` event it is opened by — wired in U5).

**Files:**
- `src/drawer.ts` (create)
- `src/drawer.test-notes.md` — N/A (no test suite in repo; see Test scenarios note)

**Approach:**
- Constructor signature mirrors `Fab`/`MarkerManager`: `constructor(shadowRoot, bus, t, store, colors)`. Append the panel root to `shadowRoot` (D3). Build DOM with the existing `el()` / `setText()` helpers and `parseSvg()` for the close icon (`ICON_CLOSE`) — never `innerHTML` for any record-derived content (`message`, `authorName`, `path` must go through `setText`, matching `dom-utils.ts` security posture).
- Use the **existing** classes from `src/styles/base.ts` / `animations.ts`: root `.sp-panel` (+ `.sp-panel--open` toggled on open/close for the slide transition), `.sp-panel-header` with `.sp-panel-title` and `.sp-panel-close`, a `.sp-filters` row of `.sp-chips`/`.sp-chip` (status filter incl. an "All" chip and one chip per `FEEDBACK_STATUSES` entry, `.sp-chip--active` on the selected one), `.sp-list` scroll container, `.sp-card` rows (`.sp-card-bar` colored from `STATUS_COLORS[status].border`, `.sp-card-body`, `.sp-card-header` with `.sp-card-number` + `.sp-badge` + `.sp-card-date`, `.sp-card-message` for the truncated message — CSS already clamps to 3 lines), `.sp-empty` for empty/filtered-empty states.
- **Status badge:** reuse `STATUS_COLORS` imported from `src/popup.ts` (single source — D-context from PRO-57). Badge text = `t("status." + status).toUpperCase()` exactly like `markers.ts` does for its status pill. The blue `review` entry renders automatically because it is already in `STATUS_COLORS` and `FEEDBACK_STATUSES`.
- **Kind + path:** show `record.kind ?? "target"` and `normalizePath(record.path)` in the card (small/tertiary text). `normalizePath` is exported from `src/store.ts`.
- **Data source:** `store.list()` (ALL annotations for the project — not `listForPath`). Apply the active status filter, then partition into two groups by `normalizePath(record.path) === normalizePath(window.location.pathname)`: current-page group rendered first (no header or a "This page" header), other-page group rendered under a collapsible **"Other pages ({n})"** disclosure (a `<button>` toggling a `hidden`/expanded sub-list; collapsed by default is acceptable, expanded is also acceptable — implementer's call, default collapsed to keep the current page primary).
- **Sort within a group:** newest first (records already arrive newest-first from `Store.save` `unshift`; cloud store ordering should be normalized — sort by `createdAt` desc to be store-agnostic, honoring "no store-specific behavior").
- **Close:** `.sp-panel-close` click; `Escape` keydown while open (consume + stopPropagation so it does not also bubble to other Esc handlers — note `Fab` and `Popup` already have Esc handlers; the drawer's must only act when the drawer is open and should not close the FAB radial); document-level click-outside using `e.composedPath()` not including the panel host (mirror `Fab.onDocumentClick`'s composed-path check and `MarkerManager.onDocClick`). Remove the document listener when closed/destroyed.
- **Focus trap:** mirror `Popup`'s `onKeydownTrap` implementation (Tab / Shift+Tab cycle within `.sp-panel` focusable elements; restore focus to the previously focused element on close — `Fab`'s FAB button is the natural return target since the drawer is opened from it). Set `role="dialog"`, `aria-modal="true"` is debatable for a non-blocking side panel — use `role="dialog"` + `aria-label`; do NOT set `aria-modal="true"` because the page behind stays interactive (a side drawer is not a modal). Rows are `<button>` elements (keyboard-focusable, Enter/Space activate) — reuse the `.sp-card` styling on a `button`.
- **`open()` / `close()` / `refreshIfOpen()` / `destroy()`** public API. `open()` builds/refreshes content, adds `.sp-panel--open`, moves focus into the panel, registers the outside-click + Esc + focus-trap listeners. `close()` reverses. `refreshIfOpen()` re-renders the list only if currently open (D5). `destroy()` removes listeners + root (called from the widget `destroy()` in `index.ts`, U5).

**Patterns to follow:**
- `src/fab.ts` — constructor takes `shadowRoot`, appends root, document-click composed-path dismissal, Esc handler scoping.
- `src/popup.ts` — `onKeydownTrap` focus-trap implementation, `previouslyFocused` save/restore, `role="dialog"` + `aria-label`.
- `src/markers.ts` — `STATUS_COLORS[status]` usage, `t("status." + status).toUpperCase()` badge text, `record.kind ?? "target"`, `el()`/`setText()` safe DOM construction.
- `src/store.ts` — `normalizePath()` for path grouping.

**Test scenarios:** (No automated test suite exists in this repo — `CLAUDE.md`: "Verification = `bun run check` + `bun run lint` + manual browser smoke test". These are the manual browser scenarios the implementer must walk through and the typecheck the build must pass; they are real acceptance scenarios, not optional.)
- Happy path: with mixed annotations across statuses and paths, opening the drawer renders one card per `store.list()` record; current-page records appear above the "Other pages" section; each card shows truncated message, author, status badge, kind, path.
- Status filter: clicking a status chip shows only matching records and re-applies the current/other-page partition; clicking "All" restores the full list; the active chip has `.sp-chip--active`.
- `review` badge: a record with `status: "review"` renders a badge using the blue `STATUS_COLORS.review` colors and the localized "Review" label (PRO-57 dependency — explicit acceptance check).
- Empty states: zero annotations → `.sp-empty` "No comments yet"; a filter that matches nothing → "No comments match this filter".
- Grouping edges: all records on current page → "Other pages" section absent (or shows 0 and is omitted); all records off current page → current-page group empty/omitted, "Other pages" present; SPA path change while open is acceptable to require a manual re-open or refresh (not in scope to live-track path here — note in PR).
- Close: X click closes (slide-out); Esc while open closes and does NOT close/disturb the FAB; click outside the panel closes; click inside the panel does not close.
- A11y: Tab/Shift+Tab stay within the panel while open; focus returns to the FAB on close; rows are reachable by keyboard and activate on Enter/Space; panel has `role="dialog"` + `aria-label`; status chips are buttons with discernible labels.
- Theme: renders correctly in light and dark (the `.sp-panel` CSS consumes `--sp-*` tokens which `buildThemeColors` already sets per theme — verify no hardcoded color regressions).
- Security: a record whose `message`/`authorName`/`path` contains HTML/script renders as literal text (set via `setText`), not parsed.

**Verification:**
- `bun run check` green; `bun run lint` green.
- Manual browser smoke (demo page, both themes, EN): all scenarios above pass; no console errors; widget still mounts and FAB/markers/popup unaffected.

---

### U4. Jump-to-marker + flash, with unresolved-anchor row state

**Goal:** Clicking a drawer row scrolls the page to that annotation's marker and visually flashes it; if the annotation's anchor does not resolve on the current page, the row renders a non-actionable "can't locate on this page" state instead of attempting (and failing) to scroll.

**Requirements:** PRO-58 "Jump", "If the anchor no longer resolves … show a 'can't locate on this page' row state — do not crash".

**Dependencies:** U3 (the rows exist), U2 (event types — only if a bus hop is used; default is a direct `MarkerManager` method call brokered by `index.ts`, see Approach).

**Files:**
- `src/markers.ts` (modify — add `scrollToAndFlash(id: string): boolean` public method; optionally a `hasResolved(id): boolean` helper for the row-state precompute)
- `src/drawer.ts` (modify — row click handler calls into the marker manager; render unresolved state)
- `src/index.ts` (modify — pass a jump callback into `Drawer`, or give `Drawer` a reference to `MarkerManager`; see Approach)
- `src/styles/animations.ts` (modify only if a new flash keyframe is needed — prefer reusing `sp-anim-flash` / the `ccm-pulse` pattern; no change expected)

**Approach:**
- Add `MarkerManager.scrollToAndFlash(id)`: find the `MarkerEntry` whose `record.id === id`. Run `reposition()` (or rely on the last reposition) so `entry.node` has current coords and `entry.anchorEl` reflects resolution. Resolution rule:
  - `kind === "pin"` with `pinX/pinY`, or `kind === "area"` with area coords → always locatable (coordinate-anchored, no DOM resolution needed).
  - `kind === "target"` → locatable iff the entry's marker is currently displayed (anchor resolved; `entry.node.style.display !== "none"` / `entry.anchorEl != null`). `MarkerManager.reposition()` already sets `display:none` and `anchorEl=null` when `resolveAnnotation` returns null — reuse that exact signal; do not re-run the resolver separately.
  - If not locatable → return `false` (drawer renders the unresolved state).
  - If locatable → ensure markers are visible (if the user had toggled them off, either temporarily show or still scroll — default: scroll regardless; do not force-toggle global marker visibility, just scroll to the coordinate and flash). Compute the marker's page Y from `entry.node.style.top` (already page-coordinate px) and `window.scrollTo({ top: y - viewportHeight/3, behavior: "smooth" })`. Apply a transient flash: add a flash class to `entry.node` for ~600ms then remove it (reuse the `ccm-pulse` box-shadow keyframe that `markers.ts` already injects for `question` status, or `sp-anim-flash`; pick one and keep it single-sourced). Return `true`.
- Wiring (avoid a new bus event for a return-value call): in `src/index.ts`, construct `Drawer` with a jump function, e.g. `new Drawer(shadow, bus, t, store, colors, (id) => markers.scrollToAndFlash(id))`. The drawer calls the callback on row click; a `false` return flips that row into the unresolved state immediately (and the row should also be precomputed as unresolved at render time when possible, so unresolved rows look passive before the click — use the same locatability check, exposed via a small `MarkerManager` helper or by having the drawer ask the callback in a "probe" mode; default: precompute via a `markers.canLocate(id)` helper to keep the row visibly non-actionable from first render).
- Unresolved row state: visually de-emphasize (reuse `.sp-card--resolved` opacity treatment or a dedicated muted style), replace the click affordance with a static `t("drawer.cantLocate")` line, and set `aria-disabled="true"` / make the row a non-button or a disabled button so keyboard users get the same signal. Never throw — a missing entry or unresolved anchor is a normal state.

**Patterns to follow:**
- `src/markers.ts` `reposition()` — the `entry.anchorEl` / `display:none` resolution signal, the `ccm-pulse` keyframe injection, page-coordinate `top`/`left` math (`rect.top + window.scrollY`).
- `src/index.ts` callback-injection pattern — `Drawer` gets a jump callback the same way `PinMode`/`CoordPinMode`/`AreaMode` get `openPopupForElement`/`onPinCapture`/`onAreaCapture` callbacks (constructor-injected functions, not bus events, when a return value or direct invocation is needed).
- `docs/anchoring.md` — orphaned annotations resolve to `null`; the marker simply is not rendered. The drawer's unresolved state is the list-view equivalent of that documented behavior.

**Test scenarios:**
- Happy path (target): clicking a row whose target anchor resolves scrolls the page so the marker is in view and the marker visibly flashes once.
- Happy path (pin/area): clicking a pin or area row scrolls to its coordinate and flashes (no DOM resolution involved; always locatable).
- Unresolved anchor: a target annotation whose element was removed from the DOM → its row renders the muted "can't locate on this page" state from first render, is not keyboard-activatable, and clicking it does nothing (no scroll, no throw, no console error).
- Off-page record: a record whose `path` differs from the current page → treated as not locatable here (its marker is not rendered on this page), shows the "can't locate"/"on another page" affordance; clicking does not navigate (out of scope) and does not crash.
- Toggled-off markers: with marker visibility toggled off via the FAB, clicking a row still scrolls to the location without forcing global markers back on (or, if implementer chooses to briefly reveal, document it) — no crash either way.
- Reduced motion: with `prefers-reduced-motion: reduce`, the scroll/flash still locates the marker (animation duration is clamped by the existing global reduced-motion rule; behavior must not break).
- Resilience: calling `scrollToAndFlash` with an id that has no entry returns `false` and does nothing.

**Verification:**
- `bun run check` green; `bun run lint` green.
- Manual browser smoke: jump works for target/pin/area; flash is visible; delete the anchored element via devtools then reopen drawer → that row is the unresolved state; no uncaught errors in any case; light + dark.

---

### U5. Wire `Drawer` into the widget lifecycle (`index.ts`) + live refresh + destroy

**Goal:** Instantiate `Drawer` in `initCcmFeedback`, subscribe to `navigator:open`, refresh it on the existing change signals, and tear it down in the widget `destroy()`.

**Requirements:** PRO-58 (integration glue tying U2–U4 together; "the drawer reads from whatever store is active").

**Dependencies:** U2 (`navigator:open` event), U3 (`Drawer` class), U4 (jump callback).

**Files:**
- `src/index.ts` (modify)

**Approach:**
- After `const fab = new Fab(...)`, construct `const drawer = new Drawer(shadow, bus, t, store, colors, (id) => markers.scrollToAndFlash(id));`.
- `bus.on("navigator:open", () => drawer.open());` (and `"navigator:close"` if added in U2).
- Live refresh (D5): in the cloud `onChange` callback (currently `markers.refresh(); fab.updateCount(...)`) add `drawer.refreshIfOpen();`. Also add `drawer.refreshIfOpen()` to the local-mutation paths so a comment saved/deleted while the drawer is open updates it: the `feedback:saved` path (after `markers.addOne`) and the `clear:click` handler (after `markers.refresh()`), and subscribe to `feedback:deleted` (currently only emitted by `markers.ts`; `index.ts` does not listen) to call `drawer.refreshIfOpen()`. Keep these additive — do not change existing marker/fab behavior.
- Add `drawer.destroy()` to the `instance.destroy()` block alongside `fab.destroy()` / `popup.destroy()` / `markers.destroy()`.
- The `useCloud` flag is irrelevant to the drawer (it reads `store` through the `AnnotationStore` contract) — do NOT branch drawer behavior on cloud vs local (honors out-of-scope boundary).

**Patterns to follow:** The existing component construction + `bus.on(...)` subscriptions + `instance.destroy()` teardown block in `src/index.ts` (lines ~100–276). The cloud `onChange` callback and the `feedback:saved` / `clear:click` handlers are the exact extension points.

**Test scenarios:**
- Happy path: FAB "Comments" item → drawer opens (full `navigator:open` → `drawer.open()` path proven end-to-end).
- Integration (local): with the drawer open, creating a new comment via target/pin/area updates the drawer list without reopening; deleting a comment from a marker popover removes its row from the open drawer.
- Integration (cloud): with cloud mode active and the drawer open, a Realtime change (covered by the existing `onChange` hook) triggers `drawer.refreshIfOpen()` and the list updates (manually verifiable against the demo Supabase project or by simulating the `onChange` callback).
- Lifecycle: calling `window.CcmFeedback` instance `destroy()` removes the drawer, its listeners, and leaves no dangling document-level click/keydown handlers (re-init works cleanly).
- Regression: existing flows (target/pin/area capture, export, copyUrl, clear, marker popover, toggle) behave exactly as before; the drawer additions are purely additive.

**Verification:**
- `bun run check` green; `bun run lint` green.
- Manual browser smoke: open via FAB item; create/delete a comment with the drawer open and watch it update; destroy + re-init the widget with no leaked listeners; EN + FR (FR verified by reading the inline `// FR:` comments — there is no runtime locale switch, per D4); light + dark.

---

## System-Wide Impact

| Surface | Impact |
|---|---|
| `src/i18n.ts` | New `drawer.*` + `fab.navigatorLabel` keys (additive; no call-site changes elsewhere). |
| `src/events.ts` | New `navigator:open` (and optional `navigator:close`) event in `WidgetEvents` (additive union member; typechecks all `bus.emit`/`bus.on` sites). |
| `src/fab.ts` | One new radial item + one `handleItemClick` case; single/double-click handlers untouched. |
| `src/markers.ts` | New public `scrollToAndFlash(id)` (+ optional `canLocate(id)`) reusing existing resolution state; no change to render/reposition logic. |
| `src/index.ts` | New `Drawer` instantiation, one `bus.on`, additive `refreshIfOpen()` calls in existing handlers, one `destroy()` line. |
| `src/drawer.ts` | New file. |
| `src/styles/*` | No changes expected — `.sp-panel*` / `.sp-card*` / `.sp-chip*` / `.sp-empty` / `.sp-panel--open` already exist. (Only touch `animations.ts` if a bespoke flash keyframe is unavoidable — prefer reuse.) |
| Build (`esbuild.config.mjs` → `dist/w.js` / `public/w.js`) | Bundle grows by one module; no config change. Watch bundle size (architecture doc cites ~30 KB target) — a list component is small but note it. |
| Stores | Read-only consumption of the existing `AnnotationStore.list()`; no store API change, no migration, no Supabase schema change. |

---

## Verification (whole-plan)

Per `CLAUDE.md` (no automated test suite): verification = typecheck + lint + manual browser smoke on the demo page.

- `bun run check` — green (TS strict + `exactOptionalPropertyTypes`; the new event union, `RadialItem` id, `Drawer` API, and `scrollToAndFlash` signature must all typecheck).
- `bun run lint` — green (biome).
- `bun run serve` then on the demo page:
  - Open the drawer via the FAB "Comments" item (single-click path per Q2 resolution); confirm double-click FAB still opens the full radial menu unchanged.
  - List renders all project comments with correct status badges **including the blue `review` badge** (PRO-57 dependency), kind, author, truncated message, path.
  - Status filter narrows/restores the list; "All" resets; active chip highlighted.
  - Current-page comments appear above a collapsible "Other pages" section; counts correct.
  - Click a resolvable row → page scrolls to the marker and it flashes (test target, pin, and area kinds).
  - Remove an anchored element via devtools, reopen the drawer → that row shows the "can't locate on this page" state; clicking it does nothing and throws nothing.
  - Close via X, via Esc (does not disturb the FAB), and via click-outside.
  - Focus trap holds while open; focus returns to the FAB on close; rows keyboard-navigable (Tab + Enter/Space).
  - Repeat the core checks in **dark** theme and confirm visual correctness.
  - EN strings render correctly; FR strings present as inline `// FR:` comments in `src/i18n.ts` (no runtime locale switch exists — this is the codebase's actual i18n posture per D4).
  - No console errors; existing capture/export/clear/marker-popover/toggle flows still work (regression pass).

---

## Open Questions / Decisions for the Implementer

1. **Which icon for the FAB "Comments" item?** No dedicated "list/navigator" icon exists in `src/icons.ts`. **Recommended default:** reuse `ICON_CHAT` (speech-bubble, semantically "comments") for the radial item. `ICON_SEARCH` is the alternative but reads as "find", and search is explicitly out of scope. Only add a new icon constant if neither reads well in the radial; if added, follow the existing `icons.ts` SVG-string convention (24×24 viewBox, `stroke="currentColor"`, `aria-hidden="true"`).

2. **Single-click reachability of the navigator item (`direction` choice).** D1 places the item `"left"` to group it with manage-existing actions, but `"left"` items only show in `openAll()` ("all" mode, i.e. double-click), so a single FAB click would NOT surface it. The ticket wants the trigger to be a discoverable FAB menu item. **Recommended default: set the navigator item's `direction: "up"`** so a single FAB click (the primary, most-discoverable gesture) reveals it alongside target/pin/area/toggle. This slightly contradicts the "group with manage actions" rationale in D1 but correctly prioritizes discoverability for the ticket's primary requirement (the item must be easily reachable). Net decision: **dedicated radial item, `direction: "up"`, single-click reachable; double-click `openAll()` unchanged and also shows it.** Implementer: if the "up" column becomes visually crowded (5 items: target/toggle/pin/area/navigator), consider whether `toggle` or the new item needs spacing tuning in `openMode()` — the offset math is dynamic so it should not overlap, but verify visually in the smoke test.

3. **"Other pages" default expanded vs collapsed.** Ticket says "other-path comments under a collapsible 'Other pages' section" — collapsibility is required, default state is not specified. **Recommended default: collapsed**, so the current page (the reviewer's working context) is primary and the list is short by default. Implementer may choose expanded if testing shows collapsed hides too much; either satisfies the requirement.

4. **Flash visual: reuse `ccm-pulse` vs `sp-anim-flash` vs new keyframe.** Both `ccm-pulse` (box-shadow ring, used for `question` markers, injected by `markers.ts`) and `sp-anim-flash` (background fade, in `animations.ts`) exist. **Recommended default: reuse the `ccm-pulse` box-shadow ring on the marker node** for ~600ms — it is already marker-scoped, reads as "look here", and avoids touching `styles/`. Do NOT author a new keyframe unless neither is visible enough against the marker's existing styling; if a new one is needed, add it to `src/styles/animations.ts` following the `@keyframes sp-*` convention and keep it single-sourced.

5. **Markers toggled off during a jump.** If the reviewer toggled markers off (FAB toggle), a jumped-to marker has `display:none`. **Recommended default: still scroll to the location and skip the flash (nothing visible to flash), without force-re-enabling global marker visibility** — re-enabling would override an explicit user choice and is a surprising side effect. Acceptable alternative: briefly reveal just that one marker for the flash then restore; only do this if it can be done without disturbing the global toggle state. Implementer's call; default is the simpler, less-surprising behavior.

6. **No automated tests exist (repo reality).** `CLAUDE.md` states there is no test suite; verification is `bun run check` + `bun run lint` + manual browser smoke. The "Test scenarios" in this plan are therefore the **manual acceptance scenarios** the implementer must walk through (and the typecheck the build must pass), not files to author. Do not introduce a test framework as part of PRO-58 (out of scope); if regression coverage is desired it is a separate ticket.

# PRO-67 — `MarkerManager.destroy()` does not abort in-flight drag / watcher

**Severity:** P1
**File:** `src/markers.ts`
**Lines:** 1257–1267 (`destroy`), 376–437 (`attachDragOrClickWatcher`), 457–716 (`enterDragMode`)
**Discovered by:** ce-code-review autofix (PRO-67, PR #32)

## Problem

`MarkerManager.destroy()` tears down the resize/scroll/click/popstate listeners and the marker container, but it does NOT abort:

1. An in-flight **drag-or-click watcher** (`attachDragOrClickWatcher`). If destroy fires between `mousedown` and `mouseup`:
   - `longPressTimer` continues to fire (calls `promote` → `enterDragMode` on a destroyed manager).
   - The window-level `mousemove` (line 435) and `mouseup` (line 436) capture-phase listeners stay bound; their closures retain references to `this` (MarkerManager).

2. An in-flight **drag mode** (`enterDragMode`). If destroy fires while the user is mid-drag:
   - `overlay` and `toolbar` are appended directly to `document.body` (lines 509–510). `this.container.remove()` does not clean them up — they leak into the DOM.
   - Five global listeners stay bound: `mousemove`/`mouseup`/`keydown`/`contextmenu`/`popstate` (lines 711–715). Their closures retain `this`, the entry's node, and the hover-outline helper.
   - `hoverOutline` (created on line 468) stays alive with any element it has outlined still styled.

## Impact

Real but narrow. SPA hosts that re-init the widget (e.g. `instance.destroy()` then `initCcmFeedback(...)` again) at a moment that coincides with an in-flight mouse gesture will leak overlay DOM + a closure graph rooted at MarkerManager. In normal usage (full-page teardown) the leak is harmless because the document is being unloaded.

## Suggested fix

Track the drag-cleanup function (and the watcher cleanup function) on the `MarkerManager` instance:

```ts
private dragCleanup: (() => void) | null = null;
private watcherCleanups = new Set<() => void>();
```

- In `attachDragOrClickWatcher`: when `mousedown` registers the global listeners (line 435–436), push the `cleanup` closure into `this.watcherCleanups`; remove it inside the existing `cleanup` body.
- In `enterDragMode`: capture the `cleanup` reference as `this.dragCleanup = cleanup` immediately after declaring it; null it inside `cleanup`.
- In `destroy()`: invoke `this.dragCleanup?.()` and `for (const fn of this.watcherCleanups) fn();` before removing the container.

Add a manual repro to verification: run `instance.destroy()` from devtools while holding `mousedown` on a marker; confirm overlay/toolbar DOM nodes are gone and `getEventListeners(window)` shows no leaked `mousemove`/`mouseup`/`contextmenu` entries.

## Autofix classification

`manual` — owner `downstream-resolver`. Not safe to apply blindly in autofix mode because the cleanup tracking touches three call sites and the existing watcher closure pattern; needs a careful read of the watcher's promotion-handoff to drag mode to make sure the cleanup isn't double-called when promotion transfers ownership from watcher to drag.

## Verification

- `bun run check` clean.
- `bun run lint` clean.
- Manual: as above (mid-drag `destroy()` leaves no overlay DOM, no listener residue).

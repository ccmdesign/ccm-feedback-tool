# PRO-67 — popstate handler ordering during in-flight drag

**Severity:** P2
**File:** `src/markers.ts`
**Lines:** 161–177 (outer `onPopState`), 585–587 + 715 (`dragSpaNav`)
**Discovered by:** ce-code-review autofix (PRO-67, PR #32)
**Status:** resolved (Option 2) — `MarkerManager.dragInFlight` flag is set in `enterDragMode`, cleared in its `cleanup()`. The outer `checkPath` early-returns when `dragInFlight`, so SPA nav mid-drag no longer rebuilds the entries array out from under the drag closure. The drag's own capture-phase `dragSpaNav` still cancels the gesture. `bun run check` + `bun run lint` clean.

## Problem

Both the outer `MarkerManager.onPopState` (line 166) and the per-drag `dragSpaNav` (line 585) are bound to `window.popstate`. The outer one calls `checkPath` → `this.refresh()` which calls `closePopover()` and then `entry.node.remove()` for every entry, including the one currently being dragged.

When SPA navigation fires mid-drag, the listener order is not guaranteed (`addEventListener` order is preserved per-target, but the outer was added in the constructor first). The outer fires first → `refresh()` removes `entry.node` from the DOM → `dragSpaNav` then runs `cancel()` → `cleanup()` → `this.reposition()` which tries to set styles on a removed node (still in `this.entries` via `refresh()` rebuilding the array? No — `refresh()` REPLACES `this.entries`, so the captured `entry` in `enterDragMode`'s closure is now stale).

The visible result: marker DOM gets cleaned up correctly (overlay/toolbar removed because `cleanup` runs unconditionally), but `reposition()` operates on the new entries set, and the stale `entry.node` (now detached) is mutated by `cleanup` lines 572–576 — harmless because it's detached, but a small wasted-work code smell.

## Impact

UX-imperceptible. No memory leak — once `cleanup` finishes, the closures over the stale entry/node die.

## Suggested fix

Either:
1. Make `dragSpaNav` cancel **synchronously before** the outer listener runs by binding it with `capture: true` (already done — line 715) AND ensuring the outer also uses capture (line 167 currently uses default — bubble phase). Bind the outer with capture too, or
2. Set a `this.dragInFlight: boolean` flag in `enterDragMode`, check it in the outer `checkPath` and skip `refresh()` if a drag is in flight (the drag's own `dragSpaNav` will cancel and reposition).

Option 2 is cleaner — single source of truth for "we're dragging, defer refresh".

## Autofix classification

`gated_auto` — small concrete change but touches the SPA-nav refresh path which is shared with `refresh()`-on-path-change behaviour; needs a quick manual smoke test in PinMode + drawer to confirm no regression.

## Verification

- `bun run check` clean.
- `bun run lint` clean.
- Manual: start a drag, `history.pushState({}, "", "/x")` from devtools, confirm overlay tears down and original marker is preserved (no removal flicker).

# PRO-68 — `Fab.setModeActive` clobbers `savedHostZIndex` on re-entry

**Status:** RESOLVED — re-entrance guards added to `setModeActive` + `onModeStart`.
**Severity:** P3 (defensive — not reachable in current UI flow)
**Owner:** downstream-resolver
**Files:** `src/fab.ts:232-239`, `src/fab.ts:241-251`

## Finding

```ts
setModeActive(active: boolean): void {
  if (active) {
    this.savedHostZIndex = this.hostEl.style.zIndex;  // ← read-then-overwrite
    this.hostEl.style.zIndex = String(Z_INDEX_MAX);
  } else {
    this.hostEl.style.zIndex = this.savedHostZIndex;
  }
}
```

If `setModeActive(true)` fires a second time while the host is already
lifted (e.g. a stray `pin:start` bus event arrives while a target capture
is in flight without a matching `*:end`), `savedHostZIndex` is overwritten
with the already-lifted `Z_INDEX_MAX` string. On the next
`setModeActive(false)`, the host stays at `Z_INDEX_MAX` forever — the
original z-index is gone.

`onModeStart()` (line 241) guards against same-mode re-entry by checking
`this.activeMode === mode` in `onModeEnd` only — it does NOT short-circuit
a second `onModeStart` while `activeMode != null`.

## Why this matters

Not reachable in the current UI: modes are mutually exclusive (the
capture overlay blocks a second `*:start` until the first ESC's). But
the invariant is load-bearing for z-index restoration and would silently
break if a future code path emits overlapping `*:start` events.

## Resolution

Three coordinated guards in `src/fab.ts`:

1. **`setModeActive(true)`** snapshots `savedHostZIndex` only on the
   transition from `activeMode === null` → mode. A redundant true-call
   while a mode is already active leaves the saved value intact and
   just re-applies `Z_INDEX_MAX` (idempotent).
2. **`setModeActive(false)`** is a no-op when `activeMode === null`.
   A stray end-event without a matching start no longer stomps the
   host's z-index with a stale `savedHostZIndex` (possibly an empty
   string from construction time).
3. **`onModeStart(mode)`** short-circuits when `activeMode !== null`.
   The second start is treated as a stray event, not a mode switch —
   clobbering `activeMode` here would make the eventual `*:end` for
   the original mode no-op (the `onModeEnd` guard checks
   `activeMode === mode`), leaving the host lifted permanently. Order
   inside `onModeStart` is `setModeActive(true)` then `activeMode =
   mode` so the snapshot path in `setModeActive` reads the
   pre-transition `null`.

`destroy()`'s `if (this.activeMode) this.setModeActive(false);` still
works because `activeMode` is non-null at that call site.

Verified with `bun run check` + `bun run lint` + `bun run build` —
all green. No behavioral change on the happy path (modes are still
mutually exclusive); the guards are defensive scaffolding for any
future bus path that emits overlapping starts.

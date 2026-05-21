# PRO-68 — `Fab.setModeActive` clobbers `savedHostZIndex` on re-entry

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

## Suggested fix

Short-circuit re-entry in `setModeActive`:

```ts
setModeActive(active: boolean): void {
  if (active) {
    if (this.activeMode === null) {
      this.savedHostZIndex = this.hostEl.style.zIndex;
    }
    this.hostEl.style.zIndex = String(Z_INDEX_MAX);
  } else {
    this.hostEl.style.zIndex = this.savedHostZIndex;
  }
}
```

Or move the save into `onModeStart` so each true-call is paired with a
single false-call. The check `activeMode === null` is the simpler guard.

Not auto-applied: defensive change, no observed regression, and modifies
a method called from multiple bus subscribers — wants a targeted smoke
test before landing.

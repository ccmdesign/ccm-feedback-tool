---
priority: p3
status: resolved
origin: ce-code-review autofix (CCM-282)
run_id: 20260420-204032-85e065a3
resolution: `TextEditMode` now snapshots `document.activeElement` on activate and restores focus on deactivate (with `document.contains` guard). Regression test verifies Escape returns focus to the triggering button.
---

# CCM-282 — `TextEditMode` does not restore focus on abort/submit

## Severity: P3 (accessibility / UX nit)

## File

- `packages/widget/src/text-edit-mode.ts` (`beginEditing`, `deactivate`)

## Problem

`beginEditing` calls `target.focus()` to hand keyboard focus to the
contenteditable host-page node. On Escape / blur / completion, the mode
deactivates without restoring focus to whatever element held it before
activation (typically the FAB or the "Edit text" radial menu item).

Keyboard-only users (and screen readers) lose their place — after Escape,
`document.activeElement` is `<body>`, requiring a Tab-cycle to get back to
the FAB.

## Recommended fix

Capture `document.activeElement` during `activate()`, restore during
`deactivate()`:

```ts
private previouslyFocused: HTMLElement | null = null;

private activate(): void {
  if (this.isActive) return;
  this.isActive = true;
  this.previouslyFocused = (document.activeElement instanceof HTMLElement)
    ? document.activeElement
    : null;
  // ... existing overlay setup
}

private deactivate(): void {
  if (!this.isActive) return;
  // ... existing teardown
  if (this.previouslyFocused && typeof this.previouslyFocused.focus === "function") {
    try {
      this.previouslyFocused.focus();
    } catch {
      // element may have been removed from the DOM — ignore
    }
  }
  this.previouslyFocused = null;
  this.isActive = false;
  this.bus.emit("text-edit:end");
}
```

Apply the same pattern to `ImageSwapMode` for symmetry.

## Acceptance

- Unit test: focus a dummy `<button>`, trigger `text-edit:start`, then
  trigger Escape — assert `document.activeElement === button`.
- Existing `text-edit-mode.test.ts` cases green.
- Manual: activate edit-text from the FAB, press Escape — keyboard focus
  lands back on the FAB without Tab-cycling.

## Not fixed in autofix because

Small refactor touching both text-edit and image-swap modes; needs a human
pass in each of the three target browsers to confirm focus restoration
works across the contenteditable-detach path (WebKit historically has a
few sharp edges here).

---
priority: p2
status: ready
origin: ce-code-review autofix (CCM-291)
run_id: 20260421-104843-6ef0d92c
---

# CCM-291 — `PinMode.clearHoverOutline` wipes host-page inline outline styles

## Severity: P2 (correctness / host-page contract)

## File

- `packages/widget/src/pin-mode.ts` (`applyHoverOutline` at lines 218-249, `clearHoverOutline` at lines 251-261)

## Problem

`applyHoverOutline` sets `outline` + `outline-offset` via
`target.style.setProperty(..., "important")` to override any host-page
styling. On unhover, `clearHoverOutline` removes those properties
unconditionally with `removeProperty`.

For elements that had NO pre-existing inline outline/outline-offset
(the common case), the unhover is a clean no-op. For any element that
had an inline `style="outline: ..."` set by the host page (rare but
legal — code mirrors, editor chrome, custom decorations), pin mode's
unhover silently destroys those styles until the host re-applies them
or the page reloads.

This is a pre-existing latent issue in `TextEditMode` too; pin mode
inherits it from the established pattern.

## Recommended fix

Snapshot the element's original inline outline state on hover, and
restore exactly that state on unhover:

```ts
private previousOutline: string | null = null;
private previousOutlineOffset: string | null = null;
private previousOutlinePriority: string = "";
private previousOutlineOffsetPriority: string = "";

private applyHoverOutline(target: HTMLElement): void {
  this.previousOutline = target.style.outline || null;
  this.previousOutlineOffset = target.style.outlineOffset || null;
  this.previousOutlinePriority = target.style.getPropertyPriority("outline");
  this.previousOutlineOffsetPriority = target.style.getPropertyPriority("outline-offset");

  target.style.setProperty("outline", `2px solid ${this.colors.accent}`, "important");
  target.style.setProperty("outline-offset", "2px", "important");
  // ... existing badge logic
}

private clearHoverOutline(): void {
  if (this.hoveredElement) {
    if (this.previousOutline !== null) {
      this.hoveredElement.style.setProperty(
        "outline",
        this.previousOutline,
        this.previousOutlinePriority,
      );
    } else {
      this.hoveredElement.style.removeProperty("outline");
    }
    if (this.previousOutlineOffset !== null) {
      this.hoveredElement.style.setProperty(
        "outline-offset",
        this.previousOutlineOffset,
        this.previousOutlineOffsetPriority,
      );
    } else {
      this.hoveredElement.style.removeProperty("outline-offset");
    }
    this.hoveredElement = null;
    this.previousOutline = null;
    this.previousOutlineOffset = null;
  }
  if (this.badge) {
    this.badge.remove();
    this.badge = null;
  }
}
```

Apply the same pattern to `TextEditMode` in a follow-up (existing latent
bug) for symmetry.

## Acceptance

- Unit test: give a target an inline `style="outline: 4px dotted red"`,
  trigger mousemove + mouseleave over it in pin mode — assert the inline
  styles match the originals afterward.
- Existing `pin-mode.test.ts` cases green.

## Not fixed in autofix because

Behavioral change that interacts with how the host page may rely on
inline outline styling. A matching change to `TextEditMode` should
accompany this, and the author should decide whether to land both
together or separately.

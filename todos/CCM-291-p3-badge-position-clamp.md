---
priority: p3
status: ready
origin: ce-code-review autofix (CCM-291)
run_id: 20260421-104843-6ef0d92c
---

# CCM-291 — Pin badge position does not clamp to non-negative viewport coords

## Severity: P3 (visual edge case)

## File

- `packages/widget/src/pin-mode.ts` (`applyHoverOutline`, line 232-233)

## Problem

```ts
left:${Math.min(bounds.right - 4, window.innerWidth - 60)}px;
top:${Math.min(bounds.bottom + 4, window.innerHeight - 24)}px;
```

When the hovered element is partially off-screen on the left or top
(negative `bounds.right` or `bounds.top`), the computed `left`/`top`
goes negative and the badge renders off-screen. The `Math.min` clamps
the maximum (keeps the badge inside the right/bottom edges) but
there is no `Math.max` for the minimum.

Rare in practice — reviewers hovering off-screen elements is unusual —
but the fix is trivial and defensive.

## Recommended fix

Clamp both axes to a small positive inset:

```ts
const BADGE_INSET = 8;
this.badge.style.cssText = `
  position:fixed;
  left:${Math.max(BADGE_INSET, Math.min(bounds.right - 4, window.innerWidth - 60))}px;
  top:${Math.max(BADGE_INSET, Math.min(bounds.bottom + 4, window.innerHeight - 24))}px;
  transform:translateX(-100%);
  ...
`;
```

## Acceptance

- Unit test: set `getBoundingClientRect()` on the target to return
  `DOMRect(-200, -200, 100, 50)` (fully off-screen top-left). Hover
  via dispatched mousemove. Assert the badge's inline `left` and
  `top` parse to `>= 8px`.
- Existing `pin-mode.test.ts` hover tests green.

## Not fixed in autofix because

Trivial change but requires picking the inset constant and updating
the hover unit tests to assert the clamped behavior; low priority and
user-visible only in a narrow edge case.

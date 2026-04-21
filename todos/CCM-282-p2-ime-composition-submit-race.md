---
priority: p2
status: resolved
origin: ce-code-review autofix (CCM-282)
run_id: 20260420-204032-85e065a3
resolution: `TextEditMode` keydown handler now guards on `e.isComposing`, `state.isComposing` (tracked via compositionstart/compositionend), and legacy `keyCode === 229`; blur also waits for composition to finish. Regression tests cover IME confirmation and legacy Safari paths.
---

# CCM-282 — `TextEditMode` submits mid-IME-composition on Enter

## Severity: P2 (UX — data loss for CJK / IME users)

## File

- `packages/widget/src/text-edit-mode.ts` (line 198-207)

## Problem

The `beginEditing` flow binds a `keydown` listener on the edited host element
that submits on `Enter` (without shift):

```ts
const onKey = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    void this.finishEditing(state);
  }
  if (e.key === "Escape") { ... }
};
target.addEventListener("keydown", onKey);
```

When a user is mid-IME-composition (Japanese, Chinese, Korean, Vietnamese,
etc.), the first Enter typically confirms the IME candidate — NOT submitting
the form. Browsers fire a `keydown` with `e.key === "Enter"` AND
`e.isComposing === true` during IME confirmation.

Current code submits immediately on that Enter, capturing the partially-typed
content as `proposedText` and discarding whatever the reviewer was about to
confirm.

## Recommended fix

Guard on `e.isComposing` (and `keyCode === 229` as the legacy fallback for
Safari <14):

```ts
const onKey = (e: KeyboardEvent) => {
  // IME is actively composing — the Enter belongs to the IME, not to us.
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    void this.finishEditing(state);
  }
  if (e.key === "Escape") {
    e.preventDefault();
    this.deactivate();
  }
};
```

Optionally, also track `compositionstart` / `compositionend` events to set a
`isComposing` flag and suppress submits. The `e.isComposing` property is
sufficient for all modern browsers; the `keyCode === 229` fallback covers
older WebKit.

## Acceptance

- New unit test: simulate a `keydown` event with `isComposing: true` on the
  edited element — assert `finishEditing` is NOT called.
- Existing happy-path Enter-submit tests remain green.
- Manual QA: with a Japanese IME enabled (macOS: Kotoeri), type `こんにちは`
  into a heading in the demo and press Enter to confirm — mode stays open,
  edit persists. Press Enter a second time — submit fires.

## Not fixed in autofix because

Requires cross-browser keyboard-event semantics (e.isComposing vs. keyCode
229) that deserve a human test pass across Chrome, Safari, Firefox with at
least one IME engaged. Autofix covers obvious regressions, not user-input
subtleties.

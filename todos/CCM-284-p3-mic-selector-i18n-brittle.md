---
priority: p3
status: ready
origin: ce-code-review autofix (CCM-284)
---

# CCM-284 — Mic button selectors in tests rely on English substring matches

## Severity: P3 (test maintainability)

## Files

- `packages/widget/__tests__/widget/popup-mic.test.ts:156-158`
- `e2e/voice-pipeline.spec.ts:101-104`

## Problem

Both the unit and e2e specs locate the mic button with:

```ts
document.querySelector<HTMLButtonElement>(
  'button[aria-label*="ictate" i], button[aria-label*="top" i]'
)
```

That matches fragments of the English labels "Dictate comment" and "Stop
recording" (case-insensitive, `i` flag). It breaks silently in two
scenarios:

1. If the i18n file changes the wording (e.g. "Record voice" / "End
   recording"), the tests still compile but always return `null` and
   every assertion passes vacuously.
2. If the widget runs under the `fr` locale the substring match fails
   immediately — French labels "Dicter un commentaire" / "Arrêter
   l'enregistrement" do not contain "ictate" / "top".

## Proposed fix

Give the mic button a stable, locale-independent selector. Two options:

- **`data-ccm-feedback` attribute** (preferred — matches existing FAB +
  panel test selectors):
  ```ts
  this.micBtn.setAttribute("data-ccm-feedback", "popup-mic");
  ```
- **`data-testid` attribute** if the project already uses that convention
  (a quick grep of `packages/widget/src/` will confirm).

Update both test files to query on the new attribute. Drop the fragile
aria-label substring matcher.

## Acceptance

- Unit + e2e tests pass with the new selector.
- Flipping the widget locale to `fr` in a dedicated unit test still finds
  the mic button.
- Changing the English `popup.mic.record` label in `en.ts` does not
  require touching the test selectors.

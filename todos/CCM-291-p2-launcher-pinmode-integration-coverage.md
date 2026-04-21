---
priority: p2
status: ready
origin: ce-code-review autofix (CCM-291)
run_id: 20260421-104843-6ef0d92c
---

# CCM-291 — Launcher integration tests bypass `PinMode`; Unit 6 end-to-end contract is uncovered

## Severity: P2 (testing gap)

## Files

- `packages/widget/__tests__/widget/launcher-integration.test.ts`
  (lines 32-55 module mocks, 397-435 pin-mode describe block)
- `packages/widget/__tests__/widget/pin-mode.test.ts`
  (unit tests use a stubbed `openPopupForElement`)

## Problem

The CCM-291 plan's Unit 6 specified this integration scenario:

> Integration — initializing the widget with a default config creates a
> pin mode that can be activated via the bus; emitting `pin:start`
> shows an overlay; clicking an element triggers `client.sendFeedback`
> with a payload whose `annotations[0]` has a populated `anchor` and
> `rect: {xPct:0, yPct:0, wPct:1, hPct:1}`.

What shipped in `launcher-integration.test.ts` is different:

1. `Annotator` is mocked (line 32-50). `getPopup()` returns a stub Popup.
2. `openCommentPopupForElement` is mocked as a noop (line 54).
3. The two pin-mode describe tests (line 397-435) then emit
   `annotation:complete` directly on the captured bus — they do not
   dispatch `pin:start`, they do not mount a `PinMode`, they do not
   click anything.

Consequence: the wiring that `launcher.ts:214-218` sets up (the
`openPopupForPinnedElement` wrapper that closes over the Annotator's
popup + calls the helper with projectName) is never exercised by any
integration test. The unit test `pin-mode.test.ts` also sidesteps this
by stubbing `openPopupForElement`. The end-to-end Playwright test in
`e2e/widget.spec.ts` does cover the real flow in a browser, but the
mocked integration contract — "launcher constructs PinMode correctly
and its wrapper really does call the helper" — has no unit-level
coverage.

If somebody edits `launcher.ts` to pass the wrong arguments to the
wrapper (e.g., forgets `projectName`, swaps `bus` with `popup`), only
the E2E run will catch it.

## Recommended fix

Two options — pick one or combine them:

(A) **Minimal** — add a focused integration test that wires a real
`PinMode` with a real `Annotator` (mocked Popup only) and asserts the
click → annotation:complete → submitAnnotation chain:

```ts
// launcher-integration.test.ts — new describe block
describe("pin mode — real integration (CCM-291)", () => {
  it("clicking a pin-target fires sendFeedback with the correct payload", async () => {
    // DO NOT mock annotator.js for this test — use vi.doUnmock() or
    // split into a separate file that only mocks popup.js + anchor.js.
    // Then:
    //   1. launch()
    //   2. emit pin:start on the captured bus
    //   3. dispatch a click on the overlay at known coords
    //   4. assert sendFeedback was called with rect {0,0,1,1} and no
    //      AnnotationPayload.type field.
  });
});
```

(B) **Broader** — relax the Annotator mock in this file so the real
`openCommentPopupForElement` runs (only mock `Popup`), then add the
pin-click test.

(C) As a stopgap, rename the current "pin mode (CCM-291)" describe to
"pin mode payload shape parity" so the next reviewer does not mistake
it for integration coverage.

## Acceptance

- New test covers the PinMode → wrapper → openCommentPopupForElement
  → annotation:complete → submitAnnotation path without mocking
  `openCommentPopupForElement`.
- Test fails if `launcher.ts` stops passing `projectName` to the
  wrapper or swaps any wrapper argument.
- Existing suite (1068 tests) still green.

## Not fixed in autofix because

Requires restructuring the mock boundary in an existing test file, and
the failure mode (swapped wrapper args) is not a regression in this
PR — it is missing coverage for the contract the plan called out.
Safer landed as a deliberate follow-up than auto-applied.

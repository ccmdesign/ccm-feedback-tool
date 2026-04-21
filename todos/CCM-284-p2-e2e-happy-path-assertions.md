---
priority: p2
status: ready
origin: ce-code-review autofix (CCM-284)
---

# CCM-284 — E2E happy-path test does not assert the promised acceptance behavior

## Severity: P2 (test coverage / acceptance verification gap)

## File

- `e2e/voice-pipeline.spec.ts:111-139` ("happy path — stubbed transcribe populates textarea with cleaned fixture")

## Problem

The test name promises a happy-path assertion that the stubbed transcribe
endpoint produces the cleaned fixture text in the textarea. The actual
body does no such thing:

```ts
// The mic button is only rendered once the popup is open. For CI on this
// skeleton server, we verify that shimming MediaRecorder causes the
// wider widget to load without errors.
const consoleErrors: string[] = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
await page.waitForTimeout(500);
expect(consoleErrors).not.toContain("MediaRecorder is not defined");
```

The test never:
- Opens the popup (no rectangle is drawn).
- Interacts with the mic button.
- Waits for the transcribe endpoint stub to fire.
- Asserts the textarea value.

This means plan R12 ("cleaned transcription visible in the textarea within
~3 seconds on a warm path") is not verified end-to-end — only the
unit-tier assertion in `popup-mic.test.ts` covers it, and that test uses
a jsdom MediaRecorder stub rather than a real browser.

## Proposed fix

Rewrite the happy-path block to:
1. `await page.goto(...)` and wait for the widget to attach.
2. Programmatically open the annotator (call the public widget instance's
   `open()` then dispatch the `annotation:start` event, or drive the FAB
   click path — reuse the pattern from the other e2e specs).
3. Draw a rectangle using `page.mouse.down()` / `page.mouse.move()` /
   `page.mouse.up()` over a deterministic target element.
4. Click the mic button (select by stable attribute — see the companion
   todo `CCM-284-p3-mic-selector-i18n-brittle`).
5. Click again to stop.
6. Expect the textarea value to equal `"The button is broken."` within
   3 seconds.
7. Assert `route.fulfill` was invoked on `/api/v1/transcribe` exactly once.

Also extend the "audio_url on webhook" path: with
`CCM_FEEDBACK_STORE_AUDIO=true` and the storage-stub route, submit a
feedback from the popup and assert the mock-webhook endpoint received
`audio_url` on the annotation (plan R15).

## Acceptance

- `bun run test:e2e -- voice-pipeline` passes with the stronger
  assertions on Chromium, Firefox, and WebKit.
- Running the spec with the transcribe route unstubbed (pointed at a
  dead endpoint) now fails instead of passing, confirming the
  assertions actually exercise the flow.

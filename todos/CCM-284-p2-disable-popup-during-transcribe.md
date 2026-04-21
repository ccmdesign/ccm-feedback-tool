---
priority: p2
status: resolved
origin: ce-code-review autofix (CCM-284)
resolution:
  commit: 6df8c711f63162362155d5c92dfc653fd5e29758
  note: |
    stopAndTranscribe now calls setPopupInteractivityDuringTranscribe()
    on entry (disabling type buttons + submit) and again inside finally
    on exit (restoring). Added a unit test that holds the transcribe
    promise open and asserts all controls are disabled mid-flight and
    re-enabled on resolve.
---

# CCM-284 — Plan R4 partially met: type/submit buttons stay interactive during transcription

## Severity: P2 (plan-requirement gap, UX correctness)

## File

- `packages/widget/src/popup.ts:335-390` (`onMicClick`, `stopAndTranscribe`)

## Problem

Plan R4 explicitly states:

> "while the request is in flight, a 'Transcribing...' loading state replaces
> the mic; other popup interactions (type select, submit) are disabled."

The current implementation only swaps the mic icon for a spinner and sets
the mic button to `disabled`. The type-selector buttons and the submit
button remain fully interactive while Whisper + cleanup run (~1–3s warm
path, up to 10s on cold path via the `TIMEOUT_MS` on `ApiClient.transcribe`).

Observed behavior:

- User can click "Submit" mid-transcription and ship a half-formed comment
  before the cleaned text lands.
- User can switch the feedback type mid-transcription; the textarea then
  gets overwritten when the transcription resolves.
- No ARIA announcement of the "Transcribing..." state either — screen
  readers don't get the feedback the plan describes.

## Proposed fix

1. In `stopAndTranscribe`, before `await this.transcribe(...)`:
   - Disable all type-selector buttons inside `this.typeRow` (set
     `disabled = true`, fade opacity).
   - Disable the submit button (`this.submitBtn.disabled = true`,
     `pointer-events: none`).
   - Announce `popup.mic.transcribing` via the existing live region (or
     via `aria-live="polite"` on the mic button's label — already has the
     right text).
2. On resolve/reject (in a `finally`), restore type-button + submit-button
   interactivity and call `updateSubmitState()` so the submit button's
   enabled/disabled state reflects current text + selected type.

## Acceptance

- Extend `packages/widget/__tests__/widget/popup-mic.test.ts` with a test
  that asserts `btn.disabled === true` and the submit button is disabled
  while a deferred `transcribe` promise is pending, and both restore once
  the promise resolves.
- Manual smoke: start recording, stop, try to click Submit before the
  transcribe resolves — should be a no-op.

---
priority: p2
status: ready
origin: ce-code-review autofix (CCM-284)
---

# CCM-284 — Missing test: pre-existing typed text preserved when mic is pressed

## Severity: P2 (test coverage gap — regression surface)

## File

- `packages/widget/__tests__/widget/popup-mic.test.ts`
- `packages/widget/src/popup.ts:395-418` (`applyTranscription`)

## Problem

The code-review autofix commit reworked `applyTranscription` so that any
non-empty textarea content is preserved (appended with a space) rather
than being overwritten by the cleaned transcript. Plan §Key Technical
Decisions / Merge rule specifies three cases:

1. Empty textarea at record-start → set.
2. Textarea had content typed BEFORE recording → append with space.
3. User typed DURING recording → append with space.

The existing tests cover cases 1 and 3. Case 2 — the user types some
context, *then* presses the mic — is uncovered. Without a test asserting
this, a future refactor that revives the "overwrite when value equals
pre-record snapshot" shortcut would silently regress plan R4.

## Proposed fix

Add a test to `popup-mic.test.ts`:

```ts
it("appends cleaned text when the user typed BEFORE pressing the mic", async () => {
  const transcribe: PopupTranscribe = vi.fn().mockResolvedValue({
    cleaned_text: "Is it intentional?",
    raw_text: "um is it intentional",
  });
  const popup = new Popup(colors, t, transcribe);
  popup.show(makeBounds(), CONTEXT);
  await flush();

  // User types context BEFORE pressing the mic.
  const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
  textarea.value = "Looking at this section,";

  const btn = micButton()!;
  btn.click(); // start
  await flush();
  btn.click(); // stop + transcribe
  await flush();

  expect(textarea.value).toBe("Looking at this section, Is it intentional?");
  popup.destroy();
});
```

## Acceptance

- `bun run test:run` passes including the new assertion.
- Removing the pre-record-typed branch logic from `applyTranscription`
  (e.g. reverting to `textarea.value = text` unconditionally) makes this
  test fail, confirming it guards the plan requirement.

---
priority: p2
status: ready
origin: ce-code-review autofix (CCM-291)
run_id: 20260421-104843-6ef0d92c
---

# CCM-291 — `PinMode.destroy()` does not unsubscribe its `pin:start` listener

## Severity: P2 (latent leak — systemic across mode classes)

## File

- `packages/widget/src/pin-mode.ts` (constructor at line 55, destroy at
  lines 263-265)

## Problem

The constructor registers a listener:

```ts
this.bus.on("pin:start", () => this.activate());
```

`destroy()` only calls `deactivate()`. The unsubscribe function returned
by `bus.on` is discarded, so the listener (and the closure holding
`this`) lives until the bus itself is cleared.

Today this is masked by `launcher.ts:366` calling `bus.removeAll()` at
widget teardown, so in production the leak is nominal. But:

- Tests that construct a `PinMode` against a bus and call `destroy()`
  later emit `pin:start` will still trigger activate (harmless but
  misleading).
- Any future use that instantiates multiple widgets sharing a bus or
  that wants to tear down a single mode without nuking the bus will
  leak the closure.
- Same pattern exists in `Annotator`, `TextEditMode`, and
  `ImageSwapMode` — this is a systemic convention, not a pin-mode-only
  bug.

## Recommended fix

Capture the unsubscribe in the constructor and call it from `destroy()`:

```ts
private unsubPinStart: () => void;

constructor(
  colors: ThemeColors,
  bus: EventBus<WidgetEvents>,
  t: TFunction,
  openPopupForElement: (element: HTMLElement) => Promise<void>,
  shouldIgnoreElement: (element: Element) => boolean,
) {
  this.colors = colors;
  this.bus = bus;
  this.t = t;
  this.openPopupForElement = openPopupForElement;
  this.shouldIgnoreElement = shouldIgnoreElement;
  this.unsubPinStart = this.bus.on("pin:start", () => this.activate());
}

destroy(): void {
  this.deactivate();
  this.unsubPinStart();
}
```

For symmetry, apply the same refactor to `Annotator`, `TextEditMode`,
and `ImageSwapMode` in a follow-up so all four modes share the same
teardown contract. Keep `bus.removeAll()` in `launcher.ts` as defense
in depth.

## Acceptance

- Unit test: construct a `PinMode`, call `destroy()`, then emit
  `pin:start` — assert no overlay appears.
- Existing `pin-mode.test.ts` cases green.
- `bun run check` passes.

## Not fixed in autofix because

Fixing only `PinMode` would create inconsistency with the three
sibling mode classes that share this pattern. Should be landed as a
mode-class-wide cleanup PR rather than a one-off in a pin-mode
review.

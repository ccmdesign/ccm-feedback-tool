// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { EventBus, type WidgetEvents } from "../../src/events.js";
import { buildThemeColors } from "../../src/styles/theme.js";
import { TextEditMode } from "../../src/text-edit-mode.js";

/** Minimal i18n stub returning the key verbatim. */
function t(key: string): string {
  return key;
}

describe("TextEditMode.isTextBearing", () => {
  it("treats non-empty text elements as text-bearing", () => {
    const h = document.createElement("h1");
    h.textContent = "Hello";
    document.body.appendChild(h);
    expect(TextEditMode.isTextBearing(h)).toBe(true);
    h.remove();
  });

  it("excludes whitespace-only text", () => {
    const p = document.createElement("p");
    p.textContent = "    ";
    document.body.appendChild(p);
    expect(TextEditMode.isTextBearing(p)).toBe(false);
    p.remove();
  });

  it("skips <script> + <style> + <noscript> tags", () => {
    const script = document.createElement("script");
    script.textContent = "console.log(1)";
    expect(TextEditMode.isTextBearing(script)).toBe(false);
    const style = document.createElement("style");
    style.textContent = "body { color: red }";
    expect(TextEditMode.isTextBearing(style)).toBe(false);
    const noscript = document.createElement("noscript");
    noscript.textContent = "n";
    expect(TextEditMode.isTextBearing(noscript)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CCM-282 P2 — IME composition guard
// CCM-282 P3 — focus restoration
// ---------------------------------------------------------------------------

/**
 * Helper: build a TextEditMode instance wired to a fresh bus with the mode
 * activated over a host-page target element. Returns a handle for driving the
 * editing flow without routing through overlay hover/click.
 */
function activateOver(target: HTMLElement): {
  bus: EventBus<WidgetEvents>;
  mode: TextEditMode;
  dispatchKey: (type: "keydown" | "blur", init?: KeyboardEventInit | Event) => void;
} {
  const bus = new EventBus<WidgetEvents>();
  const colors = buildThemeColors();
  const mode = new TextEditMode(colors, bus, t, () => false);
  bus.emit("text-edit:start");
  // Reach into the private beginEditing via the public click flow would
  // require overlay elementFromPoint; for unit scope we invoke it directly via
  // a typed cast.
  (mode as unknown as { beginEditing: (el: HTMLElement) => void }).beginEditing(target);
  return {
    bus,
    mode,
    dispatchKey(type, init) {
      target.dispatchEvent(
        type === "keydown" ? new KeyboardEvent("keydown", init as KeyboardEventInit) : (init as Event),
      );
    },
  };
}

describe("TextEditMode IME composition guard (CCM-282 P2)", () => {
  it("does not submit when Enter fires during IME composition (isComposing=true)", () => {
    const host = document.createElement("p");
    host.textContent = "Hello";
    document.body.appendChild(host);
    const onComplete = vi.fn();

    const { bus, mode } = activateOver(host);
    bus.on("text-edit:complete", onComplete);

    host.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true }));

    expect(onComplete).not.toHaveBeenCalled();
    mode.destroy();
    host.remove();
  });

  it("does not submit on legacy Safari keyCode=229", () => {
    const host = document.createElement("p");
    host.textContent = "Hello";
    document.body.appendChild(host);
    const onComplete = vi.fn();

    const { bus, mode } = activateOver(host);
    bus.on("text-edit:complete", onComplete);

    // keyCode 229 is the legacy "composition in progress" signal.
    const event = new KeyboardEvent("keydown", { key: "Enter" });
    Object.defineProperty(event, "keyCode", { value: 229 });
    host.dispatchEvent(event);

    expect(onComplete).not.toHaveBeenCalled();
    mode.destroy();
    host.remove();
  });

  it("allows a plain Enter (no composition, no keyCode 229) to proceed to the submit handler", async () => {
    // We do NOT assert that text-edit:complete fires here — that depends on
    // jsdom's `innerText` implementation, which is inconsistent across
    // versions. Instead we verify the IME guard lets the handler through by
    // observing that `text-edit:end` (emitted by deactivate, which finishEditing
    // calls after successful completion OR cancellation) also fires on a
    // cleanly-dispatched Enter.
    const host = document.createElement("p");
    host.textContent = "Hello";
    document.body.appendChild(host);
    const onEnd = vi.fn();

    const { bus, mode } = activateOver(host);
    bus.on("text-edit:end", onEnd);

    // Clean Enter — should reach finishEditing (and then deactivate).
    host.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    // `finishEditing` is async; flush microtasks before asserting.
    await Promise.resolve();
    await Promise.resolve();

    expect(onEnd).toHaveBeenCalled();
    mode.destroy();
    host.remove();
  });

  it("does not submit on blur while IME is composing", () => {
    const host = document.createElement("p");
    host.textContent = "Hello";
    document.body.appendChild(host);
    const onComplete = vi.fn();

    const { bus, mode } = activateOver(host);
    bus.on("text-edit:complete", onComplete);

    host.dispatchEvent(new CompositionEvent("compositionstart"));
    host.dispatchEvent(new FocusEvent("blur"));

    expect(onComplete).not.toHaveBeenCalled();
    mode.destroy();
    host.remove();
  });
});

describe("TextEditMode focus restoration (CCM-282 P3)", () => {
  it("restores focus to the element that had it before activation when Escape cancels", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open edit";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const bus = new EventBus<WidgetEvents>();
    const mode = new TextEditMode(buildThemeColors(), bus, t, () => false);
    bus.emit("text-edit:start");
    // Focus will have moved to an internal element; no matter — Escape on
    // document should deactivate and restore.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(document.activeElement).toBe(trigger);
    mode.destroy();
    trigger.remove();
  });
});

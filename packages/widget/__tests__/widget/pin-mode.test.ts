// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus, type WidgetEvents } from "../../src/events.js";
import { PinMode } from "../../src/pin-mode.js";
import { buildThemeColors } from "../../src/styles/theme.js";

/** Minimal i18n stub returning the key verbatim. */
function t(key: string): string {
  return key;
}

function findOverlay(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-ccm-pin-overlay="true"]');
}

function findToolbar(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(`[aria-label="pin.ariaLabel"]`);
}

/** Craft a typed pin-mode over a fresh bus with sensible defaults. */
function build(
  overrides: { openPopup?: (el: HTMLElement) => Promise<void>; shouldIgnore?: (el: Element) => boolean } = {},
) {
  const bus = new EventBus<WidgetEvents>();
  const openPopup = overrides.openPopup ?? vi.fn().mockResolvedValue(undefined);
  const shouldIgnore = overrides.shouldIgnore ?? (() => false);
  const mode = new PinMode(buildThemeColors(), bus, t, openPopup, shouldIgnore);
  return { bus, mode, openPopup, shouldIgnore };
}

describe("PinMode (CCM-291)", () => {
  afterEach(() => {
    // Clean up any stragglers so tests are hermetic.
    for (const el of document.body.querySelectorAll('[data-ccm-pin-overlay="true"]')) el.remove();
    for (const el of document.body.querySelectorAll('[aria-label="pin.ariaLabel"]')) el.remove();
    document.body.style.overflow = "";
  });

  // ---------------------------------------------------------------------------
  // Activation / deactivation
  // ---------------------------------------------------------------------------

  describe("activate / deactivate", () => {
    it("emitting pin:start appends an overlay and toolbar to document.body", () => {
      const { bus, mode } = build();
      bus.emit("pin:start");

      expect(findOverlay()).not.toBeNull();
      expect(findToolbar()).not.toBeNull();

      mode.destroy();
    });

    it("activate is idempotent — emitting pin:start twice does not stack overlays", () => {
      const { bus, mode } = build();
      bus.emit("pin:start");
      bus.emit("pin:start");

      const overlays = document.body.querySelectorAll('[data-ccm-pin-overlay="true"]');
      expect(overlays.length).toBe(1);

      mode.destroy();
    });

    it("locks body overflow on activate and restores it on deactivate", () => {
      document.body.style.overflow = "scroll";
      const { bus, mode } = build();

      bus.emit("pin:start");
      expect(document.body.style.overflow).toBe("hidden");

      // Escape deactivates
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(document.body.style.overflow).toBe("scroll");

      mode.destroy();
    });

    it("Escape at document level emits pin:end and does not call openPopupForElement", () => {
      const openPopup = vi.fn().mockResolvedValue(undefined);
      const { bus, mode } = build({ openPopup });

      const endListener = vi.fn();
      bus.on("pin:end", endListener);

      bus.emit("pin:start");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(endListener).toHaveBeenCalledOnce();
      expect(openPopup).not.toHaveBeenCalled();

      mode.destroy();
    });

    it("cancel button click in the toolbar deactivates the mode", () => {
      const { bus, mode } = build();
      const endListener = vi.fn();
      bus.on("pin:end", endListener);

      bus.emit("pin:start");
      const cancelBtn = Array.from(document.body.querySelectorAll("button")).find(
        (btn) => btn.textContent === "pin.cancel",
      );
      expect(cancelBtn).toBeDefined();
      cancelBtn!.click();

      expect(endListener).toHaveBeenCalledOnce();
      expect(findOverlay()).toBeNull();

      mode.destroy();
    });

    it("destroy() is safe when mode is not active", () => {
      const { mode } = build();
      expect(() => mode.destroy()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Hover outline
  // ---------------------------------------------------------------------------

  describe("hover outline", () => {
    it("mousemove over an eligible element applies an inline outline", () => {
      const target = document.createElement("button");
      target.textContent = "Target";
      document.body.appendChild(target);
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 100, 40));

      const { bus, mode } = build();
      bus.emit("pin:start");

      const overlay = findOverlay()!;
      // Patch elementFromPoint to return our target
      const origFromPoint = document.elementFromPoint;
      document.elementFromPoint = vi.fn(() => target) as typeof document.elementFromPoint;

      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 30, bubbles: true }));
      expect(target.style.outline).toContain("solid");
      expect(target.style.outlineOffset).toBe("2px");

      document.elementFromPoint = origFromPoint;
      mode.destroy();
      target.remove();
    });

    it("mousemove over an ignored element (widget host) does not apply an outline", () => {
      const widgetHost = document.createElement("div");
      document.body.appendChild(widgetHost);

      const { bus, mode } = build({ shouldIgnore: (el) => el === widgetHost });
      bus.emit("pin:start");

      const overlay = findOverlay()!;
      const origFromPoint = document.elementFromPoint;
      document.elementFromPoint = vi.fn(() => widgetHost) as typeof document.elementFromPoint;

      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 30, bubbles: true }));
      expect(widgetHost.style.outline).toBe("");

      document.elementFromPoint = origFromPoint;
      mode.destroy();
      widgetHost.remove();
    });

    it("mousemove to a new element clears the previous element's outline", () => {
      const a = document.createElement("button");
      const b = document.createElement("button");
      document.body.appendChild(a);
      document.body.appendChild(b);
      vi.spyOn(a, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 50, 20));
      vi.spyOn(b, "getBoundingClientRect").mockReturnValue(new DOMRect(60, 0, 50, 20));

      const { bus, mode } = build();
      bus.emit("pin:start");

      const overlay = findOverlay()!;
      const origFromPoint = document.elementFromPoint;
      const elementFromPoint = vi.fn<[number, number], Element | null>().mockReturnValueOnce(a).mockReturnValueOnce(b);
      document.elementFromPoint = elementFromPoint as unknown as typeof document.elementFromPoint;

      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 10, bubbles: true }));
      expect(a.style.outline).not.toBe("");

      overlay.dispatchEvent(new MouseEvent("mousemove", { clientX: 70, clientY: 10, bubbles: true }));
      expect(a.style.outline).toBe("");
      expect(b.style.outline).not.toBe("");

      document.elementFromPoint = origFromPoint;
      mode.destroy();
      a.remove();
      b.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Click dispatch
  // ---------------------------------------------------------------------------

  describe("click dispatch", () => {
    it("click on an eligible element invokes openPopupForElement with that element", async () => {
      const target = document.createElement("button");
      target.textContent = "Click me";
      document.body.appendChild(target);
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 100, 40));

      const openPopup = vi.fn().mockResolvedValue(undefined);
      const { bus, mode } = build({ openPopup });
      bus.emit("pin:start");

      const overlay = findOverlay()!;
      const origFromPoint = document.elementFromPoint;
      document.elementFromPoint = vi.fn(() => target) as typeof document.elementFromPoint;

      overlay.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 30, bubbles: true }));

      // Allow the async handler to run
      await Promise.resolve();
      await Promise.resolve();

      expect(openPopup).toHaveBeenCalledOnce();
      expect(openPopup).toHaveBeenCalledWith(target);

      document.elementFromPoint = origFromPoint;
      mode.destroy();
      target.remove();
    });

    it("after click, mode deactivates (overlay gone) even if openPopupForElement throws", async () => {
      const target = document.createElement("button");
      document.body.appendChild(target);
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 100, 40));

      const openPopup = vi.fn().mockRejectedValue(new Error("popup failed"));
      const { bus, mode } = build({ openPopup });

      const endListener = vi.fn();
      bus.on("pin:end", endListener);

      bus.emit("pin:start");

      const overlay = findOverlay()!;
      const origFromPoint = document.elementFromPoint;
      document.elementFromPoint = vi.fn(() => target) as typeof document.elementFromPoint;

      overlay.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 30, bubbles: true }));

      // Flush two microtask cycles
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(findOverlay()).toBeNull();
      expect(endListener).toHaveBeenCalledOnce();

      document.elementFromPoint = origFromPoint;
      mode.destroy();
      target.remove();
    });

    it("click over an ignored element does NOT invoke openPopupForElement", async () => {
      const ignored = document.createElement("div");
      document.body.appendChild(ignored);

      const openPopup = vi.fn().mockResolvedValue(undefined);
      const { bus, mode } = build({ openPopup, shouldIgnore: (el) => el === ignored });
      bus.emit("pin:start");

      const overlay = findOverlay()!;
      const origFromPoint = document.elementFromPoint;
      document.elementFromPoint = vi.fn(() => ignored) as typeof document.elementFromPoint;

      overlay.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 30, bubbles: true }));
      await Promise.resolve();

      expect(openPopup).not.toHaveBeenCalled();

      document.elementFromPoint = origFromPoint;
      mode.destroy();
      ignored.remove();
    });
  });

  // ---------------------------------------------------------------------------
  // Integration — bus plumbing
  // ---------------------------------------------------------------------------

  describe("bus integration", () => {
    it("pin:start emits pin:end on cancel (round-trip lifecycle)", () => {
      const { bus, mode } = build();
      const startListener = vi.fn();
      const endListener = vi.fn();
      bus.on("pin:start", startListener);
      bus.on("pin:end", endListener);

      bus.emit("pin:start");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(startListener).toHaveBeenCalledOnce();
      expect(endListener).toHaveBeenCalledOnce();

      mode.destroy();
    });
  });
});

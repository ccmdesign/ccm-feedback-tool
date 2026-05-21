import { Z_INDEX_MAX } from "./constants.js";
import { createHoverOutline, type HoverOutlineHandle } from "./dom/hover-outline.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import type { ThemeColors } from "./styles/theme.js";

/**
 * Pin mode (CCM-291).
 *
 * Click-to-anchor comments on DOM elements. The reviewer hovers over any
 * eligible host-page element; an outline + tag badge appear. On click, the
 * widget opens the shared comment popup anchored to that element and emits
 * `annotation:complete` via `openPopupForElement` (supplied by the launcher).
 *
 * State machine:
 *
 *   IDLE  ──mousemove──▶ HOVERING  ──mousemove (different el)──▶ HOVERING
 *     ▲                    │
 *     │                    └──click────▶ POPUP_OPEN ──submit/cancel──▶ (deactivate)
 *     │
 *     └── ESCAPE or cancel button ──▶ (deactivate)
 *
 * Architectural notes:
 * - Does not own a `Popup` instance. Receives `openPopupForElement` from the
 *   launcher which closes over the Annotator's popup. Avoids duplicating the
 *   audio recorder + submission state.
 * - Emits `"pin:start"` on activate (triggered by the bus subscription) and
 *   `"pin:end"` on deactivate. The activation bus event is `"pin:start"`
 *   itself — the FAB emits it and this mode subscribes to it.
 * - Payload shape is identical to area mode: full-bounds rect relative to the
 *   clicked element, `type` omitted (defaults to `"rectangle"` server-side).
 */
export class PinMode {
  private overlay: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private isActive = false;
  private savedOverflow = "";
  private previouslyFocused: HTMLElement | null = null;
  /**
   * Shared hover-outline helper — owns the outline + tag badge snapshot/restore
   * state. Extracted in PRO-67 so the marker-relocate drag overlay reuses the
   * same implementation. Snapshot fields live inside the helper closure.
   */
  private readonly hoverOutline: HoverOutlineHandle;
  /** Last element passed to `hoverOutline.apply` — used to dedupe successive
   * mousemoves over the same target without churning the helper. */
  private hoveredElement: HTMLElement | null = null;
  /**
   * Unsubscribe handle for the `pin:start` bus listener registered in the
   * constructor. Called from `destroy()` so the closure doesn't outlive the
   * mode. CCM-291 P2 todo "pinmode-bus-subscription-leak".
   */
  private readonly unsubPinStart: () => void;

  constructor(
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    /**
     * Injected by launcher — opens the comment popup for a given element,
     * awaits the popup round-trip, and emits `annotation:complete` on success.
     * Pin mode owns no knowledge of `Popup` or `projectName`.
     */
    private readonly openPopupForElement: (element: HTMLElement) => Promise<void>,
    /** Excludes the widget host + descendants so pin doesn't outline itself. */
    private readonly shouldIgnoreElement: (element: Element) => boolean,
  ) {
    this.hoverOutline = createHoverOutline(this.colors);
    this.unsubPinStart = this.bus.on("target:start", () => this.activate());
  }

  private activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.savedOverflow = document.body.style.overflow;
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Overlay captures pointer events for hover + click dispatch.
    this.overlay = el("div", {
      style: `
        position:fixed;inset:0;z-index:${Z_INDEX_MAX - 1};
        background:rgba(15, 23, 42, 0.02);
        cursor:crosshair;
      `,
    });
    this.overlay.setAttribute("aria-hidden", "true");
    this.overlay.setAttribute("data-ccm-pin-overlay", "true");

    this.toolbar = el("div", {
      style: `
        position:fixed;top:0;left:0;right:0;z-index:${Z_INDEX_MAX};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `,
    });
    this.toolbar.setAttribute("aria-label", this.t("pin.ariaLabel"));

    const instruction = el("span", { style: "font-weight:500;letter-spacing:-0.01em;" });
    setText(instruction, this.t("pin.instruction"));

    const cancelBtn = document.createElement("button");
    cancelBtn.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
    `;
    setText(cancelBtn, this.t("pin.cancel"));
    cancelBtn.addEventListener("click", () => this.deactivate());

    this.toolbar.appendChild(instruction);
    this.toolbar.appendChild(cancelBtn);

    this.overlay.addEventListener("mousemove", this.onOverlayMouseMove, true);
    this.overlay.addEventListener("click", this.onOverlayClick, true);
    document.addEventListener("keydown", this.onKeyDown);

    document.body.style.overflow = "hidden";
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.toolbar);
  }

  private deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;

    this.clearHoverOutline();

    this.overlay?.removeEventListener("mousemove", this.onOverlayMouseMove, true);
    this.overlay?.removeEventListener("click", this.onOverlayClick, true);
    document.removeEventListener("keydown", this.onKeyDown);

    // Always restore body overflow — even if downstream listeners throw.
    document.body.style.overflow = this.savedOverflow;

    this.overlay?.remove();
    this.toolbar?.remove();
    this.overlay = null;
    this.toolbar = null;

    // Restore focus to whoever had it pre-activation (mirrors text-edit P3).
    const toFocus = this.previouslyFocused;
    this.previouslyFocused = null;
    if (toFocus && typeof toFocus.focus === "function" && document.contains(toFocus)) {
      try {
        toFocus.focus();
      } catch {
        // Ignore — focus may fail on detached/disabled elements.
      }
    }

    this.bus.emit("target:end");
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.deactivate();
    }
  };

  private onOverlayMouseMove = (e: MouseEvent): void => {
    if (!this.overlay) return;
    // Temporarily drop overlay pointer events so elementFromPoint reaches the
    // real underlying element. Same trick text-edit-mode uses.
    this.overlay.style.pointerEvents = "none";
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    this.overlay.style.pointerEvents = "auto";

    if (!target || !(target instanceof HTMLElement)) {
      this.clearHoverOutline();
      return;
    }
    if (this.shouldIgnoreElement(target)) {
      this.clearHoverOutline();
      return;
    }
    // Skip <html> / <body> — commenting on the whole document isn't useful.
    if (target === document.documentElement || target === document.body) {
      this.clearHoverOutline();
      return;
    }
    if (target === this.hoveredElement) return;

    this.clearHoverOutline();
    this.hoveredElement = target;
    this.applyHoverOutline(target);
  };

  private onOverlayClick = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.overlay) return;

    // Re-resolve the element at click time — avoids stale-hover bugs if the
    // page reflowed between the last mousemove and this click.
    this.overlay.style.pointerEvents = "none";
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    this.overlay.style.pointerEvents = "auto";

    if (!target || !(target instanceof HTMLElement)) return;
    if (this.shouldIgnoreElement(target)) return;
    if (target === document.documentElement || target === document.body) return;

    this.clearHoverOutline();

    // Fire-and-forget. deactivate() in try/finally guarantees overlay cleanup
    // even if `openPopupForElement` throws. Submission concurrency is enforced
    // one layer up by launcher.ts's `submitting` flag.
    void this.handleSelect(target);
  };

  private async handleSelect(element: HTMLElement): Promise<void> {
    // Tear down the pin overlay/toolbar BEFORE opening the popup — otherwise
    // the overlay (fixed inset:0, pointer-events:auto) sits on top of the
    // popup and swallows every click inside it. Matches `Annotator`'s keyboard
    // Enter path, which deactivates before awaiting `popup.show`.
    this.deactivate();

    try {
      await this.openPopupForElement(element);
    } catch (err) {
      // Never let a popup-helper failure leak out — surface it via console.
      console.error("[ccm-feedback] pin-mode: openPopupForElement threw", err);
    }
  }

  private applyHoverOutline(target: HTMLElement): void {
    this.hoverOutline.apply(target);
    this.hoveredElement = target;
  }

  private clearHoverOutline(): void {
    this.hoverOutline.clear();
    this.hoveredElement = null;
  }

  destroy(): void {
    this.deactivate();
    // Drop the pin:start listener so the mode + its closure are GC-eligible
    // even when the shared bus outlives us. CCM-291 P2 pinmode-bus-subscription-leak.
    this.unsubPinStart();
  }
}

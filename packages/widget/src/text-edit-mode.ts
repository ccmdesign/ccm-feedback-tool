import type { AnnotationPayload } from "@ccm-feedback/core";
import { Z_INDEX_MAX } from "./constants.js";
import { generateAnchor } from "./dom/anchor.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n/index.js";
import type { ThemeColors } from "./styles/theme.js";

/** Payload emitted when the reviewer finalizes a text_change annotation. */
export interface TextEditComplete {
  annotation: AnnotationPayload;
}

/**
 * Edit-text mode (CCM-282):
 *
 * - A full-page overlay captures hover to highlight text-bearing host elements
 *   with a dashed outline and a pencil badge.
 * - On click, the widget promotes the *host-page* element to
 *   `contenteditable="true"` (never inside the shadow tree — selection + IME
 *   behave normally) and focuses it for editing.
 * - On blur / Enter, the proposed text is captured, the host element is
 *   reverted to its original state, and a `text-edit:complete` event is
 *   emitted with an `AnnotationPayload` of type `"text_change"`.
 *
 * A `try/finally` restore pathway guarantees the host page is never left in a
 * permanently-editable state, even if a host-page event handler throws.
 */
export class TextEditMode {
  private overlay: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private hoveredElement: HTMLElement | null = null;
  private editingState: EditingState | null = null;
  private isActive = false;
  private savedOverflow = "";
  /**
   * Element that held focus when text-edit mode activated. Restored on
   * deactivate so keyboard-only users don't lose their place (CCM-282 P3).
   */
  private previouslyFocused: HTMLElement | null = null;

  constructor(
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    /** Callback exposed so launcher can inject a custom host-host for tests. */
    private readonly shouldIgnoreElement: (element: Element) => boolean,
  ) {
    this.bus.on("text-edit:start", () => this.activate());
  }

  private activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.savedOverflow = document.body.style.overflow;
    // CCM-282 P3: remember the focused element so we can restore it on exit.
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    this.overlay = el("div", {
      style: `
        position:fixed;inset:0;z-index:${Z_INDEX_MAX - 1};
        background:rgba(15, 23, 42, 0.02);
        cursor:text;
      `,
    });
    this.overlay.setAttribute("aria-hidden", "true");
    this.overlay.setAttribute("data-ccm-text-edit-overlay", "true");

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
    const instruction = el("span", { style: "font-weight:500;letter-spacing:-0.01em;" });
    setText(instruction, this.t("textEdit.instruction"));
    const cancelBtn = document.createElement("button");
    cancelBtn.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
    `;
    setText(cancelBtn, this.t("textEdit.cancel"));
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

    // Always restore any element that is currently in edit mode.
    if (this.editingState) this.restoreEditingState(this.editingState);
    this.editingState = null;
    this.clearHoverOutline();

    this.overlay?.removeEventListener("mousemove", this.onOverlayMouseMove, true);
    this.overlay?.removeEventListener("click", this.onOverlayClick, true);
    document.removeEventListener("keydown", this.onKeyDown);
    document.body.style.overflow = this.savedOverflow;

    this.overlay?.remove();
    this.toolbar?.remove();
    this.overlay = null;
    this.toolbar = null;
    this.isActive = false;

    // CCM-282 P3: restore focus to the element that had it before activation.
    // Guarded because the element may have been detached from the DOM while
    // the mode was active (unlikely, but a nav during edit is possible).
    const toFocus = this.previouslyFocused;
    this.previouslyFocused = null;
    if (toFocus && typeof toFocus.focus === "function" && document.contains(toFocus)) {
      try {
        toFocus.focus();
      } catch {
        // Some browsers throw when focusing a disabled / display:none element;
        // ignore — the user can Tab to recover.
      }
    }

    this.bus.emit("text-edit:end");
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.deactivate();
    }
  };

  private onOverlayMouseMove = (e: MouseEvent): void => {
    if (!this.overlay) return;
    if (this.editingState) return; // Don't re-hover while editing.
    this.overlay.style.pointerEvents = "none";
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    this.overlay.style.pointerEvents = "auto";
    if (!target) {
      this.clearHoverOutline();
      return;
    }
    if (this.shouldIgnoreElement(target)) {
      this.clearHoverOutline();
      return;
    }
    if (!TextEditMode.isTextBearing(target)) {
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
    this.overlay.style.pointerEvents = "none";
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    this.overlay.style.pointerEvents = "auto";
    if (!target) return;
    if (this.shouldIgnoreElement(target)) return;
    if (!TextEditMode.isTextBearing(target)) return;
    this.clearHoverOutline();
    this.beginEditing(target);
  };

  private applyHoverOutline(target: HTMLElement): void {
    // Inline style — removed on mouseleave. Guaranteed to win over host CSS
    // because of specificity (inline wins ties).
    target.style.setProperty("outline", `2px dashed ${this.colors.accent}`, "important");
    target.style.setProperty("outline-offset", "2px", "important");
  }

  private clearHoverOutline(): void {
    if (!this.hoveredElement) return;
    this.hoveredElement.style.removeProperty("outline");
    this.hoveredElement.style.removeProperty("outline-offset");
    this.hoveredElement = null;
  }

  private beginEditing(target: HTMLElement): void {
    const originalText = target.innerText;
    const savedContentEditable = target.getAttribute("contenteditable");
    const savedOutline = target.style.outline;
    const savedUserSelect = target.style.userSelect;

    target.setAttribute("contenteditable", "true");
    target.style.setProperty("outline", `2px solid ${this.colors.accent}`, "important");
    target.style.setProperty("outline-offset", "2px", "important");
    target.style.userSelect = "text";
    target.focus();

    const state: EditingState = {
      element: target,
      originalText,
      savedContentEditable,
      savedOutline,
      savedUserSelect,
      isComposing: false,
    };
    this.editingState = state;

    const onBlur = () => {
      // CCM-282 P2: blur while the IME is still composing would swallow the
      // partial candidate. Wait for composition to end before finishing.
      if (state.isComposing) return;
      void this.finishEditing(state);
    };
    const onKey = (e: KeyboardEvent) => {
      // CCM-282 P2: IME-composition guard. When a CJK / Vietnamese / etc.
      // reviewer confirms an IME candidate, the browser fires `keydown` with
      // `key === "Enter"` AND `isComposing === true`. That Enter belongs to
      // the IME — submitting now would throw away the partially-typed edit.
      // `keyCode === 229` is the legacy Safari <14 signal for the same state.
      if (e.isComposing || state.isComposing || e.keyCode === 229) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void this.finishEditing(state);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.deactivate();
      }
    };
    const onCompositionStart = () => {
      state.isComposing = true;
    };
    const onCompositionEnd = () => {
      state.isComposing = false;
    };
    state.onBlur = onBlur;
    state.onKey = onKey;
    state.onCompositionStart = onCompositionStart;
    state.onCompositionEnd = onCompositionEnd;
    target.addEventListener("blur", onBlur);
    target.addEventListener("keydown", onKey);
    target.addEventListener("compositionstart", onCompositionStart);
    target.addEventListener("compositionend", onCompositionEnd);
  }

  private async finishEditing(state: EditingState): Promise<void> {
    if (this.editingState !== state) return;
    const { element, originalText } = state;
    const proposedText = element.innerText;

    // Always restore the host DOM (try/finally semantics — the host page is
    // never left with a stray `contenteditable` attribute even if downstream
    // code throws).
    try {
      if (proposedText === originalText) {
        // No-op edit: silently cancel.
        return;
      }

      const anchor = generateAnchor(element);
      const bounds = element.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const annotation: AnnotationPayload = {
        anchor,
        rect: {
          xPct: 0,
          yPct: 0,
          wPct: Math.min(1, Math.max(0.001, bounds.width / Math.max(1, viewportW))),
          hPct: Math.min(1, Math.max(0.001, bounds.height / Math.max(1, viewportH))),
        },
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        viewportW,
        viewportH,
        devicePixelRatio: window.devicePixelRatio,
        type: "text_change",
        originalText,
        proposedText,
      };

      this.bus.emit("text-edit:complete", { annotation });
    } finally {
      this.restoreEditingState(state);
      this.editingState = null;
      this.deactivate();
    }
  }

  private restoreEditingState(state: EditingState): void {
    const { element, originalText, savedContentEditable, savedOutline, savedUserSelect } = state;
    try {
      element.innerText = originalText;
    } catch {
      // Some elements are non-text nodes; ignore and fall through to attribute cleanup.
    }
    if (savedContentEditable === null) {
      element.removeAttribute("contenteditable");
    } else {
      element.setAttribute("contenteditable", savedContentEditable);
    }
    if (savedOutline) element.style.outline = savedOutline;
    else element.style.removeProperty("outline");
    element.style.userSelect = savedUserSelect;
    element.style.removeProperty("outline-offset");
    if (state.onBlur) element.removeEventListener("blur", state.onBlur);
    if (state.onKey) element.removeEventListener("keydown", state.onKey);
    if (state.onCompositionStart) element.removeEventListener("compositionstart", state.onCompositionStart);
    if (state.onCompositionEnd) element.removeEventListener("compositionend", state.onCompositionEnd);
  }

  /**
   * Predicate: returns true when an element is a "text-bearing" host-page
   * element that the reviewer could meaningfully edit.
   */
  static isTextBearing(element: HTMLElement): boolean {
    if (!(element instanceof HTMLElement)) return false;
    const tag = element.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return false;
    // innerText collapses whitespace and respects CSS, but jsdom doesn't
    // implement it consistently — fall back to textContent so our unit tests
    // can exercise the predicate without a real layout engine.
    const raw = (element.innerText ?? element.textContent ?? "").trim();
    if (!raw) return false;
    return raw.length > 0;
  }

  destroy(): void {
    this.deactivate();
  }
}

interface EditingState {
  element: HTMLElement;
  originalText: string;
  savedContentEditable: string | null;
  savedOutline: string;
  savedUserSelect: string;
  /** Tracks an active IME composition — set between compositionstart and compositionend. */
  isComposing?: boolean;
  onBlur?: (e: Event) => void;
  onKey?: (e: KeyboardEvent) => void;
  onCompositionStart?: (e: Event) => void;
  onCompositionEnd?: (e: Event) => void;
}

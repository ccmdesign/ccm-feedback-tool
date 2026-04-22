import { Z_INDEX_MAX } from "./constants.js";
import { el, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n.js";
import type { ThemeColors } from "./styles/theme.js";

/**
 * Minimal comment composer — textarea + Cancel + Submit.
 * Positioned near an anchor element. Lives outside the Shadow DOM so it floats
 * above host content without clipping.
 */
export class Popup {
  private root: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private submitBtn: HTMLButtonElement;
  private resolve: ((message: string | null) => void) | null = null;
  private previouslyFocused: HTMLElement | null = null;
  private onKeydownTrap: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    private readonly colors: ThemeColors,
    private readonly t: TFunction,
  ) {
    this.root = el("div", {
      style: `
        position:fixed;z-index:${Z_INDEX_MAX};width:300px;padding:16px;border-radius:16px;
        background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow}, 0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        opacity:0;transform:translateY(8px) scale(0.98);
        transition:opacity 0.2s ease,transform 0.2s ease;
        display:none;-webkit-font-smoothing:antialiased;
      `,
    });
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-label", this.t("popup.ariaLabel"));

    this.textarea = document.createElement("textarea");
    this.textarea.style.cssText = `
      width:100%;min-height:88px;max-height:200px;
      padding:10px 12px;border-radius:12px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBgHeavy};
      color:${this.colors.text};font-family:inherit;
      font-size:13px;line-height:1.5;resize:vertical;outline:none;
      transition:border-color 0.2s ease,box-shadow 0.2s ease,background 0.2s ease;
      box-sizing:border-box;
    `;
    this.textarea.placeholder = this.t("popup.placeholder");
    this.textarea.maxLength = 5000;
    this.textarea.setAttribute("aria-label", this.t("popup.textareaAria"));

    this.textarea.addEventListener("focus", () => {
      this.textarea.style.borderColor = this.colors.accent;
      this.textarea.style.boxShadow = `0 0 0 3px ${this.colors.accent}14`;
      this.textarea.style.background = this.colors.bg;
    });
    this.textarea.addEventListener("blur", () => {
      this.textarea.style.borderColor = this.colors.border;
      this.textarea.style.boxShadow = "none";
      this.textarea.style.background = this.colors.glassBgHeavy;
    });
    this.textarea.addEventListener("input", () => this.updateSubmitState());
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.submit();
      } else if (e.key === "Escape") {
        this.cancel();
      }
    });

    const hint = el("div", {
      style: `font-size:11px;color:${this.colors.textTertiary};text-align:right;margin-top:6px;letter-spacing:0.01em;`,
    });
    const isMac = /Macintosh|Mac OS X/i.test(navigator.userAgent);
    setText(hint, isMac ? this.t("popup.submitHintMac") : this.t("popup.submitHintOther"));

    const btnRow = el("div", { style: "display:flex;justify-content:flex-end;gap:8px;margin-top:12px;" });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.style.cssText = `
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s ease;
    `;
    setText(cancelBtn, this.t("popup.cancel"));
    cancelBtn.addEventListener("click", () => this.cancel());

    this.submitBtn = document.createElement("button");
    this.submitBtn.type = "button";
    this.submitBtn.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
    `;
    setText(this.submitBtn, this.t("popup.submit"));
    this.submitBtn.addEventListener("click", () => this.submit());

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(this.submitBtn);

    this.root.appendChild(this.textarea);
    this.root.appendChild(hint);
    this.root.appendChild(btnRow);
    document.body.appendChild(this.root);
  }

  /**
   * Show the popup near `anchorRect` and resolve with the comment message,
   * or null if cancelled.
   */
  show(anchorRect: DOMRect): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.textarea.value = "";
      this.updateSubmitState();
      this.previouslyFocused = document.activeElement as HTMLElement | null;

      let top = anchorRect.bottom + 8;
      let left = anchorRect.left;
      if (top + 220 > window.innerHeight) top = anchorRect.top - 220 - 8;
      if (left + 300 > window.innerWidth) left = anchorRect.right - 300;
      top = Math.max(8, top);
      left = Math.max(8, left);

      this.root.style.top = `${top}px`;
      this.root.style.left = `${left}px`;
      this.root.style.display = "block";

      this.onKeydownTrap = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const focusable = Array.from(
          this.root.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey) {
          if (document.activeElement === first || !this.root.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last || !this.root.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      };
      this.root.addEventListener("keydown", this.onKeydownTrap);

      requestAnimationFrame(() => {
        this.root.style.opacity = "1";
        this.root.style.transform = "translateY(0) scale(1)";
        this.textarea.focus();
      });
    });
  }

  private updateSubmitState(): void {
    const enabled = this.textarea.value.trim().length > 0;
    this.submitBtn.disabled = !enabled;
    this.submitBtn.style.opacity = enabled ? "1" : "0.35";
    this.submitBtn.style.pointerEvents = enabled ? "auto" : "none";
  }

  private submit(): void {
    const message = this.textarea.value.trim();
    if (!message) return;
    this.resolve?.(message);
    this.resolve = null;
    this.hide();
  }

  private cancel(): void {
    this.resolve?.(null);
    this.resolve = null;
    this.hide();
  }

  private hide(): void {
    if (this.onKeydownTrap) {
      this.root.removeEventListener("keydown", this.onKeydownTrap);
      this.onKeydownTrap = null;
    }
    this.root.style.opacity = "0";
    this.root.style.transform = "translateY(8px) scale(0.98)";
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
    setTimeout(() => {
      this.root.style.display = "none";
    }, 200);
  }

  destroy(): void {
    this.root.remove();
  }
}

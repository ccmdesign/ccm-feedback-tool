import type { FeedbackType } from "@ccm-feedback/core";
import { AudioRecorder, isMediaRecorderSupported, queryMicrophonePermission } from "./audio-recorder.js";
import { Z_INDEX_MAX } from "./constants.js";
import { el, parseSvg, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n/index.js";
import { ICON_MIC, ICON_SPINNER, ICON_STOP } from "./icons.js";
import type { ThemeColors } from "./styles/theme.js";

/** Context passed through to the transcribe round-trip (CCM-284). */
export interface PopupContext {
  /** CSS selector for the anchor element. */
  selector: string;
  /** Combined neighbor + text snippet from the anchor. */
  surroundingText: string;
  /** Public project name. Server may resolve to internal id. */
  projectName: string;
}

/**
 * Transcribe client contract. The widget owns no direct knowledge of the
 * server URL; the popup receives a function it can call. When omitted, the
 * mic button is still rendered but recordings can't be transcribed — the
 * Popup constructor guards this case and hides the mic.
 */
export type PopupTranscribe = (input: {
  audio: Blob;
  context: PopupContext;
}) => Promise<{ cleaned_text: string; raw_text: string; audio_url?: string }>;

interface PopupResult {
  type: FeedbackType;
  message: string;
  /** CCM-284 — present when the comment was dictated + storage was opted-in. */
  audioUrl?: string;
}

interface TypeOption {
  type: FeedbackType;
  label: string;
}

/**
 * Popup form shown after drawing an annotation rectangle.
 *
 * Glassmorphism design: frosted glass background, soft shadows,
 * pill-shaped type buttons, gradient submit button.
 * Lives outside Shadow DOM.
 */
export class Popup {
  private root: HTMLElement;
  /**
   * CCM-290 — the composer now defaults to `"comment"` so typing immediately
   * enables the submit button (no separate type pick required).
   */
  private selectedType: FeedbackType = "comment";
  private textarea: HTMLTextAreaElement;
  private submitBtn: HTMLButtonElement;
  private resolve: ((result: PopupResult | null) => void) | null = null;
  private previouslyFocused: HTMLElement | null = null;
  private onKeydownTrap: ((e: KeyboardEvent) => void) | null = null;
  /** CCM-290 — replaces the 2x2 button grid. */
  private typeSelect: HTMLSelectElement;

  // CCM-284 — mic state
  private micBtn: HTMLButtonElement | null = null;
  private recorder: AudioRecorder | null = null;
  private micState: "hidden" | "idle" | "recording" | "transcribing" = "hidden";
  private currentContext: PopupContext | null = null;
  private pendingAudioUrl: string | undefined;

  constructor(
    private readonly colors: ThemeColors,
    private readonly t: TFunction,
    private readonly transcribe?: PopupTranscribe,
  ) {
    this.root = el("div", {
      style: `
        position:fixed;
        z-index:${Z_INDEX_MAX};
        width:300px;
        padding:16px;
        border-radius:16px;
        background:${this.colors.glassBg};
        backdrop-filter:blur(24px);
        -webkit-backdrop-filter:blur(24px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow}, 0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        opacity:0;
        transform:translateY(8px) scale(0.98);
        transition:opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display:none;
        -webkit-font-smoothing:antialiased;
      `,
    });

    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-label", this.t("popup.ariaLabel"));

    // CCM-290 — single <select> in place of the previous 2x2 button grid.
    // Comment is the default; keyboard nav + screen reader handling come
    // for free from the browser's native control.
    const typeOptions: TypeOption[] = [
      { type: "comment", label: this.t("type.comment") },
      { type: "question", label: this.t("type.question") },
      { type: "change", label: this.t("type.change") },
      { type: "bug", label: this.t("type.bug") },
      { type: "other", label: this.t("type.other") },
    ];
    this.typeSelect = document.createElement("select");
    this.typeSelect.setAttribute("aria-label", this.t("popup.typeLabel"));
    this.typeSelect.setAttribute("data-ccm-feedback", "popup-type");
    this.typeSelect.style.cssText = `
      width:100%;height:36px;
      padding:0 32px 0 12px;
      margin-bottom:10px;
      border-radius:12px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBgHeavy};
      color:${this.colors.text};
      font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;
      outline:none;cursor:pointer;
      transition:all 0.2s ease;
      appearance:none;-webkit-appearance:none;-moz-appearance:none;
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>");
      background-repeat:no-repeat;
      background-position:right 10px center;
      box-sizing:border-box;
    `;
    for (const option of typeOptions) {
      const optionEl = document.createElement("option");
      optionEl.value = option.type;
      setText(optionEl, option.label);
      if (option.type === this.selectedType) optionEl.selected = true;
      this.typeSelect.appendChild(optionEl);
    }
    this.typeSelect.addEventListener("change", () => {
      this.selectedType = this.typeSelect.value as FeedbackType;
    });
    this.typeSelect.addEventListener("focus", () => {
      this.typeSelect.style.borderColor = this.colors.accent;
      this.typeSelect.style.boxShadow = `0 0 0 3px ${this.colors.accent}14`;
    });
    this.typeSelect.addEventListener("blur", () => {
      this.typeSelect.style.borderColor = this.colors.border;
      this.typeSelect.style.boxShadow = "none";
    });

    // Textarea
    this.textarea = document.createElement("textarea");
    this.textarea.style.cssText = `
      width:100%;min-height:72px;max-height:152px;
      padding:10px 12px;border-radius:12px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBgHeavy};
      color:${this.colors.text};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;line-height:1.5;resize:vertical;
      outline:none;transition:all 0.2s ease;
      box-sizing:border-box;
    `;
    this.textarea.placeholder = this.t("popup.placeholder");
    this.textarea.maxLength = 5000;
    this.textarea.setAttribute("aria-label", this.t("popup.textareaAria"));

    // Keyboard shortcut hint
    const hint = el("div", {
      style: `
        font-size:11px;color:${this.colors.textTertiary};
        text-align:right;margin-top:4px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        letter-spacing:0.01em;
      `,
    });
    // navigator.userAgentData is preferred; navigator.platform is deprecated
    // but still needed as fallback. If both are unavailable, fall back to user agent string parsing.
    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    const isMac = uaData
      ? uaData.platform === "macOS"
      : (navigator.platform?.includes("Mac") ?? /Macintosh|Mac OS X/i.test(navigator.userAgent));
    setText(hint, isMac ? this.t("popup.submitHintMac") : this.t("popup.submitHintOther"));

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
    this.textarea.addEventListener("input", () => {
      this.updateSubmitState();
    });
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.submit();
      }
      if (e.key === "Escape") {
        this.cancel();
      }
    });

    // Button row — mic button (if supported) sits leading, submit stays trailing.
    const btnRow = el("div", { style: "display:flex;align-items:center;gap:8px;margin-top:12px;" });

    // CCM-284 — mic affordance (hidden until show() re-evaluates support/permissions).
    if (this.transcribe && isMediaRecorderSupported()) {
      this.micBtn = document.createElement("button");
      this.micBtn.type = "button";
      this.micBtn.style.cssText = `
        height:34px;width:34px;border-radius:9999px;
        border:1px solid ${this.colors.border};
        background:${this.colors.glassBg};
        color:${this.colors.textTertiary};
        cursor:pointer;
        display:none;
        align-items:center;justify-content:center;
        transition:all 0.2s ease;
        padding:0;
      `;
      this.micBtn.setAttribute("aria-label", this.t("popup.mic.record"));
      this.micBtn.setAttribute("title", this.t("popup.mic.record"));
      // Stable, locale-independent selector for tests (unit + e2e). Matches
      // the existing FAB/panel convention of `data-ccm-feedback` attributes.
      this.micBtn.setAttribute("data-ccm-feedback", "popup-mic");
      this.renderMicIcon(ICON_MIC);
      this.micBtn.addEventListener("click", () => this.onMicClick());
      btnRow.appendChild(this.micBtn);
    }

    // Spacer pushes cancel + submit to the right.
    btnRow.appendChild(el("div", { style: "flex:1 1 auto;" }));

    const cancelBtn = document.createElement("button");
    cancelBtn.style.cssText = `
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
      transition:all 0.2s ease;
    `;
    setText(cancelBtn, this.t("popup.cancel"));
    cancelBtn.addEventListener("click", () => this.cancel());
    cancelBtn.addEventListener("mouseenter", () => {
      cancelBtn.style.borderColor = this.colors.accent;
      cancelBtn.style.color = this.colors.accent;
    });
    cancelBtn.addEventListener("mouseleave", () => {
      cancelBtn.style.borderColor = this.colors.border;
      cancelBtn.style.color = this.colors.textTertiary;
    });

    this.submitBtn = document.createElement("button");
    this.submitBtn.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;
      transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
    `;
    setText(this.submitBtn, this.t("popup.submit"));
    this.submitBtn.addEventListener("click", () => this.submit());

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(this.submitBtn);

    this.root.appendChild(this.typeSelect);
    this.root.appendChild(this.textarea);
    this.root.appendChild(hint);
    this.root.appendChild(btnRow);
    document.body.appendChild(this.root);
  }

  /** CCM-284 — render the mic button's SVG child (replaces existing). */
  private renderMicIcon(svg: string): void {
    if (!this.micBtn) return;
    this.micBtn.textContent = "";
    const icon = parseSvg(svg);
    icon.setAttribute("style", "width:16px;height:16px;");
    this.micBtn.appendChild(icon);
  }

  /** Apply the visual + ARIA state for the mic button. */
  private setMicState(next: "hidden" | "idle" | "recording" | "transcribing"): void {
    this.micState = next;
    if (!this.micBtn) return;
    switch (next) {
      case "hidden":
        this.micBtn.style.display = "none";
        break;
      case "idle":
        this.micBtn.style.display = "inline-flex";
        this.micBtn.disabled = false;
        this.micBtn.style.background = this.colors.glassBg;
        this.micBtn.style.color = this.colors.textTertiary;
        this.micBtn.style.borderColor = this.colors.border;
        this.micBtn.setAttribute("aria-label", this.t("popup.mic.record"));
        this.micBtn.setAttribute("title", this.t("popup.mic.record"));
        this.renderMicIcon(ICON_MIC);
        break;
      case "recording":
        this.micBtn.style.display = "inline-flex";
        this.micBtn.disabled = false;
        this.micBtn.style.background = this.colors.typeBugBg;
        this.micBtn.style.color = this.colors.typeBug;
        this.micBtn.style.borderColor = this.colors.typeBug;
        this.micBtn.setAttribute("aria-label", this.t("popup.mic.stop"));
        this.micBtn.setAttribute("title", this.t("popup.mic.stop"));
        this.renderMicIcon(ICON_STOP);
        break;
      case "transcribing":
        this.micBtn.style.display = "inline-flex";
        this.micBtn.disabled = true;
        this.micBtn.style.background = this.colors.glassBg;
        this.micBtn.style.color = this.colors.accent;
        this.micBtn.style.borderColor = this.colors.accent;
        this.micBtn.setAttribute("aria-label", this.t("popup.mic.transcribing"));
        this.micBtn.setAttribute("title", this.t("popup.mic.transcribing"));
        this.renderMicIcon(ICON_SPINNER);
        break;
    }
  }

  /** Remove the mic button permanently for this popup lifetime (permission denied). */
  private hideMicForever(): void {
    if (!this.micBtn) return;
    this.micBtn.style.display = "none";
    this.micState = "hidden";
  }

  private async onMicClick(): Promise<void> {
    if (!this.transcribe || !this.micBtn) return;
    if (this.micState === "recording") {
      // Second click → stop + transcribe.
      await this.stopAndTranscribe();
      return;
    }
    if (this.micState !== "idle") return;

    this.recorder = new AudioRecorder();
    try {
      await this.recorder.start();
    } catch (error) {
      // Classic permission denied: hide the button and leave typed comments functional.
      const err = error instanceof Error ? error : new Error(String(error));
      if (err.name === "NotAllowedError" || /denied/i.test(err.message)) {
        this.hideMicForever();
        return;
      }
      console.warn("[ccm-feedback] mic start failed:", err);
      this.hideMicForever();
      return;
    }
    this.setMicState("recording");
  }

  private async stopAndTranscribe(): Promise<void> {
    if (!this.recorder || !this.transcribe) return;
    let audio: Blob;
    try {
      audio = await this.recorder.stop();
    } catch (error) {
      console.warn("[ccm-feedback] mic stop failed:", error);
      this.setMicState("idle");
      return;
    }
    this.recorder = null;

    this.setMicState("transcribing");
    // Plan R4 — while the request is in flight, the rest of the popup must
    // not accept input. Freeze the type-selector + submit button so the user
    // can't ship a half-formed comment or switch type mid-request.
    this.setPopupInteractivityDuringTranscribe(false);
    const context: PopupContext = this.currentContext ?? {
      selector: "",
      surroundingText: "",
      projectName: "",
    };
    try {
      const result = await this.transcribe({ audio, context });
      this.applyTranscription(result.cleaned_text);
      if (result.audio_url) this.pendingAudioUrl = result.audio_url;
    } catch (error) {
      console.warn("[ccm-feedback] transcribe failed:", error);
    } finally {
      this.setPopupInteractivityDuringTranscribe(true);
      this.setMicState("idle");
    }
  }

  /**
   * Plan R4 — during `transcribing`, disable type buttons + submit button so
   * the in-flight request can't be raced by a click. On restore, we recompute
   * submit enablement via `updateSubmitState()` so it reflects the (possibly
   * now-populated) textarea.
   */
  private setPopupInteractivityDuringTranscribe(enabled: boolean): void {
    // CCM-290 — freeze the <select> (not the former grid of buttons) while
    // transcription is in flight so the in-flight request can't be raced by
    // a quick type-switch.
    this.typeSelect.disabled = !enabled;
    this.typeSelect.style.opacity = enabled ? "1" : "0.5";
    if (enabled) {
      // Recompute submit state from textarea contents.
      this.updateSubmitState();
    } else {
      this.submitBtn.disabled = true;
      this.submitBtn.style.opacity = "0.35";
      this.submitBtn.style.pointerEvents = "none";
    }
  }

  /**
   * Merge-rule insertion (plan §Key Technical Decisions):
   * - If textarea was empty at record-start and is still empty → set value.
   * - If textarea had content typed BEFORE recording → append with a space.
   * - If the user typed DURING recording → append with a space.
   * Never overwrite user keystrokes.
   */
  private applyTranscription(cleaned: string): void {
    const text = (cleaned ?? "").trim();
    if (!text) return;
    const current = this.textarea.value;
    let next: string;
    if (current.length === 0) {
      // Textarea empty now — safe to set.
      next = text;
    } else {
      // Any existing content (whether pre-existing or mid-record typed) is
      // preserved; append with a single separating space.
      const needsSpace = !/\s$/.test(current);
      next = `${current}${needsSpace ? " " : ""}${text}`;
    }
    this.textarea.value = next;
    // Move caret to end and re-run submit-state compute.
    this.textarea.setSelectionRange(next.length, next.length);
    this.textarea.focus();
    this.textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /**
   * Show the popup near a drawn rectangle and return the user's input.
   * Returns null if cancelled.
   *
   * CCM-284 — when `context` is provided and the browser + permissions
   * allow it, the mic button is enabled and recordings are transcribed
   * via the `transcribe` callback.
   */
  show(rectBounds: DOMRect, context?: PopupContext): Promise<PopupResult | null> {
    this.currentContext = context ?? null;
    this.pendingAudioUrl = undefined;
    return new Promise((resolve) => {
      this.resolve = resolve;
      // CCM-290 — reset to the default "comment" type on every open.
      this.selectedType = "comment";
      this.typeSelect.value = "comment";
      this.textarea.value = "";
      this.updateSubmitState();

      // Evaluate mic availability per-show so permission changes between
      // widget opens are respected.
      if (this.micBtn && this.transcribe && context) {
        void queryMicrophonePermission().then((state) => {
          if (state === "denied") {
            this.setMicState("hidden");
          } else {
            this.setMicState("idle");
          }
        });
      } else if (this.micBtn) {
        this.setMicState("hidden");
      }

      // Save focus to restore on close
      this.previouslyFocused = document.activeElement as HTMLElement | null;

      // Position: bottom-left of rect, 8px below
      let top = rectBounds.bottom + 8;
      let left = rectBounds.left;

      // Collision: flip up if not enough space below
      if (top + 220 > window.innerHeight) {
        top = rectBounds.top - 220 - 8;
      }
      // Collision: flip right if not enough space on left
      if (left + 300 > window.innerWidth) {
        left = rectBounds.right - 300;
      }
      left = Math.max(8, left);
      top = Math.max(8, top);

      this.root.style.top = `${top}px`;
      this.root.style.left = `${left}px`;
      this.root.style.display = "block";

      // Install focus trap
      this.onKeydownTrap = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          const focusableEls = Array.from(
            this.root.querySelectorAll<HTMLElement>(
              'button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
            ),
          );
          if (focusableEls.length === 0) return;
          const first = focusableEls[0];
          const last = focusableEls[focusableEls.length - 1];
          if (!first || !last) return;
          if (e.shiftKey) {
            if (document.activeElement === first || !this.root.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last || !this.root.contains(document.activeElement)) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };
      this.root.addEventListener("keydown", this.onKeydownTrap);

      // Check prefers-reduced-motion live (not cached at construction time)
      const reduceMotion =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.root.style.transition = reduceMotion ? "none" : "";

      // Trigger animation
      requestAnimationFrame(() => {
        this.root.style.opacity = "1";
        this.root.style.transform = "translateY(0) scale(1)";
        this.textarea.focus();
      });
    });
  }

  /**
   * CCM-290 — with the composer defaulting to "comment", submit enablement
   * collapses to "does the textarea have non-whitespace content?" — the type
   * is always populated.
   */
  private updateSubmitState(): void {
    const enabled = this.textarea.value.trim().length > 0;
    this.submitBtn.disabled = !enabled;
    this.submitBtn.style.opacity = enabled ? "1" : "0.35";
    this.submitBtn.style.pointerEvents = enabled ? "auto" : "none";
  }

  private submit(): void {
    if (!this.textarea.value.trim()) return;
    this.releaseRecorder();
    const result: PopupResult = {
      type: this.selectedType,
      message: this.textarea.value.trim(),
      ...(this.pendingAudioUrl ? { audioUrl: this.pendingAudioUrl } : {}),
    };
    this.resolve?.(result);
    this.resolve = null;
    this.hideElement();
  }

  private cancel(): void {
    this.releaseRecorder();
    this.resolve?.(null);
    this.resolve = null;
    this.hideElement();
  }

  /** Release any active recorder and stream tracks. Called on every exit path. */
  private releaseRecorder(): void {
    if (this.recorder) {
      this.recorder.cancel();
      this.recorder = null;
    }
    if (this.micState !== "hidden") this.setMicState("idle");
  }

  private hideElement(): void {
    // Remove focus trap
    if (this.onKeydownTrap) {
      this.root.removeEventListener("keydown", this.onKeydownTrap);
      this.onKeydownTrap = null;
    }
    this.root.style.opacity = "0";
    this.root.style.transform = "translateY(8px) scale(0.98)";
    // Restore focus to the previously focused element
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
    setTimeout(() => {
      this.root.style.display = "none";
    }, 250);
  }

  destroy(): void {
    this.releaseRecorder();
    this.root.remove();
  }
}

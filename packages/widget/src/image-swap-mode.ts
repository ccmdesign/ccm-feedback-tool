import type { AllowedImageMime, AnnotationPayload, AssetMeta, ProposedAssetSource } from "@ccm-feedback/core";
import { MAX_ASSET_SIZE_BYTES, UPLOAD_ALLOWED_IMAGE_MIMES } from "@ccm-feedback/core";
import type { WidgetClient } from "./api-client.js";
import { Z_INDEX_MAX } from "./constants.js";
import { generateAnchor } from "./dom/anchor.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n/index.js";
import { validateFileBeforeUpload, validateUrlBeforePaste } from "./image-validation.js";
import type { ThemeColors } from "./styles/theme.js";

/** Payload emitted when the reviewer finalizes an image_swap annotation. */
export interface ImageSwapComplete {
  annotation: AnnotationPayload;
}

interface TargetInfo {
  element: HTMLElement;
  originalAssetUrl: string;
}

/**
 * Image-swap mode (CCM-282).
 *
 * - Hover detection on `<img>` / `<picture>` (and CSS-background elements — the
 *   anchor records the computed background URL; the host DOM is NOT mutated).
 * - On click, opens a swap panel inside the shadow DOM with URL paste +
 *   file picker + alt text.
 * - URL paste → `mirrorAsset({ projectId, url })`. File upload → `signUpload`
 *   + direct PUT to the signed URL.
 * - Emits `image-swap:complete` with an `AnnotationPayload` of type `"image_swap"`.
 */
export class ImageSwapMode {
  private overlay: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private hoveredElement: HTMLElement | null = null;
  private isActive = false;
  private savedOverflow = "";
  private panel: HTMLElement | null = null;

  constructor(
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    private readonly shadow: ShadowRoot,
    private readonly client: WidgetClient,
    private readonly projectId: string | null,
    private readonly shouldIgnoreElement: (element: Element) => boolean,
  ) {
    this.bus.on("image-swap:start", () => this.activate());
  }

  private activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.savedOverflow = document.body.style.overflow;

    this.overlay = el("div", {
      style: `
        position:fixed;inset:0;z-index:${Z_INDEX_MAX - 1};
        background:rgba(15, 23, 42, 0.02);cursor:pointer;
      `,
    });
    this.overlay.setAttribute("aria-hidden", "true");
    this.overlay.setAttribute("data-ccm-image-swap-overlay", "true");

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
    setText(instruction, this.t("imageSwap.instruction"));
    const cancelBtn = document.createElement("button");
    cancelBtn.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
    `;
    setText(cancelBtn, this.t("imageSwap.cancel"));
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
    this.clearHoverOutline();
    this.overlay?.removeEventListener("mousemove", this.onOverlayMouseMove, true);
    this.overlay?.removeEventListener("click", this.onOverlayClick, true);
    document.removeEventListener("keydown", this.onKeyDown);
    this.overlay?.remove();
    this.toolbar?.remove();
    this.closePanel();
    document.body.style.overflow = this.savedOverflow;
    this.overlay = null;
    this.toolbar = null;
    this.isActive = false;
    this.bus.emit("image-swap:end");
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.deactivate();
    }
  };

  private onOverlayMouseMove = (e: MouseEvent): void => {
    if (!this.overlay) return;
    if (this.panel) return;
    this.overlay.style.pointerEvents = "none";
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    this.overlay.style.pointerEvents = "auto";
    if (!target || this.shouldIgnoreElement(target)) {
      this.clearHoverOutline();
      return;
    }
    const info = ImageSwapMode.resolveImageTarget(target);
    if (!info) {
      this.clearHoverOutline();
      return;
    }
    if (info.element === this.hoveredElement) return;
    this.clearHoverOutline();
    this.hoveredElement = info.element;
    this.applyHoverOutline(info.element);
  };

  private onOverlayClick = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.overlay) return;
    this.overlay.style.pointerEvents = "none";
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    this.overlay.style.pointerEvents = "auto";
    if (!target || this.shouldIgnoreElement(target)) return;
    const info = ImageSwapMode.resolveImageTarget(target);
    if (!info) return;
    this.clearHoverOutline();
    this.openPanel(info);
  };

  private applyHoverOutline(target: HTMLElement): void {
    target.style.setProperty("outline", `2px dashed ${this.colors.accent}`, "important");
    target.style.setProperty("outline-offset", "2px", "important");
  }

  private clearHoverOutline(): void {
    if (!this.hoveredElement) return;
    this.hoveredElement.style.removeProperty("outline");
    this.hoveredElement.style.removeProperty("outline-offset");
    this.hoveredElement = null;
  }

  // ---------------------------------------------------------------------------
  // Swap panel (inside shadow DOM)
  // ---------------------------------------------------------------------------

  private closePanel(): void {
    this.panel?.remove();
    this.panel = null;
  }

  private openPanel(info: TargetInfo): void {
    const panel = el("div", {
      style: `
        position:fixed;inset:0;z-index:${Z_INDEX_MAX + 1};
        background:rgba(15, 23, 42, 0.45);
        display:flex;align-items:center;justify-content:center;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
      `,
    });
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", this.t("imageSwap.ariaLabel"));

    const modal = el("div", {
      style: `
        width:420px;max-width:90vw;padding:20px;border-radius:16px;
        background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border:1px solid ${this.colors.glassBorder};
        color:${this.colors.text};
        display:flex;flex-direction:column;gap:12px;
      `,
    });

    const urlLabel = document.createElement("label");
    urlLabel.textContent = this.t("imageSwap.urlLabel");
    urlLabel.style.fontSize = "12px";
    urlLabel.style.color = this.colors.textTertiary;
    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = this.t("imageSwap.urlPlaceholder");
    urlInput.style.cssText = `
      height:36px;padding:0 12px;border-radius:8px;
      border:1px solid ${this.colors.border};background:${this.colors.bg};
      color:${this.colors.text};font-size:13px;
    `;

    const fileLabel = document.createElement("label");
    fileLabel.textContent = this.t("imageSwap.fileLabel");
    fileLabel.style.fontSize = "12px";
    fileLabel.style.color = this.colors.textTertiary;
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    // CCM-282 P1: SVG is intentionally excluded from the signed-upload accept
    // list. Reviewers can still mirror SVGs by pasting a URL — that path runs
    // `isSafeSvg()` server-side before storage.
    fileInput.accept = UPLOAD_ALLOWED_IMAGE_MIMES.join(",");
    fileInput.style.fontSize = "13px";

    const altLabel = document.createElement("label");
    altLabel.textContent = this.t("imageSwap.altLabel");
    altLabel.style.fontSize = "12px";
    altLabel.style.color = this.colors.textTertiary;
    const altInput = document.createElement("input");
    altInput.type = "text";
    altInput.placeholder = this.t("imageSwap.altPlaceholder");
    altInput.style.cssText = urlInput.style.cssText;

    const errorBox = document.createElement("div");
    errorBox.setAttribute("role", "alert");
    errorBox.style.cssText = `font-size:12px;color:${this.colors.typeBug};min-height:16px;`;

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:8px;";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = this.t("imageSwap.cancel");
    cancelBtn.style.cssText = `
      height:34px;padding:0 14px;border-radius:8px;
      border:1px solid ${this.colors.border};background:transparent;
      color:${this.colors.textTertiary};font-size:13px;cursor:pointer;
    `;
    cancelBtn.addEventListener("click", () => this.deactivate());
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.textContent = this.t("imageSwap.submit");
    submitBtn.style.cssText = `
      height:34px;padding:0 14px;border-radius:8px;
      border:1px solid ${this.colors.accent};
      background:${this.colors.accent};color:#fff;
      font-size:13px;cursor:pointer;
    `;

    submitBtn.addEventListener("click", async () => {
      errorBox.textContent = "";
      submitBtn.disabled = true;
      try {
        await this.handleSubmit(info, {
          url: urlInput.value.trim(),
          file: fileInput.files?.[0] ?? null,
          altText: altInput.value.trim(),
          setError: (msg) => {
            errorBox.textContent = msg;
          },
        });
      } finally {
        submitBtn.disabled = false;
      }
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(submitBtn);

    modal.appendChild(urlLabel);
    modal.appendChild(urlInput);
    modal.appendChild(fileLabel);
    modal.appendChild(fileInput);
    modal.appendChild(altLabel);
    modal.appendChild(altInput);
    modal.appendChild(errorBox);
    modal.appendChild(btnRow);
    panel.appendChild(modal);

    this.shadow.appendChild(panel);
    this.panel = panel;
    urlInput.focus();
  }

  private async handleSubmit(
    info: TargetInfo,
    opts: { url: string; file: File | null; altText: string; setError: (msg: string) => void },
  ): Promise<void> {
    if (!this.projectId) {
      opts.setError(this.t("imageSwap.errorUpload"));
      return;
    }

    let proposedAssetUrl: string | null = null;
    let assetMeta: AssetMeta | null = null;
    let source: ProposedAssetSource | null = null;

    if (opts.file) {
      const sizeErr = validateFileBeforeUpload(opts.file);
      if (sizeErr) {
        opts.setError(this.errorMessage(sizeErr.kind));
        return;
      }
      try {
        const signResponse = await this.client.signUpload?.({
          projectId: this.projectId,
          filename: opts.file.name,
          contentType: opts.file.type as AllowedImageMime,
          sizeBytes: opts.file.size,
        });
        if (!signResponse) throw new Error("sign-upload not supported");
        const putResponse = await fetch(signResponse.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": opts.file.type },
          body: opts.file,
        });
        if (!putResponse.ok) throw new Error(`PUT failed with ${putResponse.status}`);
        proposedAssetUrl = signResponse.proposedAssetUrl;
        source = "upload";
        assetMeta = {
          width: 0,
          height: 0,
          sizeBytes: opts.file.size,
          mime: opts.file.type as AllowedImageMime,
        };
      } catch {
        opts.setError(this.t("imageSwap.errorUpload"));
        return;
      }
    } else if (opts.url) {
      const urlErr = validateUrlBeforePaste(opts.url);
      if (urlErr) {
        opts.setError(this.errorMessage(urlErr.kind));
        return;
      }
      try {
        const mirrored = await this.client.mirrorAsset?.({ projectId: this.projectId, url: opts.url });
        if (!mirrored) throw new Error("mirror not supported");
        proposedAssetUrl = mirrored.proposedAssetUrl;
        source = "link";
        if (mirrored.assetMeta) {
          assetMeta = mirrored.assetMeta;
        } else {
          assetMeta = {
            width: 0,
            height: 0,
            sizeBytes: 0,
            mime: "image/jpeg",
          };
        }
      } catch {
        opts.setError(this.t("imageSwap.errorMirror"));
        return;
      }
    } else {
      opts.setError(this.t("imageSwap.errorUrl"));
      return;
    }

    if (!proposedAssetUrl || !source || !assetMeta) {
      opts.setError(this.t("imageSwap.errorUpload"));
      return;
    }

    // Build the AnnotationPayload.
    const anchor = generateAnchor(info.element);
    const bounds = info.element.getBoundingClientRect();
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
      type: "image_swap",
      originalAssetUrl: info.originalAssetUrl,
      proposedAssetUrl,
      proposedAssetSource: source,
      proposedAltText: opts.altText || undefined,
      assetMeta,
    };

    this.bus.emit("image-swap:complete", { annotation });
    this.deactivate();
  }

  private errorMessage(kind: "size" | "mime" | "url" | "generic"): string {
    switch (kind) {
      case "size":
        return this.t("imageSwap.errorSize");
      case "mime":
        return this.t("imageSwap.errorMime");
      case "url":
        return this.t("imageSwap.errorUrl");
      default:
        return this.t("imageSwap.errorUpload");
    }
  }

  /**
   * Resolve an arbitrary hit target into the best image-bearing element to
   * anchor against. Handles direct `<img>`, `<picture>` (returns inner img),
   * and CSS-background-image elements.
   */
  static resolveImageTarget(element: HTMLElement): TargetInfo | null {
    if (element.tagName === "IMG") {
      const src = (element as HTMLImageElement).currentSrc || (element as HTMLImageElement).src;
      if (src) return { element, originalAssetUrl: src };
    }
    if (element.tagName === "PICTURE") {
      const innerImg = element.querySelector("img");
      if (innerImg) {
        const src = innerImg.currentSrc || innerImg.src;
        if (src) return { element: innerImg, originalAssetUrl: src };
      }
    }
    const bg = element.style.backgroundImage || "";
    const computed =
      typeof window !== "undefined" && element instanceof Element
        ? (window.getComputedStyle?.(element).backgroundImage ?? "")
        : "";
    const combined = bg || computed;
    if (combined && combined !== "none") {
      const match = /url\(["']?([^"')]+)["']?\)/.exec(combined);
      if (match?.[1]) return { element, originalAssetUrl: match[1] };
    }
    return null;
  }

  destroy(): void {
    this.deactivate();
  }

  /** Maximum accepted asset size in bytes — exposed for tests. */
  static readonly MAX_ASSET_SIZE_BYTES = MAX_ASSET_SIZE_BYTES;
}

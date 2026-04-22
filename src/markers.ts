import { Z_INDEX_MAX } from "./constants.js";
import { resolveAnnotation } from "./dom/resolver.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import type { Store } from "./store.js";
import type { ThemeColors } from "./styles/theme.js";
import type { AnnotationRecord } from "./types.js";

const MARKER_SIZE = 26;
const MARKER_OFFSET = MARKER_SIZE / 2;
const REPOSITION_DEBOUNCE_MS = 200;

interface MarkerEntry {
  record: AnnotationRecord;
  node: HTMLElement;
  anchorEl: Element | null;
}

/**
 * Pin markers rendered on top of resolved anchor elements.
 * Click opens a popover with the comment body + delete button.
 * All markers live in a single fixed container appended to `document.body`.
 */
export class MarkerManager {
  private container: HTMLElement;
  private entries: MarkerEntry[] = [];
  private visible = true;
  private popover: HTMLElement | null = null;
  private repositionTimer: number | null = null;
  private readonly onResize: () => void;
  private readonly onScroll: () => void;
  private readonly onDocClick: (e: MouseEvent) => void;
  private readonly onPopState: () => void;
  private readonly origPushState: typeof history.pushState;
  private readonly origReplaceState: typeof history.replaceState;
  private lastPath = window.location.pathname;

  constructor(
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    private readonly store: Store,
  ) {
    this.container = el("div", {
      style: `position:absolute;top:0;left:0;width:0;height:0;z-index:${Z_INDEX_MAX - 2};pointer-events:none;`,
    });
    this.container.setAttribute("aria-hidden", "false");
    this.container.setAttribute("data-ccm-markers", "true");
    document.body.appendChild(this.container);

    this.onResize = this.scheduleReposition.bind(this);
    this.onScroll = this.scheduleReposition.bind(this);
    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true });

    this.onDocClick = (e) => {
      if (!this.popover) return;
      if (e.composedPath().some((n) => n === this.popover)) return;
      this.closePopover();
    };
    document.addEventListener("click", this.onDocClick, true);

    // SPA navigation: re-filter markers when pathname changes via the
    // History API. Covers Nuxt, React Router, Vue Router, Next.js.
    const checkPath = () => {
      if (window.location.pathname === this.lastPath) return;
      this.lastPath = window.location.pathname;
      this.refresh();
    };
    this.onPopState = checkPath;
    window.addEventListener("popstate", this.onPopState);
    this.origPushState = history.pushState.bind(history);
    this.origReplaceState = history.replaceState.bind(history);
    history.pushState = (...args) => {
      this.origPushState(...args);
      checkPath();
    };
    history.replaceState = (...args) => {
      this.origReplaceState(...args);
      checkPath();
    };

    this.bus.on("annotations:toggle", (visible) => this.setVisible(visible));
  }

  /** Render all stored annotations. Called on page load and after save/delete. */
  refresh(): void {
    this.closePopover();
    for (const entry of this.entries) entry.node.remove();
    this.entries = [];

    const records = this.store.listForPath(window.location.pathname);
    records.forEach((record, idx) => {
      const node = this.buildMarker(record, idx + 1);
      this.container.appendChild(node);
      this.entries.push({ record, node, anchorEl: null });
    });
    this.reposition();
  }

  addOne(record: AnnotationRecord): void {
    const idx = this.entries.length + 1;
    const node = this.buildMarker(record, idx);
    this.container.appendChild(node);
    this.entries.unshift({ record, node, anchorEl: null });
    this.renumber();
    this.reposition();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.style.display = visible ? "block" : "none";
    if (!visible) this.closePopover();
  }

  private buildMarker(record: AnnotationRecord, number: number): HTMLElement {
    const node = el("button", {
      type: "button",
      "aria-label": this.t("marker.ariaLabel", { n: number }),
      style: `
        position:absolute;width:${MARKER_SIZE}px;height:${MARKER_SIZE}px;
        border-radius:9999px;border:2px solid #fff;
        background:${this.colors.accentGradient};color:#fff;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:12px;font-weight:700;line-height:1;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px ${this.colors.accentGlow}, 0 1px 2px rgba(0,0,0,0.18);
        cursor:pointer;pointer-events:auto;
        transform:translate(-50%, -50%);transition:transform 0.15s ease;
      `,
    }) as HTMLButtonElement;
    node.dataset.annotationId = record.id;
    setText(node, String(number));
    node.addEventListener("mouseenter", () => {
      node.style.transform = "translate(-50%, -50%) scale(1.12)";
    });
    node.addEventListener("mouseleave", () => {
      node.style.transform = "translate(-50%, -50%) scale(1)";
    });
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openPopover(record, node);
    });
    return node;
  }

  private renumber(): void {
    this.entries.forEach((entry, i) => {
      const n = i + 1;
      setText(entry.node, String(n));
      entry.node.setAttribute("aria-label", this.t("marker.ariaLabel", { n }));
    });
  }

  private openPopover(record: AnnotationRecord, marker: HTMLElement): void {
    this.closePopover();
    const rect = marker.getBoundingClientRect();
    const pop = el("div", {
      style: `
        position:fixed;z-index:${Z_INDEX_MAX};max-width:300px;min-width:220px;padding:14px;
        border-radius:12px;background:${this.colors.glassBg};
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow},0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        color:${this.colors.text};font-size:13px;line-height:1.5;
        -webkit-font-smoothing:antialiased;
      `,
    });
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", this.t("marker.ariaLabel", { n: "" }));
    pop.addEventListener("click", (e) => e.stopPropagation());

    const body = el("div", { style: "white-space:pre-wrap;word-break:break-word;margin-bottom:10px;" });
    setText(body, record.message);

    const meta = el("div", {
      style: `font-size:11px;color:${this.colors.textTertiary};margin-bottom:12px;`,
    });
    setText(meta, new Date(record.createdAt).toLocaleString());

    const btnRow = el("div", { style: "display:flex;justify-content:flex-end;gap:8px;" });

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.style.cssText = `
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:12px;font-weight:500;
      cursor:pointer;transition:all 0.2s ease;
    `;
    setText(closeBtn, this.t("marker.popover.close"));
    closeBtn.addEventListener("click", () => this.closePopover());

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.style.cssText = `
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.typeBug};background:${this.colors.typeBugBg};
      color:${this.colors.typeBug};font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `;
    setText(deleteBtn, this.t("marker.popover.delete"));
    deleteBtn.addEventListener("click", () => {
      this.store.delete(record.id);
      this.bus.emit("feedback:deleted", record.id);
      this.closePopover();
      this.refresh();
    });

    btnRow.appendChild(closeBtn);
    btnRow.appendChild(deleteBtn);
    pop.appendChild(body);
    pop.appendChild(meta);
    pop.appendChild(btnRow);

    let top = rect.bottom + 8;
    let left = rect.left - 10;
    if (top + 180 > window.innerHeight) top = rect.top - 180 - 8;
    if (left + 300 > window.innerWidth) left = window.innerWidth - 300 - 8;
    top = Math.max(8, top);
    left = Math.max(8, left);
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;

    document.body.appendChild(pop);
    this.popover = pop;
  }

  private closePopover(): void {
    if (!this.popover) return;
    this.popover.remove();
    this.popover = null;
  }

  private scheduleReposition(): void {
    if (this.repositionTimer !== null) return;
    this.repositionTimer = window.setTimeout(() => {
      this.repositionTimer = null;
      this.reposition();
    }, REPOSITION_DEBOUNCE_MS);
  }

  private reposition(): void {
    for (const entry of this.entries) {
      const resolved = resolveAnnotation(
        {
          cssSelector: entry.record.cssSelector,
          xpath: entry.record.xpath,
          textSnippet: entry.record.textSnippet,
          elementTag: entry.record.elementTag,
          elementId: entry.record.elementId,
          textPrefix: entry.record.textPrefix,
          textSuffix: entry.record.textSuffix,
          fingerprint: entry.record.fingerprint,
          neighborText: entry.record.neighborText,
        },
        { xPct: entry.record.xPct, yPct: entry.record.yPct, wPct: entry.record.wPct, hPct: entry.record.hPct },
      );
      if (!resolved) {
        entry.node.style.display = "none";
        entry.anchorEl = null;
        continue;
      }
      entry.anchorEl = resolved.element;
      const rect = resolved.rect;
      // Pin at top-right corner of the resolved rect.
      const top = rect.top + window.scrollY - MARKER_OFFSET;
      const left = rect.right + window.scrollX - MARKER_OFFSET;
      entry.node.style.display = this.visible ? "flex" : "none";
      entry.node.style.top = `${top + MARKER_OFFSET}px`;
      entry.node.style.left = `${left + MARKER_OFFSET}px`;
    }
  }

  destroy(): void {
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("click", this.onDocClick, true);
    history.pushState = this.origPushState;
    history.replaceState = this.origReplaceState;
    this.closePopover();
    this.container.remove();
    this.entries = [];
  }
}

import { Z_INDEX_MAX } from "./constants.js";
import { resolveAnnotation } from "./dom/resolver.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import { STATUS_COLORS } from "./popup.js";
import type { AnnotationStore } from "./store.js";
import type { ThemeColors } from "./styles/theme.js";
import type { AnnotationRecord, FeedbackStatus } from "./types.js";

const MARKER_SIZE = 26;
const MARKER_OFFSET = MARKER_SIZE / 2;
const REPOSITION_DEBOUNCE_MS = 200;
const POPOVER_ANCHOR_NAME = "--ccm-popover-anchor";

/** True when the browser supports CSS anchor positioning (Chrome 125+). */
const SUPPORTS_ANCHOR =
  typeof CSS !== "undefined" && CSS.supports("anchor-name: --a") && CSS.supports("position-area: bottom");

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
  /** When false, markers for records with `status === "done"` are filtered
   * out of the rendered set. Flipped to true only while the drawer is
   * actively focused on the Done tab so resolved work doesn't clutter the
   * page. */
  private includeDone = false;
  private popover: HTMLElement | null = null;
  private anchoredMarker: HTMLElement | null = null;
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
    private readonly store: AnnotationStore,
  ) {
    // `overflow-x: clip` + `width: 100%` is a defensive guard: any pin that
    // accidentally lands past the viewport's right edge (stale capture from
    // a wider viewport, resolved target that extends off-screen, etc.) is
    // visually clipped here and — crucially — does not contribute to
    // `documentElement.scrollWidth`, which would otherwise inject a
    // horizontal scrollbar on the host page. `overflow-y` stays `visible`
    // so absolutely-positioned children below container origin still
    // paint freely. (`clip` paired with `visible` is the only combination
    // where the visible axis is preserved; `hidden` would force the other
    // axis to `auto`.)
    this.container = el("div", {
      style: `position:absolute;top:0;left:0;width:100%;height:0;overflow-x:clip;overflow-y:visible;z-index:${Z_INDEX_MAX - 2};pointer-events:none;`,
    });
    this.container.setAttribute("aria-hidden", "false");
    this.container.setAttribute("data-ccm-markers", "true");
    document.body.appendChild(this.container);

    if (!document.getElementById("ccm-marker-anim")) {
      const styleEl = document.createElement("style");
      styleEl.id = "ccm-marker-anim";
      styleEl.textContent = `
        @keyframes ccm-pulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(139,92,246,0.55), 0 0 0 0 rgba(139,92,246,0.55); }
          50%      { box-shadow: 0 2px 8px rgba(139,92,246,0.55), 0 0 0 10px rgba(139,92,246,0); }
        }
        @keyframes ccm-anchor-flash {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); outline-color: rgba(139,92,246,0); }
          30%      { box-shadow: 0 0 0 6px rgba(139,92,246,0.35); outline-color: rgba(139,92,246,0.95); }
          70%      { box-shadow: 0 0 0 10px rgba(139,92,246,0); outline-color: rgba(139,92,246,0.4); }
        }
        .ccm-anchor-flash {
          outline: 2px solid rgba(139,92,246,0);
          outline-offset: 3px;
          animation: ccm-anchor-flash 1.2s ease-in-out 1;
          border-radius: 2px;
        }
      `;
      document.head.appendChild(styleEl);
    }

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

    const records = this.store.listForPath(window.location.pathname).filter((r) => this.shouldRender(r));
    records.forEach((record, idx) => {
      const node = this.buildMarker(record, idx + 1);
      this.container.appendChild(node);
      this.entries.push({ record, node, anchorEl: null });
    });
    this.reposition();
  }

  addOne(record: AnnotationRecord): void {
    if (!this.shouldRender(record)) return;
    const idx = this.entries.length + 1;
    const node = this.buildMarker(record, idx);
    this.container.appendChild(node);
    this.entries.unshift({ record, node, anchorEl: null });
    this.renumber();
    this.reposition();
  }

  /** Gate for whether a record should appear in the marker layer. */
  private shouldRender(record: AnnotationRecord): boolean {
    const status = record.status ?? "todo";
    if (status === "done" && !this.includeDone) return false;
    return true;
  }

  /**
   * Toggle whether `done` markers participate in the rendered set. Called
   * by the drawer when its filter chip changes — the drawer is the only
   * UI surface that exposes done comments, so its filter is the source of
   * truth for marker visibility. No-op when the flag is unchanged.
   */
  setIncludeDone(include: boolean): void {
    if (this.includeDone === include) return;
    this.includeDone = include;
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.style.display = visible ? "block" : "none";
    if (!visible) this.closePopover();
  }

  /**
   * Read-only locatability probe used by the comment navigator drawer.
   * True when an entry exists for `id` and its marker resolved on the
   * current page (pin/area are coordinate-anchored → always locatable;
   * target is locatable only when `reposition()` resolved its anchor).
   * Never throws — a missing entry or orphaned anchor is a normal state.
   */
  canLocate(id: string): boolean {
    const entry = this.entries.find((e) => e.record.id === id);
    if (!entry) return false;
    return this.isEntryLocatable(entry);
  }

  /**
   * Read-only navigator hook: scroll the page so the marker for `id` is in
   * view and flash it. Returns false (no-op, no throw) when the entry is
   * missing or its anchor can't be located on the current page so the
   * drawer can render the passive "can't locate" row state instead.
   */
  scrollToAndFlash(id: string): boolean {
    const entry = this.entries.find((e) => e.record.id === id);
    if (!entry || !this.isEntryLocatable(entry)) return false;

    const top = Number.parseFloat(entry.node.style.top);
    if (Number.isFinite(top)) {
      window.scrollTo({ top: Math.max(0, top - window.innerHeight / 3), behavior: "smooth" });
    }

    // Skip the flash when markers are toggled off — nothing visible to
    // flash, and we deliberately do not force the global toggle back on.
    if (this.visible) {
      const node = entry.node;
      node.style.animation = "ccm-pulse 0.6s ease-in-out 1";
      window.setTimeout(() => {
        const status = node.dataset.status;
        // Restore the perpetual pulse for `question` markers; clear otherwise.
        node.style.animation = status === "question" ? "ccm-pulse 1.6s ease-in-out infinite" : "";
      }, 650);
    }

    // Also flash the underlying anchored DOM element so the reviewer sees
    // *what* was pinned, not just the marker. Only "target" kinds carry a
    // resolved anchor element; "pin" / "area" comments are coordinate-based
    // and the marker itself is the visual cue.
    this.flashAnchorElement(entry);
    return true;
  }

  /**
   * Briefly outline + glow the live DOM element that this annotation was
   * anchored to. Uses a transient class so the page's own CSS isn't
   * mutated. No-op for non-target kinds and for entries whose anchor
   * couldn't be resolved on the current page.
   */
  private flashAnchorElement(entry: MarkerEntry): void {
    const kind = entry.record.kind ?? "target";
    if (kind !== "target") return;
    const target = entry.anchorEl;
    if (!target || !(target instanceof HTMLElement)) return;
    target.classList.remove("ccm-anchor-flash");
    // Force a reflow so re-adding the class re-triggers the animation
    // when the same element is targeted twice in a row.
    void target.offsetWidth;
    target.classList.add("ccm-anchor-flash");
    window.setTimeout(() => {
      target.classList.remove("ccm-anchor-flash");
    }, 1250);
  }

  private isEntryLocatable(entry: MarkerEntry): boolean {
    const kind = entry.record.kind ?? "target";
    if (kind === "pin" && entry.record.pinX != null && entry.record.pinY != null) return true;
    if (
      kind === "area" &&
      entry.record.areaX != null &&
      entry.record.areaY != null &&
      entry.record.areaW != null &&
      entry.record.areaH != null
    ) {
      return true;
    }
    // target: `reposition()` sets `anchorEl` to the resolved element (or null
    // when the four-strategy resolver fails) independent of `this.visible`.
    // Locatability tracks anchor *resolution* only — NOT the global
    // markers-visible toggle. Gating on `display !== "none"` here would make
    // every resolvable target read as unlocatable while comments are hidden
    // via the FAB eye, breaking the drawer's hide-then-jump flow.
    // `scrollToAndFlash` still scrolls (and just skips the flash) when hidden.
    return entry.anchorEl != null;
  }

  private buildMarker(record: AnnotationRecord, number: number): HTMLElement {
    const status: FeedbackStatus = record.status ?? "todo";
    const sc = STATUS_COLORS[status];
    const node = el("button", {
      type: "button",
      "aria-label": this.t("marker.ariaLabel", { n: number }),
      style: `
        position:absolute;width:${MARKER_SIZE}px;height:${MARKER_SIZE}px;
        border-radius:9999px;border:2px solid #fff;
        background:${sc.border};color:#fff;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:12px;font-weight:700;line-height:1;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18);
        cursor:pointer;pointer-events:auto;
        transform:translate(-50%, -50%);transition:transform 0.15s ease;
      `,
    }) as HTMLButtonElement;
    node.dataset.annotationId = record.id;
    node.dataset.status = status;
    node.dataset.kind = record.kind ?? "target";
    if (status === "question") {
      node.style.animation = "ccm-pulse 1.6s ease-in-out infinite";
    }
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
    const pop = el("div", {
      style: `
        z-index:${Z_INDEX_MAX};max-width:300px;min-width:220px;padding:14px;
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
    const author = record.authorName?.trim() || "Anonymous";
    setText(meta, `${author} · ${new Date(record.createdAt).toLocaleString()}`);

    const status: FeedbackStatus = record.status ?? "todo";
    const sc = STATUS_COLORS[status];
    const statusPill = el("span", {
      style: `
        display:inline-block;padding:2px 10px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${sc.bg};color:${sc.fg};border:1px solid ${sc.border};
        margin-right:6px;cursor:pointer;
      `,
    });
    setText(statusPill, this.t(`status.${status}`).toUpperCase());
    statusPill.addEventListener("click", () => this.cycleStatus(record));

    const kindBadge = el("span", {
      style: `
        display:inline-block;padding:2px 8px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${this.colors.glassBgHeavy};color:${this.colors.textTertiary};
        border:1px solid ${this.colors.border};margin-right:6px;text-transform:uppercase;
      `,
    });
    setText(kindBadge, record.kind ?? "target");

    const tagsRow = el("div", { style: "margin-bottom:10px;display:flex;flex-wrap:wrap;gap:4px;" });
    tagsRow.appendChild(statusPill);
    tagsRow.appendChild(kindBadge);

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
      if (!window.confirm(this.t("marker.popover.deleteConfirm"))) return;
      this.store.delete(record.id);
      this.bus.emit("feedback:deleted", record.id);
      this.closePopover();
      this.refresh();
    });

    btnRow.appendChild(closeBtn);
    btnRow.appendChild(deleteBtn);
    pop.appendChild(tagsRow);
    pop.appendChild(body);
    pop.appendChild(meta);
    pop.appendChild(btnRow);

    if (SUPPORTS_ANCHOR) {
      marker.style.setProperty("anchor-name", POPOVER_ANCHOR_NAME);
      this.anchoredMarker = marker;
      pop.style.position = "absolute";
      pop.style.setProperty("position-anchor", POPOVER_ANCHOR_NAME);
      pop.style.setProperty("position-area", "bottom span-right");
      pop.style.setProperty("position-try-fallbacks", "flip-block, flip-inline, flip-block flip-inline");
      pop.style.setProperty("position-try-order", "most-height");
      pop.style.margin = "8px 0 0 -10px";
    } else {
      const rect = marker.getBoundingClientRect();
      pop.style.position = "fixed";
      let top = rect.bottom + 8;
      let left = rect.left - 10;
      if (top + 180 > window.innerHeight) top = rect.top - 180 - 8;
      if (left + 300 > window.innerWidth) left = window.innerWidth - 300 - 8;
      top = Math.max(8, top);
      left = Math.max(8, left);
      pop.style.top = `${top}px`;
      pop.style.left = `${left}px`;
    }

    document.body.appendChild(pop);
    this.popover = pop;
  }

  private cycleStatus(record: AnnotationRecord): void {
    const order: FeedbackStatus[] = ["todo", "review", "done", "question"];
    const cur = record.status ?? "todo";
    const next = order[(order.indexOf(cur) + 1) % order.length] ?? "todo";
    this.store.updateStatus?.(record.id, next);
    record.status = next;
    this.bus.emit("feedback:updated", record);
    this.closePopover();
    this.refresh();
  }

  private closePopover(): void {
    if (!this.popover) return;
    this.popover.remove();
    this.popover = null;
    if (this.anchoredMarker) {
      this.anchoredMarker.style.removeProperty("anchor-name");
      this.anchoredMarker = null;
    }
  }

  private scheduleReposition(): void {
    if (this.repositionTimer !== null) return;
    this.repositionTimer = window.setTimeout(() => {
      this.repositionTimer = null;
      this.reposition();
    }, REPOSITION_DEBOUNCE_MS);
  }

  private reposition(): void {
    // Horizontal upper bound — any marker whose center would sit past this
    // page-x value is hidden so it can't grow `documentElement.scrollWidth`
    // and produce a horizontal scrollbar on the host page. Uses the
    // viewport width (clientWidth) under the assumption that the page is
    // laid out for the current viewport — captures taken at a wider
    // breakpoint (recorded `pinX` / `areaX` past current viewport) get
    // dropped rather than rendered off-canvas.
    const viewportRight = document.documentElement.clientWidth;
    const hideIfOffscreenX = (left: number): boolean => left - MARKER_OFFSET > viewportRight;

    for (const entry of this.entries) {
      const kind = entry.record.kind ?? "target";
      if (kind === "pin" && entry.record.pinX != null && entry.record.pinY != null) {
        const left = entry.record.pinX;
        if (hideIfOffscreenX(left)) {
          entry.node.style.display = "none";
          entry.anchorEl = null;
          continue;
        }
        entry.node.style.display = this.visible ? "flex" : "none";
        entry.node.style.top = `${entry.record.pinY}px`;
        entry.node.style.left = `${left}px`;
        entry.anchorEl = null;
        continue;
      }
      if (
        kind === "area" &&
        entry.record.areaX != null &&
        entry.record.areaY != null &&
        entry.record.areaW != null &&
        entry.record.areaH != null
      ) {
        const left = entry.record.areaX + entry.record.areaW;
        if (hideIfOffscreenX(left)) {
          entry.node.style.display = "none";
          entry.anchorEl = null;
          continue;
        }
        entry.node.style.display = this.visible ? "flex" : "none";
        entry.node.style.top = `${entry.record.areaY}px`;
        entry.node.style.left = `${left}px`;
        entry.anchorEl = null;
        continue;
      }
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
      const rect = resolved.rect;
      const top = rect.top + window.scrollY - MARKER_OFFSET;
      const left = rect.right + window.scrollX - MARKER_OFFSET;
      const center = left + MARKER_OFFSET;
      if (hideIfOffscreenX(center)) {
        entry.node.style.display = "none";
        entry.anchorEl = null;
        continue;
      }
      entry.anchorEl = resolved.element;
      entry.node.style.display = this.visible ? "flex" : "none";
      entry.node.style.top = `${top + MARKER_OFFSET}px`;
      entry.node.style.left = `${center}px`;
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

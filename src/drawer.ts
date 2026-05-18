import { el, parseSvg, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import { ICON_CLOSE } from "./icons.js";
import { STATUS_COLORS } from "./popup.js";
import { type AnnotationStore, normalizePath } from "./store.js";
import type { ThemeColors } from "./styles/theme.js";
import { type AnnotationRecord, FEEDBACK_STATUSES, type FeedbackStatus } from "./types.js";

const MESSAGE_TRUNCATE = 140;

/** Status filter value — either a concrete status or the "all" sentinel. */
type StatusFilter = FeedbackStatus | "all";

/**
 * Read-only comment navigator drawer. Lives inside the widget's open Shadow
 * DOM (CSS-isolated via the existing `.sp-panel` stylesheet). Lists every
 * annotation for the project, filters by status, groups current-page-first
 * with a collapsible "Other pages" section, and jumps + flashes a marker on
 * row click. View + navigate only — no editing or status changes here.
 */
export class Drawer {
  private root: HTMLElement;
  private listEl: HTMLElement;
  private filtersEl: HTMLElement;
  private isOpen = false;
  private filter: StatusFilter = "all";
  private otherPagesExpanded = false;
  private previouslyFocused: HTMLElement | null = null;
  private readonly chipButtons = new Map<StatusFilter, HTMLButtonElement>();
  private readonly onDocumentClick: (e: MouseEvent) => void;
  private readonly onKeydown: (e: KeyboardEvent) => void;

  constructor(
    shadowRoot: ShadowRoot,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    private readonly store: AnnotationStore,
    private readonly colors: ThemeColors,
    /** Scroll to + flash a marker. Returns false when the anchor can't be located. */
    private readonly jump: (id: string) => boolean,
    /** Whether an annotation's marker can be located on the current page. */
    private readonly canLocate: (id: string) => boolean,
  ) {
    this.root = el("div", { class: "sp-panel" });
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", t("drawer.aria"));
    this.root.setAttribute("aria-hidden", "true");
    // Panel starts closed: it is hidden via a CSS transform (not display:none),
    // so without `inert` its controls would stay in the page tab order and
    // aria-hidden would wrap focusable descendants (an ARIA violation).
    this.root.inert = true;

    const header = el("div", { class: "sp-panel-header" });
    const title = el("div", { class: "sp-panel-title" });
    setText(title, t("drawer.title"));
    const closeBtn = el("button", { class: "sp-panel-close", type: "button" }) as HTMLButtonElement;
    closeBtn.setAttribute("aria-label", t("drawer.close"));
    closeBtn.appendChild(parseSvg(ICON_CLOSE));
    closeBtn.addEventListener("click", () => this.close());
    header.appendChild(title);
    header.appendChild(closeBtn);

    this.filtersEl = el("div", { class: "sp-filters" });
    const chips = el("div", { class: "sp-chips" });
    const filterValues: StatusFilter[] = ["all", ...FEEDBACK_STATUSES];
    for (const value of filterValues) {
      const chip = el("button", { class: "sp-chip", type: "button" }) as HTMLButtonElement;
      const label = value === "all" ? t("drawer.filterAll") : t(`status.${value}`);
      setText(chip, label);
      chip.dataset.filter = value;
      chip.setAttribute("aria-pressed", value === this.filter ? "true" : "false");
      chip.addEventListener("click", () => this.setFilter(value));
      this.chipButtons.set(value, chip);
      chips.appendChild(chip);
    }
    this.filtersEl.appendChild(chips);

    this.listEl = el("div", { class: "sp-list" });

    this.root.appendChild(header);
    this.root.appendChild(this.filtersEl);
    this.root.appendChild(this.listEl);
    shadowRoot.appendChild(this.root);

    const host = shadowRoot.host;
    this.onDocumentClick = (e) => {
      if (!this.isOpen) return;
      if (!e.composedPath().includes(host)) this.close();
    };
    this.onKeydown = (e) => {
      if (!this.isOpen) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        this.close();
        return;
      }
      if (e.key === "Tab") this.trapFocus(e);
    };

    this.applyChipStyles();
  }

  open(): void {
    if (this.isOpen) {
      this.render();
      return;
    }
    this.isOpen = true;
    this.previouslyFocused = (this.deepActiveElement() as HTMLElement) ?? null;
    this.render();
    this.root.classList.add("sp-panel--open");
    this.root.setAttribute("aria-hidden", "false");
    this.root.inert = false;
    document.addEventListener("click", this.onDocumentClick);
    document.addEventListener("keydown", this.onKeydown, true);
    requestAnimationFrame(() => {
      const first = this.root.querySelector<HTMLElement>(
        'button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove("sp-panel--open");
    this.root.setAttribute("aria-hidden", "true");
    this.root.inert = true;
    document.removeEventListener("click", this.onDocumentClick);
    document.removeEventListener("keydown", this.onKeydown, true);
    this.bus.emit("navigator:close");
    const target = this.previouslyFocused;
    this.previouslyFocused = null;
    if (target && typeof target.focus === "function") target.focus();
  }

  /** Re-render the list only when currently open (cheap no-op when closed). */
  refreshIfOpen(): void {
    if (this.isOpen) this.render();
  }

  destroy(): void {
    document.removeEventListener("click", this.onDocumentClick);
    document.removeEventListener("keydown", this.onKeydown, true);
    this.root.remove();
  }

  private setFilter(filter: StatusFilter): void {
    this.filter = filter;
    this.applyChipStyles();
    this.render();
  }

  private applyChipStyles(): void {
    for (const [value, chip] of this.chipButtons) {
      const active = value === this.filter;
      chip.classList.toggle("sp-chip--active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  private render(): void {
    this.listEl.replaceChildren();

    const all = this.store.list();
    const filtered = this.filter === "all" ? all : all.filter((r) => (r.status ?? "todo") === this.filter);

    if (all.length === 0) {
      this.listEl.appendChild(this.buildEmpty(this.t("drawer.empty")));
      return;
    }
    if (filtered.length === 0) {
      this.listEl.appendChild(this.buildEmpty(this.t("drawer.emptyFiltered")));
      return;
    }

    const currentPath = normalizePath(window.location.pathname);
    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const currentPage = sorted.filter((r) => normalizePath(r.path) === currentPath);
    const otherPages = sorted.filter((r) => normalizePath(r.path) !== currentPath);

    let n = 0;
    if (currentPage.length > 0) {
      if (otherPages.length > 0) {
        this.listEl.appendChild(this.buildSectionLabel(this.t("drawer.thisPage")));
      }
      for (const record of currentPage) {
        this.listEl.appendChild(this.buildCard(record, ++n));
      }
    }

    if (otherPages.length > 0) {
      const toggle = el("button", { class: "sp-chip", type: "button" }) as HTMLButtonElement;
      toggle.style.cssText = "margin:8px 4px;";
      const setLabel = () => {
        setText(
          toggle,
          `${this.otherPagesExpanded ? "▾ " : "▸ "}${this.t("drawer.otherPages", { n: otherPages.length })}`,
        );
      };
      setLabel();
      toggle.setAttribute("aria-expanded", this.otherPagesExpanded ? "true" : "false");
      const sublist = el("div", {});
      sublist.style.display = this.otherPagesExpanded ? "block" : "none";
      toggle.addEventListener("click", () => {
        this.otherPagesExpanded = !this.otherPagesExpanded;
        sublist.style.display = this.otherPagesExpanded ? "block" : "none";
        toggle.setAttribute("aria-expanded", this.otherPagesExpanded ? "true" : "false");
        setLabel();
      });
      for (const record of otherPages) {
        sublist.appendChild(this.buildCard(record, ++n));
      }
      this.listEl.appendChild(toggle);
      this.listEl.appendChild(sublist);
    }
  }

  private buildSectionLabel(text: string): HTMLElement {
    const label = el("div", {
      style: `font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${this.colors.textTertiary};padding:10px 8px 4px;`,
    });
    setText(label, text);
    return label;
  }

  private buildEmpty(text: string): HTMLElement {
    const empty = el("div", { class: "sp-empty" });
    const txt = el("div", { class: "sp-empty-text" });
    setText(txt, text);
    empty.appendChild(txt);
    return empty;
  }

  private buildCard(record: AnnotationRecord, number: number): HTMLElement {
    const status: FeedbackStatus = record.status ?? "todo";
    const sc = STATUS_COLORS[status];
    const locatable = this.canLocate(record.id);

    const card = el("button", { class: "sp-card", type: "button" }) as HTMLButtonElement;
    card.style.textAlign = "left";
    card.style.width = "100%";
    card.dataset.annotationId = record.id;

    const truncated =
      record.message.length > MESSAGE_TRUNCATE
        ? `${record.message.slice(0, MESSAGE_TRUNCATE).trimEnd()}…`
        : record.message;

    if (locatable) {
      card.setAttribute("aria-label", this.t("drawer.rowAria", { n: number, message: truncated }));
      card.addEventListener("click", () => {
        const ok = this.jump(record.id);
        if (!ok) this.markUnlocatable(card, number, truncated);
      });
    } else {
      this.markUnlocatable(card, number, truncated);
    }

    const bar = el("div", { class: "sp-card-bar", style: `background:${sc.border};` });
    const body = el("div", { class: "sp-card-body" });

    const headerRow = el("div", { class: "sp-card-header" });
    const num = el("span", { class: "sp-card-number" });
    setText(num, `#${number}`);
    const badge = el("span", {
      class: "sp-badge",
      style: `background:${sc.bg};color:${sc.fg};border:1px solid ${sc.border};`,
    });
    setText(badge, this.t(`status.${status}`).toUpperCase());
    const date = el("span", { class: "sp-card-date" });
    setText(date, new Date(record.createdAt).toLocaleDateString());
    headerRow.appendChild(num);
    headerRow.appendChild(badge);
    headerRow.appendChild(date);

    const message = el("div", { class: "sp-card-message" });
    setText(message, truncated);

    const meta = el("div", {
      style: `font-size:11px;color:${this.colors.textTertiary};margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;`,
    });
    const author = record.authorName?.trim() || "Anonymous";
    const kind = record.kind ?? "target";
    const authorEl = el("span", {});
    setText(authorEl, author);
    const kindEl = el("span", { style: "text-transform:uppercase;letter-spacing:0.04em;" });
    setText(kindEl, kind);
    const pathEl = el("span", {
      style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;",
    });
    setText(pathEl, normalizePath(record.path));
    meta.appendChild(authorEl);
    meta.appendChild(kindEl);
    meta.appendChild(pathEl);

    body.appendChild(headerRow);
    body.appendChild(message);
    body.appendChild(meta);

    if (!locatable) {
      const note = el("div", {
        style: `font-size:11px;font-style:italic;color:${this.colors.textTertiary};margin-top:8px;`,
      });
      setText(note, this.t("drawer.cantLocate"));
      body.appendChild(note);
    }

    card.appendChild(bar);
    card.appendChild(body);
    return card;
  }

  /** Flip a card into the passive, non-actionable "can't locate" state. */
  private markUnlocatable(card: HTMLButtonElement, number: number, message: string): void {
    card.classList.add("sp-card--resolved");
    card.disabled = true;
    card.setAttribute("aria-disabled", "true");
    card.style.cursor = "default";
    card.setAttribute("aria-label", this.t("drawer.rowAriaDisabled", { n: number, message }));
  }

  private trapFocus(e: KeyboardEvent): void {
    const focusable = Array.from(
      this.root.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = this.deepActiveElement();
    if (e.shiftKey) {
      if (active === first || !this.root.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !this.root.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }

  /** Resolve the active element across shadow boundaries. */
  private deepActiveElement(): Element | null {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return active;
  }
}

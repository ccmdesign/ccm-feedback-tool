import { el, parseSvg, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import { ICON_CLOSE } from "./icons.js";
import { STATUS_COLORS } from "./popup.js";
import { createStatusDropdown, type StatusDropdownHandle } from "./status-dropdown.js";
import { type AnnotationStore, normalizePath } from "./store.js";
import type { ThemeColors } from "./styles/theme.js";
import { type AnnotationRecord, FEEDBACK_STATUSES, type FeedbackStatus } from "./types.js";

const MESSAGE_TRUNCATE = 140;

/** Status filter value — one concrete status. The drawer always filters by
 * exactly one status (no "all" sentinel): the chips become the canonical
 * way to switch between work-buckets. */
type StatusFilter = FeedbackStatus;

/** Default chip selected on widget boot — kept off `done` so resolved
 * comments stay hidden by default per the "done = out of sight" rule. */
const DEFAULT_FILTER: StatusFilter = "todo";

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
  private filter: StatusFilter = DEFAULT_FILTER;
  private otherPagesExpanded = false;
  private previouslyFocused: HTMLElement | null = null;
  private readonly chipButtons = new Map<StatusFilter, HTMLButtonElement>();
  private readonly chipCounts = new Map<StatusFilter, HTMLElement>();
  private readonly chipLabels = new Map<StatusFilter, string>();
  /** Active per-card status dropdown handles. Re-render destroys all, then
   * rebuilds — keeps the bus + outside-click listeners from leaking when
   * cards are torn down. */
  private readonly cardDropdowns = new Set<StatusDropdownHandle>();
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
    /** Notify the marker layer that the drawer's status filter changed. The
     * marker layer uses this to gate `done`-marker visibility: done markers
     * stay hidden unless the drawer's current filter is `done`. */
    private readonly onFilterChange: (filter: StatusFilter) => void = () => {},
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
    const filterValues: StatusFilter[] = [...FEEDBACK_STATUSES];
    for (const value of filterValues) {
      const chip = el("button", { class: "sp-chip", type: "button" }) as HTMLButtonElement;
      const label = t(`status.${value}`);
      // Two children: a label span + a separate count badge so render() can
      // refresh just the count without re-parsing the chip's text content.
      const labelEl = el("span", { class: "sp-chip-label" });
      setText(labelEl, label);
      const countEl = el("span", { class: "sp-chip-count" });
      countEl.setAttribute("aria-hidden", "true");
      chip.appendChild(labelEl);
      chip.appendChild(countEl);
      chip.dataset.filter = value;
      chip.setAttribute("aria-pressed", value === this.filter ? "true" : "false");
      chip.addEventListener("click", () => this.setFilter(value));
      this.chipButtons.set(value, chip);
      this.chipCounts.set(value, countEl);
      this.chipLabels.set(value, label);
      chips.appendChild(chip);
    }
    this.filtersEl.appendChild(chips);

    this.listEl = el("div", { class: "sp-list" });

    this.root.appendChild(header);
    this.root.appendChild(this.filtersEl);
    this.root.appendChild(this.listEl);
    shadowRoot.appendChild(this.root);

    const host = shadowRoot.host;
    // Outside-click-to-close. Two assumptions keep this correct, both held by
    // the synchronous `open()` path:
    //   1. The listener is added in `open()` *after* the click that opened the
    //      drawer has finished dispatching, so that opening click never reaches
    //      this handler. If `open()` is ever made async, defer the
    //      `addEventListener` to a microtask to preserve this.
    //   2. `composedPath()` includes the shadow `host` for any click that
    //      originated inside the widget (drawer, FAB, popover live under it),
    //      so only genuinely-outside clicks close the drawer.
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
    this.bus.emit("drawer:opened");
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
    this.bus.emit("drawer:closed");
    const target = this.previouslyFocused;
    this.previouslyFocused = null;
    if (target && typeof target.focus === "function") target.focus();
  }

  /** Re-render the list only when currently open (cheap no-op when closed). */
  refreshIfOpen(): void {
    if (this.isOpen) this.render();
  }

  destroy(): void {
    for (const handle of this.cardDropdowns) handle.destroy();
    this.cardDropdowns.clear();
    document.removeEventListener("click", this.onDocumentClick);
    document.removeEventListener("keydown", this.onKeydown, true);
    this.root.remove();
  }

  private setFilter(filter: StatusFilter): void {
    if (this.filter === filter) return;
    this.filter = filter;
    this.applyChipStyles();
    // Notify before render so the marker layer can refresh its visible set
    // first — switching to/from Done changes which markers are rendered.
    this.onFilterChange(filter);
    this.render();
  }

  /** Current chip filter — read-only for callers wiring marker visibility. */
  getFilter(): StatusFilter {
    return this.filter;
  }

  private applyChipStyles(): void {
    for (const [value, chip] of this.chipButtons) {
      const active = value === this.filter;
      chip.classList.toggle("sp-chip--active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  /**
   * Refresh the per-tab count badge using the full annotation list (not the
   * filtered subset) so each tab always shows its own total. Also rewrites
   * the chip's `aria-label` so screen readers announce the count alongside
   * the status name — the visible badge has `aria-hidden="true"` to avoid
   * a double-readout.
   */
  private updateChipCounts(all: readonly AnnotationRecord[]): void {
    const counts = new Map<StatusFilter, number>();
    for (const status of FEEDBACK_STATUSES) counts.set(status, 0);
    for (const r of all) {
      const status = (r.status ?? "todo") as FeedbackStatus;
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    for (const [value, chip] of this.chipButtons) {
      const n = counts.get(value) ?? 0;
      const countEl = this.chipCounts.get(value);
      const label = this.chipLabels.get(value) ?? value;
      if (countEl) setText(countEl, String(n));
      chip.setAttribute("aria-label", `${label} — ${n}`);
    }
  }

  private render(): void {
    // Destroy any per-card dropdowns from the previous render so their bus
    // listeners + outside-click handlers don't leak when the card DOM is
    // detached.
    for (const handle of this.cardDropdowns) handle.destroy();
    this.cardDropdowns.clear();
    this.listEl.replaceChildren();

    const all = this.store.list();
    this.updateChipCounts(all);
    const filtered = all.filter((r) => (r.status ?? "todo") === this.filter);

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

    if (currentPage.length > 0) {
      if (otherPages.length > 0) {
        this.listEl.appendChild(this.buildSectionLabel(this.t("drawer.thisPage")));
      }
      for (const record of currentPage) {
        this.listEl.appendChild(this.buildCard(record));
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
        sublist.appendChild(this.buildCard(record));
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

  /**
   * onPick handler for the per-card status dropdown (PRO-68 §6).
   * - Persists via store.updateStatus (no-op when the store doesn't expose it).
   * - Mutates record.status in place so subsequent renders see the new value.
   * - Emits `feedback:updated` so the marker layer, FAB counts, and any other
   *   subscribers update without us reaching across modules.
   * - Re-renders the drawer list so the card refreshes color + filter
   *   membership in place (cards that no longer match the active chip
   *   disappear; accepted snap behavior).
   */
  private handleStatusPick(record: AnnotationRecord, next: FeedbackStatus, dropdown: StatusDropdownHandle): void {
    if (next === record.status) return;
    this.store.updateStatus?.(record.id, next);
    record.status = next;
    // Update the dropdown's pill color immediately so the visual matches
    // even when the next render is suppressed (filter no-op, no-op store).
    dropdown.setCurrent(next);
    this.bus.emit("feedback:updated", record);
    this.render();
  }

  private buildCard(record: AnnotationRecord): HTMLElement {
    const status: FeedbackStatus = record.status ?? "todo";
    const sc = STATUS_COLORS[status];
    const isCurrentPage = normalizePath(record.path) === normalizePath(window.location.pathname);
    // PRO-68 §8 — display the canonical persisted sequence number. Replies
    // (`parentId` set) carry no number; the drawer renders only top-level
    // comments in v1, so we render `↳` defensively for any reply that
    // slips through, matching the CLI's reply marker. Pre-migration rows
    // without `sequenceNumber` show `?` until the one-time backfill runs.
    const label = record.parentId
      ? "↳"
      : typeof record.sequenceNumber === "number"
        ? String(record.sequenceNumber)
        : "?";

    const card = el("button", { class: "sp-card", type: "button" }) as HTMLButtonElement;
    card.style.textAlign = "left";
    card.style.width = "100%";
    card.dataset.annotationId = record.id;

    const truncated =
      record.message.length > MESSAGE_TRUNCATE
        ? `${record.message.slice(0, MESSAGE_TRUNCATE).trimEnd()}…`
        : record.message;

    // Every row is actionable. Same-page rows jump to the marker (which is
    // guaranteed to be positioned somewhere — current page markers are
    // never hidden, off-viewport ones are clamped, unresolved targets
    // park in the right-edge orphan lane). Cross-page rows navigate to
    // the recorded URL so the reviewer lands on the page where that
    // comment lives. The legacy "can't locate" disabled state is retired.
    card.setAttribute("aria-label", this.t("drawer.rowAria", { n: label, message: truncated }));
    card.addEventListener("click", () => {
      if (isCurrentPage) {
        this.jump(record.id);
      } else if (record.url) {
        window.location.href = record.url;
      }
    });

    const bar = el("div", { class: "sp-card-bar", style: `background:${sc.border};` });
    const body = el("div", { class: "sp-card-body" });

    const headerRow = el("div", { class: "sp-card-header" });
    const num = el("span", { class: "sp-card-number" });
    setText(num, `#${label}`);
    // PRO-68 §6 — drawer cards expose the shared status dropdown so reviewers
    // can sweep statuses without leaving the drawer. Fallback to a read-only
    // pill when the store can't persist (paranoia — both shipped stores do).
    const canUpdate = typeof this.store.updateStatus === "function";
    const dropdown = createStatusDropdown({
      current: status,
      colors: this.colors,
      t: this.t,
      readOnly: !canUpdate,
      onPick: (next) => this.handleStatusPick(record, next, dropdown),
    });
    this.cardDropdowns.add(dropdown);
    // The card itself is a <button> that jumps to the marker — every click
    // inside the dropdown must stopPropagation so the card-jump doesn't
    // fire when the reviewer is just changing status. Belt-and-braces:
    // the trigger/options already stopPropagation internally, but guard at
    // the dropdown root for any future menu chrome we might add.
    dropdown.root.addEventListener("click", (e) => e.stopPropagation());
    dropdown.root.addEventListener("keydown", (e) => e.stopPropagation());
    const date = el("span", { class: "sp-card-date" });
    setText(date, new Date(record.createdAt).toLocaleDateString());
    headerRow.appendChild(num);
    headerRow.appendChild(dropdown.root);
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

    card.appendChild(bar);
    card.appendChild(body);
    return card;
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

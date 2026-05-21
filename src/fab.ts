import { Z_INDEX_MAX } from "./constants.js";
import { parseSvg, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import { ICON_AREA, ICON_CLOSE, ICON_LINK, ICON_PIN, ICON_SITEPING, ICON_TARGET, ICON_TRASH } from "./icons.js";
import { STATUS_COLORS } from "./popup.js";

interface RadialItem {
  id: "target" | "pin" | "area" | "export" | "copyUrl" | "clear";
  icon: string;
  label: string;
  /** When true the item renders disabled (greyed, no bus emit) with a tooltip. */
  disabled?: boolean;
  /** `title`/tooltip text shown when the item is disabled. */
  disabledTitle?: string;
}

const ITEM_GAP = 54;

/** Capture modes whose `*:start` / `*:end` events drive `setModeActive`. */
type CaptureMode = "target" | "pin" | "area";

/**
 * FAB with a six-item radial menu in a single upward fan: target, pin, area,
 * export, copyUrl, clear. The eye visibility toggle lives on the in-mode
 * capture toolbars now, and the chat/navigator item is replaced by the
 * dblclick-opens-drawer gesture (PRO-68 §1).
 *
 * Single-click toggles the radial open/closed. Double-click fires
 * `navigator:open` to open the drawer without expanding the radial. Capture
 * mode clicks (target / pin / area) leave the radial open so reviewers can
 * drop multiple comments back-to-back; one-shot actions (export, copyUrl,
 * clear) still close the radial.
 */
type OpenMode = "closed" | "open";

export class Fab {
  private root: HTMLElement;
  private fab: HTMLButtonElement;
  private radialContainer: HTMLElement;
  /** Yellow todo badge — top-right. */
  private todoBadge: HTMLElement | null = null;
  /** Blue review badge — top-left. */
  private reviewBadge: HTMLElement | null = null;
  /** Saved base aria-label so we can re-append count copy without leaking it. */
  private readonly baseAriaLabel: string;
  private mode: OpenMode = "closed";
  private readonly items: RadialItem[];
  private readonly onDocumentClick: (e: MouseEvent) => void;
  /** Active capture mode while one is in flight; null otherwise. Read by the
   * drawer-opened subscriber so the dblclick gesture cleanly cancels an
   * in-flight capture per spec §4 edge case. */
  private activeMode: CaptureMode | null = null;
  /** Saved z-index for the widget host so `setModeActive(false)` restores it. */
  private savedHostZIndex = "";
  private readonly hostEl: HTMLElement;
  /** Bus unsubscribe handles — drained in `destroy()`. */
  private readonly unsubs: Array<() => void> = [];

  constructor(
    shadowRoot: ShadowRoot,
    private readonly bus: EventBus<WidgetEvents>,
    t: TFunction,
    /** True when the widget persists to Supabase. The Copy-URL item is only
     * functional in cloud mode (the share endpoint serves cloud rows). */
    private readonly cloudMode = false,
  ) {
    this.hostEl = shadowRoot.host as HTMLElement;
    this.items = [
      { id: "target", icon: ICON_TARGET, label: t("fab.targetLabel") },
      { id: "pin", icon: ICON_PIN, label: t("fab.pinLabel") },
      { id: "area", icon: ICON_AREA, label: t("fab.areaLabel") },
      { id: "export", icon: EXPORT_ICON, label: t("fab.export") },
      {
        id: "copyUrl",
        icon: ICON_LINK,
        label: t("fab.copyUrl"),
        // Cloud mode only — in localStorage mode there is nothing server-side
        // to serve, so the item is visibly disabled with an explanatory
        // tooltip and Export JSON stays as the always-available fallback.
        ...(this.cloudMode ? {} : { disabled: true, disabledTitle: t("fab.copyUrlLocalOnly") }),
      },
      { id: "clear", icon: ICON_TRASH, label: t("fab.clear") },
    ];

    this.fab = document.createElement("button");
    this.fab.className = "sp-fab sp-fab--bottom-right sp-anim-fab-in";
    this.fab.style.position = "fixed";
    this.fab.appendChild(parseSvg(ICON_SITEPING));
    this.baseAriaLabel = t("fab.aria");
    this.fab.setAttribute("aria-label", this.baseAriaLabel);
    this.fab.setAttribute("aria-expanded", "false");
    this.fab.addEventListener("click", (e) => {
      if (e.detail >= 2) return;
      this.toggle();
    });
    this.fab.addEventListener("dblclick", (e) => {
      e.preventDefault();
      this.bus.emit("navigator:open");
    });

    this.radialContainer = document.createElement("div");
    this.radialContainer.className = "sp-radial sp-radial--bottom-right";
    this.radialContainer.setAttribute("role", "menu");

    this.items.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.className = "sp-radial-item";
      btn.style.setProperty("--sp-i", String(i));
      btn.appendChild(parseSvg(item.icon));
      btn.setAttribute("role", "menuitem");
      btn.setAttribute("aria-label", item.label);
      btn.dataset.itemId = item.id;
      if (item.disabled) {
        btn.setAttribute("aria-disabled", "true");
        btn.dataset.disabled = "true";
        btn.style.opacity = "0.4";
        btn.style.cursor = "not-allowed";
        if (item.disabledTitle) btn.title = item.disabledTitle;
      }

      const label = document.createElement("span");
      label.className = "sp-radial-label";
      // All items now fan upward — labels sit to the left.
      label.style.cssText = "position:absolute;right:54px;top:50%;transform:translateY(-50%);white-space:nowrap;";
      label.textContent = item.label;
      btn.appendChild(label);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (item.disabled) return; // no bus emit, no close — inert
        this.handleItemClick(item.id);
      });
      this.radialContainer.appendChild(btn);
    });

    this.root = document.createElement("div");
    this.root.appendChild(this.radialContainer);
    this.root.appendChild(this.fab);
    shadowRoot.appendChild(this.root);

    this.onDocumentClick = (e) => {
      if (this.mode !== "closed" && !e.composedPath().includes(this.hostEl)) this.close();
    };
    document.addEventListener("click", this.onDocumentClick);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.mode !== "closed") {
        e.stopPropagation();
        this.close();
      }
    };
    this.fab.addEventListener("keydown", handleEscape);
    this.radialContainer.addEventListener("keydown", handleEscape);

    // Bus subscriptions: drawer-shift, capture-mode z-index lift.
    this.unsubs.push(
      this.bus.on("drawer:opened", () => {
        this.setDrawerOpen(true);
        // Spec §4 edge case: cancel any in-flight capture mode when the drawer
        // opens via dblclick. Without this the capture overlay/toolbar sits on
        // top of the drawer and visually clobbers it.
        if (this.activeMode) {
          this.bus.emit(`${this.activeMode}:end`);
        }
      }),
      this.bus.on("drawer:closed", () => this.setDrawerOpen(false)),
      this.bus.on("target:start", () => this.onModeStart("target")),
      this.bus.on("pin:start", () => this.onModeStart("pin")),
      this.bus.on("area:start", () => this.onModeStart("area")),
      this.bus.on("target:end", () => this.onModeEnd("target")),
      this.bus.on("pin:end", () => this.onModeEnd("pin")),
      this.bus.on("area:end", () => this.onModeEnd("area")),
    );
  }

  /**
   * Render up to two badges on the FAB: yellow `todo` top-right + blue
   * `review` top-left (PRO-68 §5). Each badge hides when its count is zero.
   * Both share a single `aria-label` on the FAB host so screen readers
   * announce both numbers without competing live regions.
   */
  updateCounts(counts: { todo: number; review: number }): void {
    this.todoBadge = this.renderBadge(this.todoBadge, counts.todo, "todo");
    this.reviewBadge = this.renderBadge(this.reviewBadge, counts.review, "review");

    if (counts.todo <= 0 && counts.review <= 0) {
      this.fab.setAttribute("aria-label", this.baseAriaLabel);
      return;
    }
    const parts: string[] = [];
    if (counts.todo > 0) parts.push(`${counts.todo} todo`);
    if (counts.review > 0) parts.push(`${counts.review} review`);
    this.fab.setAttribute("aria-label", `${this.baseAriaLabel}, ${parts.join(", ")}`);
  }

  /** Lazily create / remove a status badge node. */
  private renderBadge(current: HTMLElement | null, count: number, kind: "todo" | "review"): HTMLElement | null {
    if (count <= 0) {
      current?.remove();
      return null;
    }
    let node = current;
    if (!node) {
      node = document.createElement("span");
      // Both badges share the existing `.sp-fab-badge` chrome; the `--left`
      // modifier flips its positioning for the review (blue) badge.
      node.className = kind === "todo" ? "sp-fab-badge" : "sp-fab-badge sp-fab-badge--left";
      // aria-hidden on the badge itself — the combined string lives on the
      // FAB button's aria-label so SR users hear "Feedback, N todo, M review"
      // as one announcement.
      node.setAttribute("aria-hidden", "true");
      const sc = STATUS_COLORS[kind];
      node.style.background = sc.border;
      node.style.color = "#fff";
      this.fab.appendChild(node);
    }
    setText(node, count > 99 ? "99+" : String(count));
    return node;
  }

  /** Toggle the `.sp-fab--drawer-open` modifier on the FAB + radial container
   * so they shift left while the drawer is open. The actual `right` offset is
   * driven by CSS — see `src/styles/base.ts`. */
  setDrawerOpen(open: boolean): void {
    this.fab.classList.toggle("sp-fab--drawer-open", open);
    this.radialContainer.classList.toggle("sp-radial--drawer-open", open);
  }

  /** Raise the widget shadow host above the capture overlay (`Z_INDEX_MAX - 1`)
   * so the radial stays clickable during an active mode. Restored on exit. */
  setModeActive(active: boolean): void {
    if (active) {
      this.savedHostZIndex = this.hostEl.style.zIndex;
      this.hostEl.style.zIndex = String(Z_INDEX_MAX);
    } else {
      this.hostEl.style.zIndex = this.savedHostZIndex;
    }
  }

  private onModeStart(mode: CaptureMode): void {
    this.activeMode = mode;
    this.setModeActive(true);
  }

  private onModeEnd(mode: CaptureMode): void {
    if (this.activeMode === mode) {
      this.activeMode = null;
      this.setModeActive(false);
    }
  }

  private toggle(): void {
    if (this.mode === "closed") this.openRadial();
    else this.close();
  }

  private openRadial(): void {
    this.mode = "open";
    this.setFabIcon(ICON_CLOSE);
    this.fab.setAttribute("aria-expanded", "true");
    const buttons = this.radialContainer.querySelectorAll<HTMLButtonElement>(".sp-radial-item");
    buttons.forEach((btn, i) => {
      const offset = 16 + ITEM_GAP * (i + 1);
      btn.style.transform = `translate(0, ${-offset}px) scale(1)`;
      btn.classList.add("sp-radial-item--open");
    });
    requestAnimationFrame(() => {
      this.radialContainer.querySelector<HTMLButtonElement>(".sp-radial-item--open")?.focus();
    });
  }

  private close(): void {
    this.mode = "closed";
    this.setFabIcon(ICON_SITEPING);
    this.fab.setAttribute("aria-expanded", "false");
    const buttons = this.radialContainer.querySelectorAll<HTMLButtonElement>(".sp-radial-item");
    buttons.forEach((btn) => {
      btn.style.transform = "translate(0, 0) scale(0.8)";
      btn.classList.remove("sp-radial-item--open");
    });
    this.fab.focus();
  }

  private setFabIcon(svgStr: string): void {
    const todo = this.todoBadge;
    const review = this.reviewBadge;
    this.fab.replaceChildren(parseSvg(svgStr));
    if (todo) this.fab.appendChild(todo);
    if (review) this.fab.appendChild(review);
  }

  private handleItemClick(id: RadialItem["id"]): void {
    switch (id) {
      // Capture-mode entries — leave the radial open so the reviewer can drop
      // multiple comments back-to-back. The radial sits *above* the mode
      // overlay because `setModeActive(true)` lifts the host z-index.
      case "target":
        this.bus.emit("target:start");
        break;
      case "pin":
        this.bus.emit("pin:start");
        break;
      case "area":
        this.bus.emit("area:start");
        break;
      // One-shot terminal actions — close the radial.
      case "export":
        this.close();
        this.bus.emit("export:click");
        break;
      case "copyUrl":
        this.close();
        this.bus.emit("copyUrl:click");
        break;
      case "clear":
        this.close();
        this.bus.emit("clear:click");
        break;
    }
  }

  destroy(): void {
    document.removeEventListener("click", this.onDocumentClick);
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
    // Restore host z-index if we lifted it.
    if (this.activeMode) this.setModeActive(false);
    this.root.remove();
  }
}

/** Download-arrow icon for the export radial item. */
const EXPORT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

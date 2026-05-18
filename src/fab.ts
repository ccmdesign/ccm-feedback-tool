import { parseSvg, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import {
  ICON_AREA,
  ICON_CHAT,
  ICON_CLOSE,
  ICON_EYE,
  ICON_EYE_OFF,
  ICON_LINK,
  ICON_PIN,
  ICON_SITEPING,
  ICON_TARGET,
  ICON_TRASH,
} from "./icons.js";

interface RadialItem {
  id: "target" | "pin" | "area" | "toggle" | "navigator" | "export" | "copyUrl" | "clear";
  icon: string;
  iconAlt?: string;
  label: string;
  direction: "up" | "left";
  /** When true the item renders disabled (greyed, no bus emit) with a tooltip. */
  disabled?: boolean;
  /** `title`/tooltip text shown when the item is disabled. */
  disabledTitle?: string;
}

const ITEM_GAP = 54;

/**
 * FAB with 3-item radial menu: pin (start pin mode), toggle (show/hide
 * pins), export (download JSON). Click outside to dismiss.
 */
type OpenMode = "closed" | "up" | "all";

export class Fab {
  private root: HTMLElement;
  private fab: HTMLButtonElement;
  private radialContainer: HTMLElement;
  private countBadge: HTMLElement | null = null;
  private mode: OpenMode = "closed";
  private annotationsVisible = true;
  private readonly items: RadialItem[];
  private readonly onDocumentClick: (e: MouseEvent) => void;

  constructor(
    shadowRoot: ShadowRoot,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    /** True when the widget persists to Supabase. The Copy-URL item is only
     * functional in cloud mode (the share endpoint serves cloud rows). */
    private readonly cloudMode = false,
  ) {
    this.items = [
      { id: "target", icon: ICON_TARGET, label: t("fab.targetLabel"), direction: "up" },
      { id: "toggle", icon: ICON_EYE, iconAlt: ICON_EYE_OFF, label: t("fab.toggleOn"), direction: "up" },
      { id: "pin", icon: ICON_PIN, label: t("fab.pinLabel"), direction: "up" },
      { id: "area", icon: ICON_AREA, label: t("fab.areaLabel"), direction: "up" },
      { id: "navigator", icon: ICON_CHAT, label: t("fab.navigatorLabel"), direction: "up" },
      { id: "export", icon: EXPORT_ICON, label: t("fab.export"), direction: "left" },
      {
        id: "copyUrl",
        icon: ICON_LINK,
        label: t("fab.copyUrl"),
        direction: "left",
        // Cloud mode only — in localStorage mode there is nothing server-side
        // to serve, so the item is visibly disabled with an explanatory
        // tooltip and Export JSON stays as the always-available fallback.
        ...(this.cloudMode ? {} : { disabled: true, disabledTitle: t("fab.copyUrlLocalOnly") }),
      },
      { id: "clear", icon: ICON_TRASH, label: t("fab.clear"), direction: "left" },
    ];

    this.fab = document.createElement("button");
    this.fab.className = "sp-fab sp-fab--bottom-right sp-anim-fab-in";
    this.fab.style.position = "fixed";
    this.fab.appendChild(parseSvg(ICON_SITEPING));
    this.fab.setAttribute("aria-label", t("fab.aria"));
    this.fab.setAttribute("aria-expanded", "false");
    this.fab.addEventListener("click", (e) => {
      if (e.detail >= 2) return;
      this.toggle();
    });
    this.fab.addEventListener("dblclick", (e) => {
      e.preventDefault();
      this.openAll();
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
      btn.dataset.direction = item.direction;
      if (item.disabled) {
        btn.setAttribute("aria-disabled", "true");
        btn.dataset.disabled = "true";
        btn.style.opacity = "0.4";
        btn.style.cursor = "not-allowed";
        if (item.disabledTitle) btn.title = item.disabledTitle;
      }

      const label = document.createElement("span");
      label.className = "sp-radial-label";
      label.style.cssText =
        item.direction === "up"
          ? "position:absolute;right:54px;top:50%;transform:translateY(-50%);white-space:nowrap;"
          : "position:absolute;bottom:54px;left:50%;transform:translateX(-50%);white-space:nowrap;";
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

    const host = shadowRoot.host;
    this.onDocumentClick = (e) => {
      if (this.mode !== "closed" && !e.composedPath().includes(host)) this.close();
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
  }

  updateCount(count: number): void {
    if (count <= 0) {
      this.countBadge?.remove();
      this.countBadge = null;
      return;
    }
    if (!this.countBadge) {
      this.countBadge = document.createElement("span");
      this.countBadge.className = "sp-fab-badge";
      this.countBadge.setAttribute("role", "status");
      this.countBadge.setAttribute("aria-live", "polite");
      this.fab.appendChild(this.countBadge);
    }
    setText(this.countBadge, count > 99 ? "99+" : String(count));
  }

  private toggle(): void {
    if (this.mode === "closed") this.openMode("up");
    else this.close();
  }

  private openAll(): void {
    this.openMode("all");
  }

  private openMode(target: "up" | "all"): void {
    this.mode = target;
    this.setFabIcon(ICON_CLOSE);
    this.fab.setAttribute("aria-expanded", "true");
    const buttons = this.radialContainer.querySelectorAll<HTMLButtonElement>(".sp-radial-item");
    const slot: Record<"up" | "left", number> = { up: 0, left: 0 };
    buttons.forEach((btn) => {
      const dir = (btn.dataset.direction as "up" | "left") ?? "up";
      const visible = target === "all" || dir === "up";
      if (!visible) {
        btn.style.transform = "translate(0, 0) scale(0.8)";
        btn.classList.remove("sp-radial-item--open");
        return;
      }
      const offset = 16 + ITEM_GAP * (slot[dir] + 1);
      slot[dir] += 1;
      const tx = dir === "left" ? -offset : 0;
      const ty = dir === "up" ? -offset : 0;
      btn.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
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
    const badge = this.countBadge;
    this.fab.replaceChildren(parseSvg(svgStr));
    if (badge) this.fab.appendChild(badge);
  }

  private handleItemClick(id: RadialItem["id"]): void {
    this.close();
    switch (id) {
      case "target":
        this.bus.emit("target:start");
        break;
      case "pin":
        this.bus.emit("pin:start");
        break;
      case "area":
        this.bus.emit("area:start");
        break;
      case "toggle": {
        this.annotationsVisible = !this.annotationsVisible;
        this.bus.emit("annotations:toggle", this.annotationsVisible);
        const btn = this.radialContainer.querySelector<HTMLButtonElement>('[data-item-id="toggle"]');
        if (btn) {
          const svg = btn.querySelector("svg");
          svg?.remove();
          btn.insertBefore(parseSvg(this.annotationsVisible ? ICON_EYE : ICON_EYE_OFF), btn.firstChild);
          btn.setAttribute("aria-label", this.t(this.annotationsVisible ? "fab.toggleOn" : "fab.toggleOff"));
        }
        break;
      }
      case "navigator":
        this.bus.emit("navigator:open");
        break;
      case "export":
        this.bus.emit("export:click");
        break;
      case "copyUrl":
        this.bus.emit("copyUrl:click");
        break;
      case "clear":
        this.bus.emit("clear:click");
        break;
    }
  }

  destroy(): void {
    document.removeEventListener("click", this.onDocumentClick);
    this.root.remove();
  }
}

/** Download-arrow icon for the export radial item. */
const EXPORT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

import { parseSvg, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import { ICON_CLOSE, ICON_EYE, ICON_EYE_OFF, ICON_PIN, ICON_SITEPING, ICON_TRASH } from "./icons.js";

interface RadialItem {
  id: "pin" | "toggle" | "export" | "clear";
  icon: string;
  iconAlt?: string;
  label: string;
}

const ITEM_GAP = 54;

/**
 * FAB with 3-item radial menu: pin (start pin mode), toggle (show/hide
 * pins), export (download JSON). Click outside to dismiss.
 */
export class Fab {
  private root: HTMLElement;
  private fab: HTMLButtonElement;
  private radialContainer: HTMLElement;
  private countBadge: HTMLElement | null = null;
  private isOpen = false;
  private annotationsVisible = true;
  private readonly items: RadialItem[];
  private readonly onDocumentClick: (e: MouseEvent) => void;

  constructor(
    shadowRoot: ShadowRoot,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
  ) {
    this.items = [
      { id: "pin", icon: ICON_PIN, label: t("fab.pinLabel") },
      { id: "toggle", icon: ICON_EYE, iconAlt: ICON_EYE_OFF, label: t("fab.toggleOn") },
      { id: "export", icon: EXPORT_ICON, label: t("fab.export") },
      { id: "clear", icon: ICON_TRASH, label: t("fab.clear") },
    ];

    this.fab = document.createElement("button");
    this.fab.className = "sp-fab sp-fab--bottom-right sp-anim-fab-in";
    this.fab.style.position = "fixed";
    this.fab.appendChild(parseSvg(ICON_SITEPING));
    this.fab.setAttribute("aria-label", t("fab.aria"));
    this.fab.setAttribute("aria-expanded", "false");
    this.fab.addEventListener("click", () => this.toggle());

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

      const label = document.createElement("span");
      label.className = "sp-radial-label";
      label.style.cssText = "position:absolute;right:54px;top:50%;transform:translateY(-50%);white-space:nowrap;";
      label.textContent = item.label;
      btn.appendChild(label);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
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
      if (this.isOpen && !e.composedPath().includes(host)) this.close();
    };
    document.addEventListener("click", this.onDocumentClick);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.isOpen) {
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
    this.isOpen ? this.close() : this.open();
  }

  private open(): void {
    this.isOpen = true;
    this.setFabIcon(ICON_CLOSE);
    this.fab.setAttribute("aria-expanded", "true");
    const buttons = this.radialContainer.querySelectorAll<HTMLButtonElement>(".sp-radial-item");
    buttons.forEach((btn, i) => {
      const y = -(16 + ITEM_GAP * (i + 1));
      btn.style.transform = `translate(0px, ${y}px) scale(1)`;
      btn.classList.add("sp-radial-item--open");
    });
    requestAnimationFrame(() => {
      this.radialContainer.querySelector<HTMLButtonElement>(".sp-radial-item")?.focus();
    });
  }

  private close(): void {
    this.isOpen = false;
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
      case "pin":
        this.bus.emit("pin:start");
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
      case "export":
        this.bus.emit("export:click");
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

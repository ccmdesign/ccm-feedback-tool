import { Z_INDEX_MAX } from "./constants.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import type { ThemeColors } from "./styles/theme.js";
import type { CapturedElement } from "./types.js";

/** Maximum elements captured per pin/area to keep payload reasonable. */
const MAX_CAPTURE = 25;

/** Serialize a DOM element to a small structured payload for agent context. */
function serializeElement(element: Element): CapturedElement {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    attrs[attr.name] = attr.value;
  }
  const r = element.getBoundingClientRect();
  return {
    tag: element.tagName.toLowerCase(),
    attributes: attrs,
    rect: { x: r.left, y: r.top, w: r.width, h: r.height },
  };
}

export interface PinCapture {
  x: number;
  y: number;
  elements: CapturedElement[];
}

export interface AreaCapture {
  x: number;
  y: number;
  w: number;
  h: number;
  elements: CapturedElement[];
}

/**
 * Coordinate pin mode — single click captures (x, y) and the stack of
 * `elementsFromPoint` at that location for agent context.
 */
export class CoordPinMode {
  private overlay: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private isActive = false;
  private savedOverflow = "";
  private readonly unsubStart: () => void;

  constructor(
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    private readonly onCapture: (capture: PinCapture) => Promise<void>,
    private readonly shouldIgnoreElement: (element: Element) => boolean,
  ) {
    this.unsubStart = this.bus.on("pin:start", () => this.activate());
  }

  private activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.savedOverflow = document.body.style.overflow;

    this.overlay = el("div", {
      style: `position:fixed;inset:0;z-index:${Z_INDEX_MAX - 1};background:rgba(15,23,42,0.04);cursor:crosshair;`,
    });
    this.overlay.setAttribute("data-ccm-coord-pin-overlay", "true");

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

    const instr = el("span", { style: "font-weight:500;letter-spacing:-0.01em;" });
    setText(instr, this.t("coordPin.instruction"));

    const cancel = document.createElement("button");
    cancel.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `;
    setText(cancel, this.t("pin.cancel"));
    cancel.addEventListener("click", () => this.deactivate());
    this.toolbar.appendChild(instr);
    this.toolbar.appendChild(cancel);

    this.overlay.addEventListener("click", this.onClick, true);
    document.addEventListener("keydown", this.onKey);
    document.body.style.overflow = "hidden";
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.toolbar);
  }

  private deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.overlay?.removeEventListener("click", this.onClick, true);
    document.removeEventListener("keydown", this.onKey);
    document.body.style.overflow = this.savedOverflow;
    this.overlay?.remove();
    this.toolbar?.remove();
    this.overlay = null;
    this.toolbar = null;
    this.bus.emit("pin:end");
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.deactivate();
    }
  };

  private onClick = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.overlay) return;
    const cx = e.clientX;
    const cy = e.clientY;
    this.overlay.style.pointerEvents = "none";
    const stack = document.elementsFromPoint(cx, cy);
    if (this.overlay) this.overlay.style.pointerEvents = "auto";
    const filtered = stack
      .filter((el) => !this.shouldIgnoreElement(el))
      .filter((el) => el !== document.documentElement && el !== document.body)
      .slice(0, MAX_CAPTURE)
      .map(serializeElement);
    const pageX = cx + window.scrollX;
    const pageY = cy + window.scrollY;
    this.deactivate();
    void this.onCapture({ x: pageX, y: pageY, elements: filtered });
  };

  destroy(): void {
    this.deactivate();
    this.unsubStart();
  }
}

/**
 * Area mode — drag a rectangle, then capture every visible element whose
 * bounding box intersects the rect. Skips the widget's own host.
 */
export class AreaMode {
  private overlay: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private rectEl: HTMLElement | null = null;
  private isActive = false;
  private savedOverflow = "";
  private dragStart: { x: number; y: number } | null = null;
  private readonly unsubStart: () => void;

  constructor(
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    private readonly onCapture: (capture: AreaCapture) => Promise<void>,
    private readonly shouldIgnoreElement: (element: Element) => boolean,
  ) {
    this.unsubStart = this.bus.on("area:start", () => this.activate());
  }

  private activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.savedOverflow = document.body.style.overflow;

    this.overlay = el("div", {
      style: `position:fixed;inset:0;z-index:${Z_INDEX_MAX - 1};background:rgba(15,23,42,0.04);cursor:crosshair;`,
    });
    this.overlay.setAttribute("data-ccm-area-overlay", "true");

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
    const instr = el("span", { style: "font-weight:500;letter-spacing:-0.01em;" });
    setText(instr, this.t("area.instruction"));
    const cancel = document.createElement("button");
    cancel.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `;
    setText(cancel, this.t("pin.cancel"));
    cancel.addEventListener("click", () => this.deactivate());
    this.toolbar.appendChild(instr);
    this.toolbar.appendChild(cancel);

    this.overlay.addEventListener("mousedown", this.onMouseDown, true);
    this.overlay.addEventListener("mousemove", this.onMouseMove, true);
    this.overlay.addEventListener("mouseup", this.onMouseUp, true);
    document.addEventListener("keydown", this.onKey);
    document.body.style.overflow = "hidden";
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.toolbar);
  }

  private deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.overlay?.removeEventListener("mousedown", this.onMouseDown, true);
    this.overlay?.removeEventListener("mousemove", this.onMouseMove, true);
    this.overlay?.removeEventListener("mouseup", this.onMouseUp, true);
    document.removeEventListener("keydown", this.onKey);
    document.body.style.overflow = this.savedOverflow;
    this.overlay?.remove();
    this.toolbar?.remove();
    this.rectEl?.remove();
    this.overlay = null;
    this.toolbar = null;
    this.rectEl = null;
    this.dragStart = null;
    this.bus.emit("area:end");
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.deactivate();
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    this.dragStart = { x: e.clientX, y: e.clientY };
    if (!this.rectEl) {
      this.rectEl = el("div", {
        style: `
          position:fixed;z-index:${Z_INDEX_MAX};
          border:2px dashed ${this.colors.accent};
          background:${this.colors.accent}1a;
          pointer-events:none;
        `,
      });
      document.body.appendChild(this.rectEl);
    }
    this.updateRect(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.dragStart) return;
    this.updateRect(e.clientX, e.clientY);
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (!this.dragStart) return;
    e.preventDefault();
    e.stopPropagation();
    const start = this.dragStart;
    const cx = Math.min(start.x, e.clientX);
    const cy = Math.min(start.y, e.clientY);
    const w = Math.abs(e.clientX - start.x);
    const h = Math.abs(e.clientY - start.y);
    this.dragStart = null;
    if (w < 4 || h < 4) {
      this.rectEl?.remove();
      this.rectEl = null;
      return;
    }
    const elements = this.collectElements(cx, cy, w, h);
    const pageX = cx + window.scrollX;
    const pageY = cy + window.scrollY;
    this.deactivate();
    void this.onCapture({ x: pageX, y: pageY, w, h, elements });
  };

  private updateRect(curX: number, curY: number): void {
    if (!this.rectEl || !this.dragStart) return;
    const x = Math.min(this.dragStart.x, curX);
    const y = Math.min(this.dragStart.y, curY);
    const w = Math.abs(curX - this.dragStart.x);
    const h = Math.abs(curY - this.dragStart.y);
    this.rectEl.style.left = `${x}px`;
    this.rectEl.style.top = `${y}px`;
    this.rectEl.style.width = `${w}px`;
    this.rectEl.style.height = `${h}px`;
  }

  private collectElements(x: number, y: number, w: number, h: number): CapturedElement[] {
    const right = x + w;
    const bottom = y + h;
    const all = document.body.getElementsByTagName("*");
    const out: CapturedElement[] = [];
    for (const el of Array.from(all)) {
      if (out.length >= MAX_CAPTURE) break;
      if (this.shouldIgnoreElement(el)) continue;
      if (el === document.documentElement || el === document.body) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right < x || r.left > right || r.bottom < y || r.top > bottom) continue;
      out.push(serializeElement(el));
    }
    return out;
  }

  destroy(): void {
    this.deactivate();
    this.unsubStart();
  }
}

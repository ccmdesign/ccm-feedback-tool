/**
 * Status dropdown — shared module (PRO-67 + PRO-68).
 *
 * Replaces the legacy click-to-cycle status pill with a proper combobox:
 * a trigger button (pill visual + chevron caret) and a popped-out listbox
 * with the four statuses, color dots, and the current selection marked.
 *
 * Owns: DOM construction, ARIA wiring, keyboard nav, outside-click within
 * the dropdown root, visual rendering.
 *
 * Does NOT own: the store call, the bus emit, the marker recolor, the
 * optimistic mutation of `record.status`. The caller's `onPick` runs the
 * persistence + recolor.
 *
 * This separation keeps the module framework-free and reusable by both
 * `markers.ts` (popover) and `drawer.ts` (PRO-68 per-row badges).
 */
import { el, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n.js";
import { STATUS_COLORS } from "./popup.js";
import type { ThemeColors } from "./styles/theme.js";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "./types.js";

export interface StatusDropdownOptions {
  current: FeedbackStatus;
  colors: ThemeColors;
  t: TFunction;
  /**
   * Called when the user picks a status. The caller owns persistence
   * (store.updateStatus, feedback:updated emit, marker recolor, etc.).
   * Not called when the user picks the same status as `current` — that
   * collapses to a menu-close no-op.
   */
  onPick: (next: FeedbackStatus) => void;
  /**
   * Render a read-only pill without the chevron / click handler. Use when
   * the store doesn't expose updateStatus.
   */
  readOnly?: boolean;
}

export interface StatusDropdownHandle {
  /** Trigger button + menu, both already wired. Caller appends this. */
  root: HTMLElement;
  /** Re-render the trigger pill colors/label after `current` changes
   * externally (e.g. realtime UPDATE on another tab). */
  setCurrent: (status: FeedbackStatus) => void;
  /** Close the menu programmatically (e.g. parent popover closing). */
  close: () => void;
  /** Drop event listeners. Callers MUST invoke on unmount. */
  destroy: () => void;
}

let MENU_ID_SEQ = 0;

export function createStatusDropdown(opts: StatusDropdownOptions): StatusDropdownHandle {
  const { colors, t, onPick, readOnly = false } = opts;
  let current: FeedbackStatus = opts.current;
  const menuId = `ccm-status-menu-${++MENU_ID_SEQ}`;

  const root = el("span", {
    style: "position:relative;display:inline-block;",
  });

  // ---- Trigger (pill) ----
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.setAttribute("role", readOnly ? "presentation" : "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", menuId);
  trigger.setAttribute("aria-label", t("marker.popover.statusAria"));

  const paintTrigger = (): void => {
    const sc = STATUS_COLORS[current];
    trigger.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;
      padding:2px 8px 2px 10px;border-radius:9999px;
      font-size:10px;font-weight:600;letter-spacing:0.02em;line-height:1.4;
      background:${sc.bg};color:${sc.fg};border:1px solid ${sc.border};
      font-family:inherit;
      cursor:${readOnly ? "default" : "pointer"};
      text-transform:uppercase;
    `;
    // Re-render label + chevron
    trigger.replaceChildren();
    const label = document.createElement("span");
    setText(label, t(`status.${current}`));
    trigger.appendChild(label);
    if (!readOnly) {
      const caret = document.createElement("span");
      caret.setAttribute("aria-hidden", "true");
      caret.style.cssText = "font-size:9px;line-height:1;opacity:0.7;";
      setText(caret, "▾");
      trigger.appendChild(caret);
    }
  };

  paintTrigger();

  // ---- Menu ----
  const menu = document.createElement("ul");
  menu.id = menuId;
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", t("marker.popover.statusMenuAria"));
  menu.style.cssText = `
    position:absolute;top:calc(100% + 4px);left:0;
    margin:0;padding:4px;list-style:none;
    min-width:140px;border-radius:8px;
    background:${colors.glassBg};
    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border:1px solid ${colors.glassBorder};
    box-shadow:0 8px 24px ${colors.shadow};
    z-index:2;display:none;
    font-family:inherit;font-size:12px;
  `;
  menu.setAttribute("aria-hidden", "true");

  /** Map of option <li> elements keyed by status, used by keyboard nav. */
  const options = new Map<FeedbackStatus, HTMLLIElement>();
  for (const status of FEEDBACK_STATUSES) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("data-status", status);
    li.setAttribute("tabindex", "-1");
    li.style.cssText = `
      display:flex;align-items:center;gap:8px;
      padding:6px 10px;border-radius:6px;
      color:${colors.text};cursor:pointer;
      transition:background 0.12s ease;
    `;
    const dot = document.createElement("span");
    dot.setAttribute("aria-hidden", "true");
    const sc = STATUS_COLORS[status];
    dot.style.cssText = `
      width:10px;height:10px;border-radius:9999px;
      background:${sc.border};flex-shrink:0;
    `;
    const label = document.createElement("span");
    setText(label, t(`status.${status}`));
    label.style.cssText = "flex:1;";
    const check = document.createElement("span");
    check.setAttribute("aria-hidden", "true");
    check.style.cssText = `font-size:12px;color:${colors.accent};font-weight:600;`;
    setText(check, "✓");
    li.appendChild(dot);
    li.appendChild(label);
    li.appendChild(check);
    li.addEventListener("mouseenter", () => {
      li.style.background = colors.glassBgHeavy;
    });
    li.addEventListener("mouseleave", () => {
      li.style.background = "";
    });
    li.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      pickOption(status);
    });
    options.set(status, li);
    menu.appendChild(li);
  }

  const paintOptions = (): void => {
    for (const status of FEEDBACK_STATUSES) {
      const li = options.get(status);
      if (!li) continue;
      const isCurrent = status === current;
      li.setAttribute("aria-selected", String(isCurrent));
      const check = li.lastElementChild as HTMLElement | null;
      if (check) check.style.visibility = isCurrent ? "visible" : "hidden";
    }
  };
  paintOptions();

  // ---- State + handlers ----
  let isOpen = false;

  const openMenu = (): void => {
    if (readOnly || isOpen) return;
    isOpen = true;
    trigger.setAttribute("aria-expanded", "true");
    menu.style.display = "block";
    menu.setAttribute("aria-hidden", "false");
    // Focus the currently selected option for keyboard nav. Falls back to
    // the first option if `current` somehow isn't in the FEEDBACK_STATUSES
    // list (shouldn't happen — defensive).
    const focused = options.get(current) ?? options.get(FEEDBACK_STATUSES[0] as FeedbackStatus);
    focused?.focus();
  };

  const closeMenu = (): void => {
    if (!isOpen) return;
    isOpen = false;
    trigger.setAttribute("aria-expanded", "false");
    menu.style.display = "none";
    menu.setAttribute("aria-hidden", "true");
  };

  const pickOption = (next: FeedbackStatus): void => {
    // Picking the same status is a no-op (close only). Saves a store write
    // + event emit and matches the spec's "same status = no-op" intent.
    if (next === current) {
      closeMenu();
      trigger.focus();
      return;
    }
    closeMenu();
    trigger.focus();
    onPick(next);
  };

  if (!readOnly) {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) closeMenu();
      else openMenu();
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openMenu();
      }
    });

    menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Stop propagation so the popover's outer ESC handler doesn't also
        // close the popover when the menu was open.
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        trigger.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = FEEDBACK_STATUSES.findIndex((s) => options.get(s) === document.activeElement);
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const len = FEEDBACK_STATUSES.length;
        const nextIdx = ((idx === -1 ? 0 : idx + dir) + len) % len;
        const target = options.get(FEEDBACK_STATUSES[nextIdx] as FeedbackStatus);
        target?.focus();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const focused = document.activeElement;
        for (const status of FEEDBACK_STATUSES) {
          if (options.get(status) === focused) {
            pickOption(status);
            return;
          }
        }
      }
    });
  }

  // Outside-click within the dropdown root closes the menu only. Clicks
  // outside the root bubble normally so the popover's own outside-click
  // handler can close it.
  const onDocClick = (e: MouseEvent): void => {
    if (!isOpen) return;
    if (e.composedPath().some((n) => n === root)) return;
    closeMenu();
  };
  document.addEventListener("click", onDocClick, true);

  root.appendChild(trigger);
  root.appendChild(menu);

  return {
    root,
    setCurrent: (status) => {
      current = status;
      paintTrigger();
      paintOptions();
    },
    close: closeMenu,
    destroy: () => {
      closeMenu();
      document.removeEventListener("click", onDocClick, true);
    },
  };
}

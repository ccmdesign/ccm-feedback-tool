import { parseSvg } from "../dom-utils.js";
import type { EventBus, WidgetEvents } from "../events.js";
import type { TFunction } from "../i18n.js";
import { ICON_EYE, ICON_EYE_OFF } from "../icons.js";
import type { ThemeColors } from "../styles/theme.js";

/**
 * Read-only contract — the eye button needs the current visibility state to
 * paint its initial icon + label. Implemented by `MarkerManager` (via the
 * `isVisible` getter); kept narrow so tests can stub it.
 */
export interface MarkerVisibilityRead {
  readonly isVisible: boolean;
}

export interface ToolbarEyeHandle {
  readonly button: HTMLButtonElement;
  /** Drop the bus subscription. Call from the toolbar's deactivate path so the
   * closure doesn't outlive the in-mode UI. */
  destroy(): void;
}

/**
 * Build the eye visibility-toggle button that lives in every capture-mode
 * toolbar (PRO-68 §3). Clicking it flips marker visibility via the
 * `annotations:toggle` bus event; the icon + aria-label stay in sync with
 * any external toggle by re-subscribing to the same event.
 *
 * Visual chrome mirrors the existing cancel button in `PinMode.activate()` so
 * the two toolbars look matched.
 */
export function buildToolbarEye(opts: {
  bus: EventBus<WidgetEvents>;
  t: TFunction;
  colors: ThemeColors;
  markers: MarkerVisibilityRead;
}): ToolbarEyeHandle {
  const { bus, t, colors, markers } = opts;
  const button = document.createElement("button");
  button.type = "button";
  button.style.cssText = `
    height:34px;width:34px;padding:0;border-radius:9999px;
    border:1px solid ${colors.border};background:${colors.glassBg};
    color:${colors.textTertiary};font-family:inherit;
    display:inline-flex;align-items:center;justify-content:center;
    cursor:pointer;
  `;

  const paint = (visible: boolean): void => {
    button.replaceChildren(parseSvg(visible ? ICON_EYE : ICON_EYE_OFF));
    // Label semantics: when markers are visible the button hides them, and
    // vice versa. `toolbar.toggleOn` describes the action the button performs.
    button.setAttribute("aria-label", t(visible ? "toolbar.toggleOn" : "toolbar.toggleOff"));
    button.title = t(visible ? "toolbar.toggleOn" : "toolbar.toggleOff");
    // Style the active "hidden" state so reviewers can spot a stuck toggle.
    button.style.color = visible ? colors.textTertiary : colors.accent;
    button.style.borderColor = visible ? colors.border : colors.accent;
  };
  paint(markers.isVisible);

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    bus.emit("annotations:toggle", !markers.isVisible);
  });

  // Keep the button in sync when other surfaces (or future programmatic
  // toggles) flip visibility while a mode is active.
  const unsub = bus.on("annotations:toggle", (visible) => paint(visible));

  return {
    button,
    destroy: () => unsub(),
  };
}

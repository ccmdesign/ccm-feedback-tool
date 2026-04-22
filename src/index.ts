import { MOBILE_BREAKPOINT, Z_INDEX_MAX } from "./constants.js";
import { findAnchorElement, generateAnchor, rectToPercentages } from "./dom/anchor.js";
import { EventBus, type WidgetEvents } from "./events.js";
import { exportAsJson } from "./export-utils.js";
import { Fab } from "./fab.js";
import { createT } from "./i18n.js";
import { MarkerManager } from "./markers.js";
import { PinMode } from "./pin-mode.js";
import { Popup } from "./popup.js";
import { Store } from "./store.js";
import { buildStyles } from "./styles/base.js";
import { buildThemeColors } from "./styles/theme.js";
import type { CcmFeedbackConfig, CcmFeedbackInstance } from "./types.js";

let instance: CcmFeedbackInstance | null = null;

function noopInstance(): CcmFeedbackInstance {
  return {
    destroy: () => {},
    count: () => 0,
    export: () => {},
  };
}

/**
 * Initialize the CCM Feedback widget.
 *
 * ```ts
 * initCcmFeedback({ projectName: "my-project" });
 * ```
 */
export function initCcmFeedback(config: CcmFeedbackConfig): CcmFeedbackInstance {
  const log: (...args: unknown[]) => void = config.debug
    ? (...args) => console.debug("[ccm-feedback]", ...args)
    : () => {};

  if (instance) {
    log("initCcmFeedback() called more than once — returning existing instance");
    return instance;
  }

  if (!config.projectName || typeof config.projectName !== "string") {
    console.error("[ccm-feedback] Missing or invalid 'projectName' in config.");
    return noopInstance();
  }

  if (window.innerWidth < MOBILE_BREAKPOINT) {
    console.info(`[ccm-feedback] Widget not loaded: viewport < ${MOBILE_BREAKPOINT}px.`);
    return noopInstance();
  }

  log("Initializing", { projectName: config.projectName });

  const colors = buildThemeColors(config.accentColor, config.theme);
  const t = createT();
  const bus = new EventBus<WidgetEvents>();
  const store = new Store(config.projectName);

  const host = document.createElement("ccm-feedback-widget");
  host.style.cssText = `position:fixed;z-index:${Z_INDEX_MAX};`;
  // `open` so host pages (and test harnesses) can introspect the widget.
  // CSS is still isolated because it lives entirely inside the shadow root.
  const shadow = host.attachShadow({ mode: "open" });

  if ("adoptedStyleSheets" in ShadowRoot.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(buildStyles(colors));
    shadow.adoptedStyleSheets = [sheet];
  } else {
    const style = document.createElement("style");
    style.textContent = buildStyles(colors);
    (shadow as unknown as DocumentFragment).appendChild(style);
  }

  document.body.appendChild(host);

  const popup = new Popup(colors, t);
  const markers = new MarkerManager(colors, bus, t, store);
  const fab = new Fab(shadow, bus, t);

  const shouldIgnore = (element: Element) => element === host || host.contains(element);

  const openPopupForElement = async (element: HTMLElement): Promise<void> => {
    const bounds = element.getBoundingClientRect();
    const message = await popup.show(bounds);
    if (!message) return;
    const anchor = generateAnchor(element);
    const anchorBounds = element.getBoundingClientRect();
    const rect = rectToPercentages(anchorBounds, anchorBounds);
    const record = store.save({
      projectName: config.projectName,
      message,
      url: sanitizeUrl(window.location.href),
      path: window.location.pathname,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      anchor,
      rect,
    });
    bus.emit("feedback:saved", record);
    markers.addOne(record);
    fab.updateCount(store.list().length);
    log("Saved", record.id);
  };

  const pinMode = new PinMode(colors, bus, t, openPopupForElement, shouldIgnore);

  bus.on("export:click", () => {
    const records = store.list();
    if (records.length === 0) {
      console.info("[ccm-feedback] No annotations to export.");
      return;
    }
    exportAsJson(config.projectName, records);
  });

  // `findAnchorElement` is re-exported so consumers that want to
  // programmatically add an annotation have access to the anchor logic.
  void findAnchorElement;

  markers.refresh();
  fab.updateCount(store.list().length);

  instance = {
    destroy: () => {
      log("Destroying widget");
      pinMode.destroy();
      markers.destroy();
      fab.destroy();
      popup.destroy();
      bus.removeAll();
      host.remove();
      instance = null;
    },
    count: () => store.list().length,
    export: () => {
      const records = store.list();
      if (records.length === 0) return;
      exportAsJson(config.projectName, records);
    },
  };
  return instance;
}

function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      if (/token|key|secret|auth|session|password|code/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

// ----------------------------------------------------------------------------
// Script-tag auto-init: <script src="w.js" data-project="my-project" defer>
// ----------------------------------------------------------------------------

declare global {
  interface Window {
    CcmFeedback?: { init: typeof initCcmFeedback };
  }
}

if (typeof window !== "undefined") {
  window.CcmFeedback = { init: initCcmFeedback };

  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript?.dataset.project) {
    const cfg: CcmFeedbackConfig = {
      projectName: currentScript.dataset.project,
      ...(currentScript.dataset.accent ? { accentColor: currentScript.dataset.accent } : {}),
      ...(currentScript.dataset.theme ? { theme: currentScript.dataset.theme as CcmFeedbackConfig["theme"] } : {}),
      ...(currentScript.dataset.debug === "true" ? { debug: true } : {}),
    };
    const boot = () => initCcmFeedback(cfg);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
      boot();
    }
  }
}

export type { AnchorData, AnnotationRecord, CcmFeedbackConfig, CcmFeedbackInstance, RectData } from "./types.js";

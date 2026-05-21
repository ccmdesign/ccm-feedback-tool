import { ensureAuthor } from "./author.js";
import { type AreaCapture, AreaMode, CoordPinMode, type PinCapture } from "./capture-modes.js";
import { CloudStore } from "./cloud-store.js";
import { MOBILE_BREAKPOINT, Z_INDEX_MAX } from "./constants.js";
import { findAnchorElement, generateAnchor, rectToPercentages } from "./dom/anchor.js";
import { Drawer } from "./drawer.js";
import { EventBus, type WidgetEvents } from "./events.js";
import { copyToClipboard, exportAsJson } from "./export-utils.js";
import { Fab } from "./fab.js";
import { createT } from "./i18n.js";
import { MarkerManager } from "./markers.js";
import { PinMode } from "./pin-mode.js";
import { Popup } from "./popup.js";
import { type AnnotationStore, Store } from "./store.js";
import { buildStyles } from "./styles/base.js";
import { buildThemeColors } from "./styles/theme.js";
import type { AnchorData, AnnotationRecord, CcmFeedbackConfig, CcmFeedbackInstance } from "./types.js";

/**
 * Count "active" annotations — everything except `done`. Used for the FAB
 * badge so the visible counter reflects work still pending review/action,
 * not historical resolved items. `done` records remain visible in the
 * drawer (and as markers) but stop inflating the headline count.
 */
function countActive(records: readonly AnnotationRecord[]): number {
  return records.reduce((n, r) => n + ((r.status ?? "todo") !== "done" ? 1 : 0), 0);
}

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

  const useCloud = !!(config.supabaseUrl && config.supabaseKey);
  let store: AnnotationStore;
  let cloudStore: CloudStore | null = null;
  if (useCloud) {
    cloudStore = new CloudStore({
      url: config.supabaseUrl as string,
      apiKey: config.supabaseKey as string,
      projectName: config.projectName,
      log,
      onChange: () => {
        markers.refresh();
        fab.updateCount(countActive(store.list()));
        drawer.refreshIfOpen();
      },
      // Reply rows arrive via these callbacks instead of onChange so the
      // marker layer / drawer don't churn — the open popover subscribes
      // to feedback:replied via the bus and re-renders its thread in place.
      onReply: (record) => bus.emit("feedback:replied", record),
      onReplyDeleted: (id) => bus.emit("feedback:deleted", id),
    });
    store = cloudStore;
    log("Cloud mode enabled", { url: config.supabaseUrl });
  } else {
    store = new Store(config.projectName);
    log("LocalStorage mode");
  }

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
  const fab = new Fab(shadow, bus, t, useCloud);
  const drawer = new Drawer(
    shadow,
    bus,
    t,
    store,
    colors,
    (id) => markers.scrollToAndFlash(id),
    // Drawer chip is the source of truth for whether done markers render.
    // Done is hidden everywhere by default; only the Done tab surfaces it.
    (filter) => markers.setIncludeDone(filter === "done"),
  );

  bus.on("navigator:open", () => drawer.open());

  const shouldIgnore = (element: Element) => element === host || host.contains(element);

  const emptyAnchor = (): AnchorData => ({
    cssSelector: "",
    xpath: "",
    textSnippet: "",
    elementTag: "",
    elementId: undefined,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "",
    neighborText: "",
  });

  const openPopupForElement = async (element: HTMLElement): Promise<void> => {
    const bounds = element.getBoundingClientRect();
    const result = await popup.show(bounds);
    if (!result) return;
    const authorName = ensureAuthor();
    const anchor = generateAnchor(element);
    const anchorBounds = element.getBoundingClientRect();
    const rect = rectToPercentages(anchorBounds, anchorBounds);
    const record = store.save({
      projectName: config.projectName,
      message: result.message,
      authorName,
      url: sanitizeUrl(window.location.href),
      path: window.location.pathname,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      anchor,
      rect,
      status: result.status,
      kind: "target",
    });
    bus.emit("feedback:saved", record);
    markers.addOne(record);
    fab.updateCount(countActive(store.list()));
    log("Saved", record.id);
  };

  const onPinCapture = async (capture: PinCapture): Promise<void> => {
    const anchorRect = new DOMRect(capture.x - window.scrollX, capture.y - window.scrollY, 0, 0);
    const result = await popup.show(anchorRect);
    if (!result) return;
    const record = store.save({
      projectName: config.projectName,
      message: result.message,
      authorName: ensureAuthor(),
      url: sanitizeUrl(window.location.href),
      path: window.location.pathname,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      anchor: emptyAnchor(),
      rect: { xPct: 0, yPct: 0, wPct: 0, hPct: 0 },
      status: result.status,
      kind: "pin",
      pin: { x: capture.x, y: capture.y },
      capturedElements: capture.elements,
    });
    bus.emit("feedback:saved", record);
    markers.addOne(record);
    fab.updateCount(countActive(store.list()));
    log("Saved pin", record.id);
  };

  const onAreaCapture = async (capture: AreaCapture): Promise<void> => {
    const anchorRect = new DOMRect(capture.x - window.scrollX, capture.y - window.scrollY, capture.w, capture.h);
    const result = await popup.show(anchorRect);
    if (!result) return;
    const record = store.save({
      projectName: config.projectName,
      message: result.message,
      authorName: ensureAuthor(),
      url: sanitizeUrl(window.location.href),
      path: window.location.pathname,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      anchor: emptyAnchor(),
      rect: { xPct: 0, yPct: 0, wPct: 0, hPct: 0 },
      status: result.status,
      kind: "area",
      area: { x: capture.x, y: capture.y, w: capture.w, h: capture.h },
      capturedElements: capture.elements,
    });
    bus.emit("feedback:saved", record);
    markers.addOne(record);
    fab.updateCount(countActive(store.list()));
    log("Saved area", record.id);
  };

  const pinMode = new PinMode(colors, bus, t, openPopupForElement, shouldIgnore);
  const coordPinMode = new CoordPinMode(colors, bus, t, onPinCapture, shouldIgnore);
  const areaMode = new AreaMode(colors, bus, t, onAreaCapture, shouldIgnore);

  bus.on("export:click", () => {
    const records = store.list();
    if (records.length === 0) {
      console.info("[ccm-feedback] No annotations to export.");
      return;
    }
    exportAsJson(config.projectName, records);
  });

  // Cloud-mode only. The Fab disables this item in localStorage mode, so this
  // handler only fires when the share endpoint can actually resolve. The URL
  // is the current site's origin + /feedback?project=<encoded> — the site
  // must deploy the netlify/functions/feedback function for it to resolve
  // (the CCM-hosted demo always does; self-hosters deploy their own).
  bus.on("copyUrl:click", () => {
    const shareUrl = `${window.location.origin}/feedback?project=${encodeURIComponent(config.projectName)}`;
    void copyToClipboard(shareUrl).then((ok) => {
      if (ok) {
        console.info(`[ccm-feedback] ${t("toast.urlCopied")}: ${shareUrl}`);
      } else {
        console.warn(`[ccm-feedback] ${t("toast.urlCopyFailed")} — ${shareUrl}`);
      }
    });
  });

  bus.on("clear:click", () => {
    if (store.list().length === 0) return;
    if (!window.confirm(t("fab.clearConfirm"))) return;
    store.clear();
    markers.refresh();
    fab.updateCount(0);
    drawer.refreshIfOpen();
    log("Cleared all annotations");
  });

  // Keep an open drawer live on local create/update/delete (cloud Realtime
  // is covered by the CloudStore onChange callback above). Also refresh
  // the FAB count on update/delete — `done` status drops out of the active
  // count and a delete shrinks the total, neither of which the per-save
  // call sites cover.
  const syncUi = () => {
    fab.updateCount(countActive(store.list()));
    drawer.refreshIfOpen();
  };
  bus.on("feedback:saved", syncUi);
  bus.on("feedback:updated", syncUi);
  bus.on("feedback:deleted", syncUi);
  // Replies don't affect markers (no marker) or the FAB count (countActive
  // operates on store.list() which already filters parentId-bearing rows).
  // drawer.refreshIfOpen() is a no-op today — the drawer only surfaces
  // top-level comments in v1 — but it's the right hook for any future
  // "reply count badge" UI. Cost is one call on a closed drawer.
  bus.on("feedback:replied", () => drawer.refreshIfOpen());

  // `findAnchorElement` is re-exported so consumers that want to
  // programmatically add an annotation have access to the anchor logic.
  void findAnchorElement;

  // Initial render uses whatever is already in the store. For cloud mode,
  // refresh once the network fetch completes so other reviewers' comments
  // appear without requiring a page reload.
  markers.refresh();
  fab.updateCount(countActive(store.list()));
  if (cloudStore) {
    const cs = cloudStore;
    void cs.init().then(async () => {
      markers.refresh();
      fab.updateCount(countActive(store.list()));
      const migrated = await migrateLocalToCloud(cs, config.projectName, log);
      if (migrated > 0) {
        markers.refresh();
        fab.updateCount(countActive(store.list()));
      }
    });
  }

  instance = {
    destroy: () => {
      log("Destroying widget");
      pinMode.destroy();
      coordPinMode.destroy();
      areaMode.destroy();
      markers.destroy();
      fab.destroy();
      popup.destroy();
      drawer.destroy();
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

/**
 * One-shot migration: when cloud mode is enabled, push any leftover
 * localStorage records into Supabase and clear the local key. Covers both
 * the explicit project key and a legacy hostname-derived key (the auto-init
 * default before `data-project` was set).
 */
async function migrateLocalToCloud(
  cloudStore: CloudStore,
  projectName: string,
  log: (...args: unknown[]) => void,
): Promise<number> {
  const candidates = new Set<string>([projectName, deriveProjectFromHost()]);
  let total = 0;
  for (const project of candidates) {
    const key = `ccm-feedback:${project}`;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      continue;
    }
    if (!raw) continue;
    let records: AnnotationRecord[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      records = (parsed as AnnotationRecord[]).map((r) => ({ ...r, projectName }));
    } catch {
      continue;
    }
    log("Migrating", records.length, "local records from", key);
    const inserted = await cloudStore.migrateFromLocal(records);
    total += inserted;
    try {
      localStorage.setItem(`${key}:migrated`, new Date().toISOString());
      localStorage.removeItem(key);
    } catch {
      // ignore quota / privacy-mode failures
    }
  }
  return total;
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

function isLocalHost(hostname: string): boolean {
  if (!hostname) return true;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1") return true;
  if (hostname.endsWith(".local") || hostname.endsWith(".localhost")) return true;
  return false;
}

function deriveProjectFromHost(): string {
  const { hostname, port } = window.location;
  const host = hostname || "site";
  const safe =
    host
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "site";
  return port ? `${safe}-${port}` : safe;
}

if (typeof window !== "undefined") {
  window.CcmFeedback = { init: initCcmFeedback };

  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript) {
    const projectName = currentScript.dataset.project || deriveProjectFromHost();
    const local = isLocalHost(window.location.hostname);
    const cfg: CcmFeedbackConfig = {
      projectName,
      ...(currentScript.dataset.accent ? { accentColor: currentScript.dataset.accent } : {}),
      ...(currentScript.dataset.theme ? { theme: currentScript.dataset.theme as CcmFeedbackConfig["theme"] } : {}),
      ...(currentScript.dataset.debug === "true" ? { debug: true } : {}),
      ...(!local && currentScript.dataset.supabaseUrl ? { supabaseUrl: currentScript.dataset.supabaseUrl } : {}),
      ...(!local && currentScript.dataset.supabaseKey ? { supabaseKey: currentScript.dataset.supabaseKey } : {}),
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

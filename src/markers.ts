import { ensureAuthor } from "./author.js";
import { Z_INDEX_MAX } from "./constants.js";
import { generateAnchor } from "./dom/anchor.js";
import { createHoverOutline } from "./dom/hover-outline.js";
import { resolveAnnotation } from "./dom/resolver.js";
import { el, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction } from "./i18n.js";
import { STATUS_COLORS } from "./popup.js";
import { createStatusDropdown, type StatusDropdownHandle } from "./status-dropdown.js";
import type { AnnotationStore, UpdateAnchorInput } from "./store.js";
import type { ThemeColors } from "./styles/theme.js";
import type { AnchorData, AnnotationRecord, FeedbackStatus } from "./types.js";

const MARKER_SIZE = 26;
const MARKER_OFFSET = MARKER_SIZE / 2;
const REPOSITION_DEBOUNCE_MS = 200;
// Drag-or-click watcher thresholds (PRO-67). A mousedown promotes to drag
// when the cursor moves ≥ DRAG_MOVE_THRESHOLD_PX OR the press lasts longer
// than DRAG_LONGPRESS_MS. Otherwise it's treated as a click and opens the
// popover. The watcher binds mouse events only; touch falls through to the
// existing synthesized `click` path so tap-to-open still works on mobile.
const DRAG_LONGPRESS_MS = 250;
const DRAG_MOVE_THRESHOLD_PX = 6;
// Popover width (matches max-width / min-width on the popover root) — used
// by the manual placement code to clamp horizontally inside the viewport.
const POPOVER_NOMINAL_WIDTH = 300;
// Cap on rendered popover height — long reply threads scroll inside the
// popover rather than off-screen. Pairs with `overflow-y: auto`.
// Formula: min(70vh, 540 px). 540 = nominal-180 * 3 from PRO-66's heuristic;
// the 70vh ceiling keeps the popover from dominating short-viewport setups.
const POPOVER_MAX_VH = 0.7;
const POPOVER_MAX_HEIGHT_CEIL_PX = 540;
// Safety inset against viewport edges during placement; matches the 8px
// gap used elsewhere on the marker side.
const POPOVER_VIEWPORT_MARGIN = 16;

interface MarkerEntry {
  record: AnnotationRecord;
  node: HTMLElement;
  anchorEl: Element | null;
}

/**
 * Pin markers rendered on top of resolved anchor elements.
 * Click opens a popover with the comment body + delete button.
 * All markers live in a single fixed container appended to `document.body`.
 */
export class MarkerManager {
  private container: HTMLElement;
  private entries: MarkerEntry[] = [];
  private visible = true;
  /** When false, markers for records with `status === "done"` are filtered
   * out of the rendered set. Flipped to true only while the drawer is
   * actively focused on the Done tab so resolved work doesn't clutter the
   * page. */
  private includeDone = false;
  private popover: HTMLElement | null = null;
  /** Status dropdown handle for the currently open popover. Null when no
   * popover is open (or the open popover suppressed the dropdown because
   * the store doesn't expose updateStatus). */
  private popoverStatusDropdown: StatusDropdownHandle | null = null;
  /** Off-handlers for bus subscriptions opened during openPopover. */
  private popoverDisposers: Array<() => void> = [];
  private repositionTimer: number | null = null;
  private readonly onResize: () => void;
  private readonly onScroll: () => void;
  private readonly onDocClick: (e: MouseEvent) => void;
  private readonly onPopState: () => void;
  private readonly origPushState: typeof history.pushState;
  private readonly origReplaceState: typeof history.replaceState;
  private lastPath = window.location.pathname;
  /** Cleanup fn for the active drag mode (PRO-67 P1). Set by `enterDragMode`,
   * nulled inside its `cleanup()`. Invoked by `destroy()` to tear down an
   * in-flight drag before disposing the manager so the overlay/toolbar DOM
   * and the five global capture-phase listeners don't leak. */
  private dragCleanup: (() => void) | null = null;
  /** Cleanup fns for active drag-or-click watchers (PRO-67 P1). One entry
   * per in-flight `mousedown` gesture that hasn't yet resolved to click or
   * drag. Watchers self-remove via the existing `cleanup()` closure, but
   * `destroy()` also drains the set so the window-level mousemove/mouseup
   * capture listeners + the longpress timer can't outlive the manager. */
  private watcherCleanups: Set<() => void> = new Set();
  /** True while `enterDragMode` is active. The outer popstate handler
   * (`checkPath`) reads this and skips `refresh()` so the entry being
   * dragged isn't detached out from under the drag closure (PRO-67 P2). */
  private dragInFlight = false;

  constructor(
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    private readonly store: AnnotationStore,
    /**
     * Excludes the widget host + descendants from drag-relocate drop
     * targeting (PRO-67). Defaults to "ignore nothing" so callers that
     * don't construct via `index.ts` (tests, REPL) keep working. Mirrors
     * the predicate `PinMode` already receives.
     */
    private readonly shouldIgnoreElement: (element: Element) => boolean = () => false,
  ) {
    // `overflow-x: clip` + `width: 100%` is a defensive guard: any pin that
    // accidentally lands past the viewport's right edge (stale capture from
    // a wider viewport, resolved target that extends off-screen, etc.) is
    // visually clipped here and — crucially — does not contribute to
    // `documentElement.scrollWidth`, which would otherwise inject a
    // horizontal scrollbar on the host page. `overflow-y` stays `visible`
    // so absolutely-positioned children below container origin still
    // paint freely. (`clip` paired with `visible` is the only combination
    // where the visible axis is preserved; `hidden` would force the other
    // axis to `auto`.)
    this.container = el("div", {
      style: `position:absolute;top:0;left:0;width:100%;height:0;overflow-x:clip;overflow-y:visible;z-index:${Z_INDEX_MAX - 2};pointer-events:none;`,
    });
    this.container.setAttribute("aria-hidden", "false");
    this.container.setAttribute("data-ccm-markers", "true");
    document.body.appendChild(this.container);

    if (!document.getElementById("ccm-marker-anim")) {
      const styleEl = document.createElement("style");
      styleEl.id = "ccm-marker-anim";
      styleEl.textContent = `
        @keyframes ccm-pulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(139,92,246,0.55), 0 0 0 0 rgba(139,92,246,0.55); }
          50%      { box-shadow: 0 2px 8px rgba(139,92,246,0.55), 0 0 0 10px rgba(139,92,246,0); }
        }
        @keyframes ccm-anchor-flash {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); outline-color: rgba(139,92,246,0); }
          30%      { box-shadow: 0 0 0 6px rgba(139,92,246,0.35); outline-color: rgba(139,92,246,0.95); }
          70%      { box-shadow: 0 0 0 10px rgba(139,92,246,0); outline-color: rgba(139,92,246,0.4); }
        }
        .ccm-anchor-flash {
          outline: 2px solid rgba(139,92,246,0);
          outline-offset: 3px;
          animation: ccm-anchor-flash 1.2s ease-in-out 1;
          border-radius: 2px;
        }
      `;
      document.head.appendChild(styleEl);
    }

    // Scoped scrollbar styling for the popover (PRO-67). Lives outside the
    // shadow root so the WebKit `::-webkit-scrollbar` pseudo-selectors apply
    // to the popover (which is mounted directly under document.body, not
    // inside the widget host shadow). The selector is scoped to .ccm-popover
    // so host-page scrollbars stay untouched.
    if (!document.getElementById("ccm-popover-scroll")) {
      const scrollStyle = document.createElement("style");
      scrollStyle.id = "ccm-popover-scroll";
      scrollStyle.textContent = `
        .ccm-popover::-webkit-scrollbar { width: 6px; }
        .ccm-popover::-webkit-scrollbar-track { background: transparent; }
        .ccm-popover::-webkit-scrollbar-thumb {
          background: ${this.colors.glassBorder};
          border-radius: 3px;
        }
        .ccm-popover { scrollbar-width: thin; scrollbar-color: ${this.colors.glassBorder} transparent; }
      `;
      document.head.appendChild(scrollStyle);
    }

    this.onResize = this.scheduleReposition.bind(this);
    this.onScroll = this.scheduleReposition.bind(this);
    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true });

    this.onDocClick = (e) => {
      if (!this.popover) return;
      if (e.composedPath().some((n) => n === this.popover)) return;
      this.closePopover();
    };
    document.addEventListener("click", this.onDocClick, true);

    // SPA navigation: re-filter markers when pathname changes via the
    // History API. Covers Nuxt, React Router, Vue Router, Next.js.
    //
    // If a drag is in flight, defer the refresh — the drag's own
    // `dragSpaNav` (capture-phase) handler cancels the gesture, and we
    // don't want to tear down the active entry's DOM out from under the
    // drag's `cleanup()` closure (PRO-67 P2). `lastPath` is left untouched
    // so the next mutation re-evaluates against the original baseline; the
    // resize/scroll listeners keep the rendered set in sync once the drag
    // resolves.
    const checkPath = () => {
      if (window.location.pathname === this.lastPath) return;
      if (this.dragInFlight) return;
      this.lastPath = window.location.pathname;
      this.refresh();
    };
    this.onPopState = checkPath;
    window.addEventListener("popstate", this.onPopState);
    this.origPushState = history.pushState.bind(history);
    this.origReplaceState = history.replaceState.bind(history);
    history.pushState = (...args) => {
      this.origPushState(...args);
      checkPath();
    };
    history.replaceState = (...args) => {
      this.origReplaceState(...args);
      checkPath();
    };

    this.bus.on("annotations:toggle", (visible) => this.setVisible(visible));
  }

  /** Render all stored annotations. Called on page load and after save/delete. */
  refresh(): void {
    this.closePopover();
    for (const entry of this.entries) entry.node.remove();
    this.entries = [];

    const records = this.store.listForPath(window.location.pathname).filter((r) => this.shouldRender(r));
    records.forEach((record, idx) => {
      const node = this.buildMarker(record, idx + 1);
      this.container.appendChild(node);
      this.entries.push({ record, node, anchorEl: null });
    });
    this.reposition();
  }

  addOne(record: AnnotationRecord): void {
    if (!this.shouldRender(record)) return;
    const idx = this.entries.length + 1;
    const node = this.buildMarker(record, idx);
    this.container.appendChild(node);
    this.entries.unshift({ record, node, anchorEl: null });
    this.renumber();
    this.reposition();
  }

  /** Gate for whether a record should appear in the marker layer. */
  private shouldRender(record: AnnotationRecord): boolean {
    const status = record.status ?? "todo";
    if (status === "done" && !this.includeDone) return false;
    return true;
  }

  /**
   * Toggle whether `done` markers participate in the rendered set. Called
   * by the drawer when its filter chip changes — the drawer is the only
   * UI surface that exposes done comments, so its filter is the source of
   * truth for marker visibility. No-op when the flag is unchanged.
   */
  setIncludeDone(include: boolean): void {
    if (this.includeDone === include) return;
    this.includeDone = include;
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.style.display = visible ? "block" : "none";
    if (!visible) this.closePopover();
  }

  /**
   * Read-only locatability probe used by the comment navigator drawer.
   * True when an entry exists for `id` and its marker resolved on the
   * current page (pin/area are coordinate-anchored → always locatable;
   * target is locatable only when `reposition()` resolved its anchor).
   * Never throws — a missing entry or orphaned anchor is a normal state.
   */
  canLocate(id: string): boolean {
    const entry = this.entries.find((e) => e.record.id === id);
    if (!entry) return false;
    return this.isEntryLocatable(entry);
  }

  /**
   * Read-only navigator hook: scroll the page so the marker for `id` is in
   * view and flash it. Returns false (no-op, no throw) when the entry is
   * missing or its anchor can't be located on the current page so the
   * drawer can render the passive "can't locate" row state instead.
   */
  scrollToAndFlash(id: string): boolean {
    const entry = this.entries.find((e) => e.record.id === id);
    if (!entry || !this.isEntryLocatable(entry)) return false;

    const top = Number.parseFloat(entry.node.style.top);
    if (Number.isFinite(top)) {
      window.scrollTo({ top: Math.max(0, top - window.innerHeight / 3), behavior: "smooth" });
    }

    // Skip the flash when markers are toggled off — nothing visible to
    // flash, and we deliberately do not force the global toggle back on.
    if (this.visible) {
      const node = entry.node;
      node.style.animation = "ccm-pulse 0.6s ease-in-out 1";
      window.setTimeout(() => {
        const status = node.dataset.status;
        // Restore the perpetual pulse for `question` markers; clear otherwise.
        node.style.animation = status === "question" ? "ccm-pulse 1.6s ease-in-out infinite" : "";
      }, 650);
    }

    // Also flash the underlying anchored DOM element so the reviewer sees
    // *what* was pinned, not just the marker. Only "target" kinds carry a
    // resolved anchor element; "pin" / "area" comments are coordinate-based
    // and the marker itself is the visual cue.
    this.flashAnchorElement(entry);
    return true;
  }

  /**
   * Briefly outline + glow the live DOM element that this annotation was
   * anchored to. Uses a transient class so the page's own CSS isn't
   * mutated. No-op for non-target kinds and for entries whose anchor
   * couldn't be resolved on the current page.
   */
  private flashAnchorElement(entry: MarkerEntry): void {
    const kind = entry.record.kind ?? "target";
    if (kind !== "target") return;
    const target = entry.anchorEl;
    if (!target || !(target instanceof HTMLElement)) return;
    target.classList.remove("ccm-anchor-flash");
    // Force a reflow so re-adding the class re-triggers the animation
    // when the same element is targeted twice in a row.
    void target.offsetWidth;
    target.classList.add("ccm-anchor-flash");
    window.setTimeout(() => {
      target.classList.remove("ccm-anchor-flash");
    }, 1250);
  }

  private isEntryLocatable(entry: MarkerEntry): boolean {
    // Every rendered entry has a position assigned in reposition() — coord
    // kinds carry their own coords, resolved targets use their anchor's
    // rect, and unresolved targets park along the right-edge orphan lane.
    // None of those paths produce a "no position" outcome, so every entry
    // is locatable from the drawer's perspective. The "can't locate"
    // badge is intentionally retired: reviewers must always be able to
    // jump to and click any comment.
    void entry;
    return true;
  }

  private buildMarker(record: AnnotationRecord, number: number): HTMLElement {
    const status: FeedbackStatus = record.status ?? "todo";
    const sc = STATUS_COLORS[status];
    const node = el("button", {
      type: "button",
      "aria-label": this.t("marker.ariaLabel", { n: number }),
      style: `
        position:absolute;width:${MARKER_SIZE}px;height:${MARKER_SIZE}px;
        border-radius:9999px;border:2px solid #fff;
        background:${sc.border};color:#fff;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:12px;font-weight:700;line-height:1;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18);
        cursor:grab;pointer-events:auto;
        transform:translate(-50%, -50%);transition:transform 0.15s ease;
      `,
    }) as HTMLButtonElement;
    node.dataset.annotationId = record.id;
    node.dataset.status = status;
    node.dataset.kind = record.kind ?? "target";
    if (status === "question") {
      node.style.animation = "ccm-pulse 1.6s ease-in-out infinite";
    }
    setText(node, String(number));
    node.addEventListener("mouseenter", () => {
      node.style.transform = "translate(-50%, -50%) scale(1.12)";
    });
    node.addEventListener("mouseleave", () => {
      node.style.transform = "translate(-50%, -50%) scale(1)";
    });
    this.attachDragOrClickWatcher(node, record);
    return node;
  }

  /**
   * Drag-or-click watcher (PRO-67). Binds `mousedown` to the marker and
   * promotes the gesture to drag if movement crosses `DRAG_MOVE_THRESHOLD_PX`
   * OR the press lasts > `DRAG_LONGPRESS_MS`. Otherwise the synthesized
   * `click` is treated as the canonical open-popover trigger. Mouse-only —
   * touch synthesizes a `click` directly with no preceding `mousedown`, so
   * the `click` fallback handler keeps tap-to-open working on touch devices.
   *
   * Suppression: when the watcher promotes to drag, the subsequent `click`
   * event (synthesized by the browser on the same mouseup) is swallowed by
   * a one-shot capture-phase listener so the popover doesn't open under the
   * drop position.
   */
  private attachDragOrClickWatcher(node: HTMLElement, record: AnnotationRecord): void {
    // Fallback path for synthesized clicks (touch + non-mouse pointer events).
    // The watcher below promotes mouse-driven gestures via `mouseup`; this
    // listener handles the touch case where there's no `mousedown` first.
    // The `dragSuppressed` ref below short-circuits this for mouse drags.
    const suppress = { value: false };
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      if (suppress.value) {
        suppress.value = false;
        return;
      }
      this.openPopover(record, node);
    });

    node.addEventListener("mousedown", (downEvt: MouseEvent) => {
      // Left-button only. Right-clicks and middle-clicks should not engage
      // the drag-or-click watcher; let them bubble normally.
      if (downEvt.button !== 0) return;
      // Stop propagation so the document-level outside-click handler doesn't
      // close any open popover while the gesture is still resolving.
      downEvt.stopPropagation();

      const startX = downEvt.clientX;
      const startY = downEvt.clientY;
      let promoted = false;
      let longPressTimer: number | null = window.setTimeout(() => {
        longPressTimer = null;
        promote(downEvt);
      }, DRAG_LONGPRESS_MS);

      const onMove = (e: MouseEvent): void => {
        if (promoted) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (dx * dx + dy * dy >= DRAG_MOVE_THRESHOLD_PX * DRAG_MOVE_THRESHOLD_PX) {
          promote(e);
        }
      };

      const onUp = (): void => {
        if (longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        cleanup();
        // If we didn't promote, the synthesized `click` will reach the
        // node's click listener above and open the popover. No-op here.
      };

      const cleanup = (): void => {
        window.removeEventListener("mousemove", onMove, true);
        window.removeEventListener("mouseup", onUp, true);
        if (longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        this.watcherCleanups.delete(cleanup);
      };

      const promote = (currentEvt: MouseEvent): void => {
        if (promoted) return;
        promoted = true;
        suppress.value = true;
        if (longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        // Drop the move/up listeners — drag mode owns its own globals.
        // Use the shared `cleanup` so the watcherCleanups bookkeeping stays
        // in sync (PRO-67 P1) — promotion is a handoff, not a leak.
        cleanup();
        const entry = this.entries.find((e) => e.record.id === record.id);
        if (entry) this.enterDragMode(entry, currentEvt);
      };

      window.addEventListener("mousemove", onMove, true);
      window.addEventListener("mouseup", onUp, true);
      // Track this watcher so `destroy()` can abort it if the host
      // re-initializes the widget mid-gesture (PRO-67 P1).
      this.watcherCleanups.add(cleanup);
    });
  }

  /**
   * Marker relocate via drag (PRO-67). Mounts a fixed full-viewport overlay
   * + instruction strip, ghosts the marker (follows the cursor), uses the
   * shared hover-outline helper to preview the drop target, and on mouseup
   * runs the drop algorithm:
   *
   *   1. Drop on same anchor element (target only) → no-op, no write.
   *   2. Drop on widget host / body / html / ignored → case B coord pin
   *      (unless the marker's record.kind === "area", which goes to case C).
   *   3. Drop on real element → case A target re-anchor (unless area → C).
   *   4. case C — area translate-intact: drag-delta in document space,
   *      areaX/areaY shift by delta, areaW/areaH unchanged, kind stays "area".
   *      Marker anchor (rendered at areaX + areaW) is clamped horizontally
   *      so it stays inside [8, scrollX + innerWidth - 8].
   *
   * ESC / right-click / SPA nav → cancel cleanup, no store write.
   */
  private enterDragMode(entry: MarkerEntry, startEvent: MouseEvent): void {
    // Pin everything we need for restore so listener-removal in cleanup can
    // run without re-deriving state.
    const node = entry.node;
    const originalOpacity = node.style.opacity;
    const originalTransform = node.style.transform;
    const originalCursor = node.style.cursor;
    const originalTransition = node.style.transition;
    const dragStartDocX = startEvent.clientX + window.scrollX;
    const dragStartDocY = startEvent.clientY + window.scrollY;

    const hoverOutline = createHoverOutline(this.colors);

    // Fixed full-viewport overlay — transparent, sits just below the toolbar
    // so the toolbar is still interactive (cancel) but elementFromPoint can
    // still reach the host page beneath after we toggle pointer-events.
    const overlay = el("div", {
      style: `
        position:fixed;inset:0;z-index:${Z_INDEX_MAX - 1};
        background:transparent;cursor:grabbing;
      `,
    });
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("data-ccm-drag-overlay", "true");

    // Toolbar strip — same visual family as PinMode's; shorter copy because
    // there's only one possible action ("drop") plus cancel.
    const toolbar = el("div", {
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
    const instruction = el("span", { style: "font-weight:500;letter-spacing:-0.01em;" });
    setText(instruction, this.t("relocate.instruction"));
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.style.cssText = `
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;
    `;
    setText(cancelBtn, this.t("relocate.cancel"));
    toolbar.appendChild(instruction);
    toolbar.appendChild(cancelBtn);

    document.body.appendChild(overlay);
    document.body.appendChild(toolbar);

    // Ghost the marker — keep it visible so the reviewer sees what they're
    // dragging, but dim it and let it follow the cursor in fixed positioning
    // so it ignores horizontal clamping.
    node.style.opacity = "0.75";
    node.style.cursor = "grabbing";
    node.style.transition = "none";
    node.style.transform = "translate(-50%, -50%)";
    node.style.position = "fixed";
    node.style.top = `${startEvent.clientY}px`;
    node.style.left = `${startEvent.clientX}px`;

    let cleaned = false;

    // Mark drag as in flight so the outer popstate `checkPath` defers its
    // `refresh()` (PRO-67 P2). The drag's own `dragSpaNav` still cancels
    // the gesture; deferring refresh keeps the active entry attached so
    // `cleanup()` can restore styles + reposition without operating on a
    // detached node.
    this.dragInFlight = true;

    /** Resolve the element under the cursor with the overlay temporarily
     * transparent to pointer events. Mirrors PinMode.onOverlayMouseMove. */
    const resolveTarget = (clientX: number, clientY: number): HTMLElement | null => {
      overlay.style.pointerEvents = "none";
      const t = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      overlay.style.pointerEvents = "auto";
      return t;
    };

    const onMove = (e: MouseEvent): void => {
      // Update the ghost position (fixed → viewport coords are fine).
      node.style.top = `${e.clientY}px`;
      node.style.left = `${e.clientX}px`;

      const target = resolveTarget(e.clientX, e.clientY);
      if (!target || !(target instanceof HTMLElement)) {
        hoverOutline.clear();
        return;
      }
      // Don't outline the widget host, the ghost marker itself, or the
      // overlay/toolbar — none are meaningful drop targets.
      if (this.shouldIgnoreElement(target) || node.contains(target) || target === node) {
        hoverOutline.clear();
        return;
      }
      if (target === document.documentElement || target === document.body) {
        hoverOutline.clear();
        return;
      }
      hoverOutline.apply(target);
    };

    const cleanup = (): void => {
      if (cleaned) return;
      cleaned = true;
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("popstate", dragSpaNav, true);
      hoverOutline.destroy();
      overlay.remove();
      toolbar.remove();
      // Restore marker styling. `position` flips back to "absolute" because
      // the marker container uses absolute children; reposition() below
      // recomputes top/left so the marker snaps to its (possibly updated)
      // anchor.
      node.style.position = "absolute";
      node.style.opacity = originalOpacity;
      node.style.transform = originalTransform;
      node.style.cursor = originalCursor;
      node.style.transition = originalTransition;
      this.dragInFlight = false;
      this.dragCleanup = null;
      // Always reposition: on cancel restores the original location, on
      // successful relocate the record was already mutated and the new
      // location is what reposition() reads.
      this.reposition();
    };
    // Expose cleanup so `destroy()` can abort an in-flight drag (PRO-67 P1).
    this.dragCleanup = cleanup;

    // Cancel any in-flight drag when the host page navigates via the
    // History API. Declared after cleanup so the listener can reference it.
    const dragSpaNav = (): void => {
      cancel();
    };

    const cancel = (): void => {
      cleanup();
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };

    const onContextMenu = (e: MouseEvent): void => {
      e.preventDefault();
      cancel();
    };

    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    });

    const onUp = (e: MouseEvent): void => {
      if (cleaned) return;
      // Resolve drop target with overlay click-through.
      const target = resolveTarget(e.clientX, e.clientY);

      // SPA nav between mousedown and mouseup is handled by the `dragSpaNav`
      // popstate listener wired below — it calls `cancel()` which tears the
      // drag down. No extra check needed here.

      // Decide branch. See doc-block above.
      const kind = entry.record.kind ?? "target";
      const recordId = entry.record.id;

      // Helper: clamp post-drop area position so the marker anchor (rendered
      // at areaX + areaW in document space; see reposition() ~line 720) stays
      // inside the visible viewport. Keep in sync with reposition().
      const clampAreaAnchorX = (x: number, w: number): number => {
        const viewLeft = window.scrollX + 8;
        const viewRight = window.scrollX + window.innerWidth - 8;
        const anchor = x + w;
        if (anchor < viewLeft) return viewLeft - w;
        if (anchor > viewRight) return viewRight - w;
        return x;
      };

      // Build the patch.
      let input: UpdateAnchorInput | null = null;

      if (kind === "area") {
        // Case C — translate-intact.
        const dx = e.clientX + window.scrollX - dragStartDocX;
        const dy = e.clientY + window.scrollY - dragStartDocY;
        const oldX = entry.record.areaX ?? 0;
        const oldY = entry.record.areaY ?? 0;
        const w = entry.record.areaW ?? 0;
        const h = entry.record.areaH ?? 0;
        const newX = clampAreaAnchorX(oldX + dx, w);
        const newY = oldY + dy;
        // Carry the existing anchor / rect fields unchanged so DB schema
        // expectations stay consistent (anchor columns are NOT NULL).
        input = {
          kind: "area",
          anchor: this.entryAnchor(entry),
          rect: { xPct: entry.record.xPct, yPct: entry.record.yPct, wPct: entry.record.wPct, hPct: entry.record.hPct },
          pin: null,
          area: { x: newX, y: newY, w, h },
        };
      } else {
        // Decide drop branch for target / pin.
        const dropOnIgnored =
          !target ||
          !(target instanceof HTMLElement) ||
          this.shouldIgnoreElement(target) ||
          target === document.documentElement ||
          target === document.body;

        if (!dropOnIgnored && target && kind === "target" && target === entry.anchorEl) {
          // Drop-on-same-element → no-op. Skip the write + emit so we don't
          // burn a realtime round-trip on accidental short drags.
          cleanup();
          return;
        }

        if (dropOnIgnored) {
          // Case B — coord pin.
          input = {
            kind: "pin",
            anchor: this.emptyAnchor(),
            rect: { xPct: 0, yPct: 0, wPct: 0, hPct: 0 },
            pin: { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY },
            area: null,
          };
        } else if (target && target instanceof HTMLElement) {
          // Case A — target re-anchor.
          const rect = target.getBoundingClientRect();
          const safeW = rect.width || 1;
          const safeH = rect.height || 1;
          const xPct = (e.clientX - rect.left) / safeW;
          const yPct = (e.clientY - rect.top) / safeH;
          input = {
            kind: "target",
            anchor: generateAnchor(target),
            rect: { xPct, yPct, wPct: 0, hPct: 0 },
            pin: null,
            area: null,
          };
        }
      }

      if (input) {
        // Optimistic local mutation so reposition() (called from cleanup)
        // sees the new location even before the store write completes.
        this.applyAnchorInputToRecord(entry.record, input);
        this.store.updateAnchor?.(recordId, input);
        this.bus.emit("feedback:updated", entry.record);
      }

      cleanup();
    };

    // Wire global listeners.
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("popstate", dragSpaNav, true);
  }

  /** Snapshot the entry's current anchor fields into an AnchorData. Used
   * when an area-drag must carry forward the existing anchor unchanged. */
  private entryAnchor(entry: MarkerEntry): AnchorData {
    return {
      cssSelector: entry.record.cssSelector,
      xpath: entry.record.xpath,
      textSnippet: entry.record.textSnippet,
      elementTag: entry.record.elementTag,
      elementId: entry.record.elementId,
      textPrefix: entry.record.textPrefix,
      textSuffix: entry.record.textSuffix,
      fingerprint: entry.record.fingerprint,
      neighborText: entry.record.neighborText,
    };
  }

  /** Empty anchor for kind="pin" rows. Schema columns are NOT NULL so we
   * fill them with empty strings rather than omitting them. */
  private emptyAnchor(): AnchorData {
    return {
      cssSelector: "",
      xpath: "",
      textSnippet: "",
      elementTag: "",
      elementId: undefined,
      textPrefix: "",
      textSuffix: "",
      fingerprint: "",
      neighborText: "",
    };
  }

  /** Apply an `UpdateAnchorInput` to a record in place so reposition() picks
   * up the new location synchronously. Mirrors `Store.updateAnchor`. */
  private applyAnchorInputToRecord(record: AnnotationRecord, input: UpdateAnchorInput): void {
    record.cssSelector = input.anchor.cssSelector;
    record.xpath = input.anchor.xpath;
    record.textSnippet = input.anchor.textSnippet;
    record.elementTag = input.anchor.elementTag;
    record.elementId = input.anchor.elementId;
    record.textPrefix = input.anchor.textPrefix;
    record.textSuffix = input.anchor.textSuffix;
    record.fingerprint = input.anchor.fingerprint;
    record.neighborText = input.anchor.neighborText;
    record.xPct = input.rect.xPct;
    record.yPct = input.rect.yPct;
    record.wPct = input.rect.wPct;
    record.hPct = input.rect.hPct;
    record.kind = input.kind;
    if (input.pin) {
      record.pinX = input.pin.x;
      record.pinY = input.pin.y;
    } else {
      delete record.pinX;
      delete record.pinY;
    }
    if (input.area) {
      record.areaX = input.area.x;
      record.areaY = input.area.y;
      record.areaW = input.area.w;
      record.areaH = input.area.h;
    } else {
      delete record.areaX;
      delete record.areaY;
      delete record.areaW;
      delete record.areaH;
    }
  }

  private renumber(): void {
    this.entries.forEach((entry, i) => {
      const n = i + 1;
      setText(entry.node, String(n));
      entry.node.setAttribute("aria-label", this.t("marker.ariaLabel", { n }));
    });
  }

  private openPopover(record: AnnotationRecord, marker: HTMLElement): void {
    this.closePopover();
    const pop = el("div", {
      style: `
        z-index:${Z_INDEX_MAX};max-width:300px;min-width:220px;padding:14px;
        border-radius:12px;background:${this.colors.glassBg};
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow},0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        color:${this.colors.text};font-size:13px;line-height:1.5;
        -webkit-font-smoothing:antialiased;
      `,
    });
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", this.t("marker.ariaLabel", { n: "" }));
    pop.classList.add("ccm-popover");
    pop.addEventListener("click", (e) => e.stopPropagation());

    const body = el("div", { style: "white-space:pre-wrap;word-break:break-word;margin-bottom:10px;" });
    setText(body, record.message);

    const meta = el("div", {
      style: `font-size:11px;color:${this.colors.textTertiary};margin-bottom:12px;`,
    });
    const author = record.authorName?.trim() || "Anonymous";
    setText(meta, `${author} · ${new Date(record.createdAt).toLocaleString()}`);

    const status: FeedbackStatus = record.status ?? "todo";
    // PRO-67: replace the cycle-on-click pill with a proper combobox
    // dropdown. The dropdown is read-only when the store can't persist
    // status changes (e.g. tests passing a stripped store). Caller owns
    // store write, bus emit, optimistic mutation, and marker recolor.
    const readOnly = typeof this.store.updateStatus !== "function";
    const dropdown = createStatusDropdown({
      current: status,
      colors: this.colors,
      t: this.t,
      readOnly,
      onPick: (next) => this.onStatusPicked(record, next, dropdown),
    });
    this.popoverStatusDropdown = dropdown;

    const kindBadge = el("span", {
      style: `
        display:inline-block;padding:2px 8px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${this.colors.glassBgHeavy};color:${this.colors.textTertiary};
        border:1px solid ${this.colors.border};margin-right:6px;text-transform:uppercase;
      `,
    });
    setText(kindBadge, record.kind ?? "target");

    const tagsRow = el("div", { style: "margin-bottom:10px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;" });
    tagsRow.appendChild(dropdown.root);
    tagsRow.appendChild(kindBadge);

    const btnRow = el("div", { style: "display:flex;justify-content:flex-end;gap:8px;" });

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.style.cssText = `
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:12px;font-weight:500;
      cursor:pointer;transition:all 0.2s ease;
    `;
    setText(closeBtn, this.t("marker.popover.close"));
    closeBtn.addEventListener("click", () => this.closePopover());

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.style.cssText = `
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.typeBug};background:${this.colors.typeBugBg};
      color:${this.colors.typeBug};font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `;
    setText(deleteBtn, this.t("marker.popover.delete"));
    deleteBtn.addEventListener("click", () => {
      if (!window.confirm(this.t("marker.popover.deleteConfirm"))) return;
      this.store.delete(record.id);
      this.bus.emit("feedback:deleted", record.id);
      this.closePopover();
      this.refresh();
    });

    // ---- Reply thread section ----
    // Order: tags → body → meta → divider → repliesList → composer → btnRow.
    // Empty thread renders nothing (no "no replies" placeholder) — keeps the
    // popover compact for the common case.
    const divider = el("div", {
      style: `height:1px;background:${this.colors.border};margin:10px -4px 10px;`,
    });

    const thread = el("div", {
      style: "display:flex;flex-direction:column;gap:8px;margin-bottom:10px;",
    });

    const renderThread = (): void => {
      thread.replaceChildren();
      const replies = this.store.listReplies(record.id);
      if (replies.length > 0) {
        const heading = el("div", {
          style: `font-size:11px;font-weight:600;color:${this.colors.textTertiary};margin-bottom:2px;letter-spacing:0.02em;text-transform:uppercase;`,
        });
        setText(heading, this.t("marker.replies.heading"));
        thread.appendChild(heading);
      }
      for (const reply of replies) {
        thread.appendChild(this.buildReplyRow(reply));
      }
    };
    renderThread();

    // ---- Composer ----
    const composer = el("div", {
      style: "display:flex;flex-direction:column;gap:6px;margin-bottom:10px;",
    });

    const ta = el("textarea", {
      rows: "2",
      placeholder: this.t("marker.reply.placeholder"),
      "aria-label": this.t("marker.reply.placeholder"),
      style: `
        width:100%;box-sizing:border-box;resize:vertical;min-height:48px;max-height:160px;
        border-radius:8px;border:1px solid ${this.colors.border};
        background:${this.colors.glassBg};color:${this.colors.text};
        font-family:inherit;font-size:13px;line-height:1.4;padding:8px 10px;
      `,
    }) as HTMLTextAreaElement;

    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.style.cssText = `
      align-self:flex-end;height:28px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.accent};background:${this.colors.accent};
      color:#fff;font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `;
    setText(sendBtn, this.t("marker.reply.send"));

    const send = (): void => {
      const message = ta.value.trim();
      if (!message) return; // silent no-op for blank / whitespace-only
      const reply = this.store.addReply({
        projectName: record.projectName,
        parentId: record.id,
        message,
        authorName: ensureAuthor(),
        url: record.url,
        path: record.path,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
      });
      this.bus.emit("feedback:replied", reply);
      ta.value = "";
      renderThread();
      // Pin the scroll to the newest reply so reviewer sees their post.
      pop.scrollTop = pop.scrollHeight;
    };
    sendBtn.addEventListener("click", send);

    ta.addEventListener("keydown", (e) => {
      // Enter submits; Shift+Enter inserts a newline. ⌘/Ctrl+Enter also
      // submits (matches the popup.ts hint convention so muscle memory
      // carries across).
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
        return;
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        send();
      }
    });

    composer.appendChild(ta);
    composer.appendChild(sendBtn);

    btnRow.appendChild(closeBtn);
    btnRow.appendChild(deleteBtn);
    pop.appendChild(tagsRow);
    pop.appendChild(body);
    pop.appendChild(meta);
    pop.appendChild(divider);
    pop.appendChild(thread);
    pop.appendChild(composer);
    pop.appendChild(btnRow);

    // ---- Sizing: cap height + scroll inside ----
    // PRO-67: cap at min(70vh, 540 px). 540 = legacy nominal-180 * 3 — a
    // ceiling so the popover doesn't dominate tall viewports even when
    // 70vh would allow more height.
    const maxHeight = Math.min(window.innerHeight * POPOVER_MAX_VH, POPOVER_MAX_HEIGHT_CEIL_PX);
    pop.style.maxHeight = `${maxHeight}px`;
    pop.style.overflowY = "auto";

    // Manual `position: fixed` placement. We used to feature-detect CSS
    // Anchor Positioning (`anchor-name` + `position-area`) and use it when
    // available, but Chrome 125+ silently fails to PAINT the anchored
    // element when the anchor lives inside an `overflow: clip` ancestor
    // (PRO-64). Layout reports the correct rect; paint produces nothing.
    // Since the marker container deliberately uses `overflow-x: clip` to
    // prevent off-viewport pins from growing host scrollWidth, the bug
    // hits every host page. Manual placement sidesteps the anchor-paint
    // bug entirely and gives us explicit control over edge-flip behavior.
    //
    // PRO-67: single-pass placement using off-screen pre-render. Append the
    // popover at top: -10000 / left: -10000 first so it lays out (and the
    // max-height clamp applies), read the real height, then position it.
    // The legacy first-paint nominal-180 estimate + measured re-placement
    // pass are gone — one pass with the real height gives the same UX with
    // less code.
    const rect = marker.getBoundingClientRect();
    pop.style.position = "fixed";
    pop.style.top = "-10000px";
    pop.style.left = "-10000px";
    document.body.appendChild(pop);
    this.popover = pop;

    const actualHeight = Math.min(pop.offsetHeight, maxHeight);
    let top = rect.bottom + 8;
    let left = rect.left - 10;
    if (top + actualHeight > window.innerHeight - POPOVER_VIEWPORT_MARGIN) {
      top = rect.top - actualHeight - 8;
    }
    if (left + POPOVER_NOMINAL_WIDTH > window.innerWidth) {
      left = window.innerWidth - POPOVER_NOMINAL_WIDTH - 8;
    }
    top = Math.max(POPOVER_VIEWPORT_MARGIN, top);
    left = Math.max(8, left);
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;

    // ---- Realtime: wire bus subscriptions for the open popover ----
    const offReplied = this.bus.on("feedback:replied", (reply) => {
      if (reply.parentId !== record.id) return;
      // Skip re-render if the row is already in the DOM (echo suppression
      // for our own just-sent reply: addReply already updated the cache and
      // the send-handler called renderThread above, so this incoming event
      // is just our own echo via realtime).
      if (thread.querySelector(`[data-reply-id="${reply.id}"]`)) return;
      renderThread();
      pop.scrollTop = pop.scrollHeight;
    });

    const offDeleted = this.bus.on("feedback:deleted", (id) => {
      // Parent delete arriving from another window → close this popover.
      if (id === record.id) {
        this.closePopover();
        return;
      }
      // Reply delete (local or remote) that belongs to this thread → re-render.
      if (thread.querySelector(`[data-reply-id="${id}"]`)) {
        renderThread();
      }
    });

    this.popoverDisposers.push(offReplied, offDeleted);
  }

  /**
   * Render one reply row: meta line (author · time), body, hover-revealed
   * delete affordance. Marked with `data-reply-id` so the realtime handlers
   * can cheaply test whether a deleted/inserted id belongs to this thread.
   */
  private buildReplyRow(reply: AnnotationRecord): HTMLElement {
    const row = el("div", {
      style: `
        position:relative;padding:8px 10px 8px 10px;border-radius:8px;
        background:${this.colors.glassBgHeavy};
        border:1px solid ${this.colors.border};
      `,
    });
    row.dataset.replyId = reply.id;

    const metaLine = el("div", {
      style: `font-size:11px;color:${this.colors.textTertiary};margin-bottom:4px;padding-right:18px;`,
    });
    const author = reply.authorName?.trim() || "Anonymous";
    setText(metaLine, `${author} · ${new Date(reply.createdAt).toLocaleString()}`);

    const bodyLine = el("div", {
      style: "white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.45;",
    });
    setText(bodyLine, reply.message);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", this.t("marker.reply.delete"));
    delBtn.style.cssText = `
      position:absolute;top:4px;right:4px;width:18px;height:18px;
      border-radius:9999px;border:none;background:transparent;
      color:${this.colors.textTertiary};
      font-family:inherit;font-size:14px;line-height:1;cursor:pointer;
      opacity:0;transition:opacity 0.15s ease,color 0.15s ease;
      padding:0;
    `;
    setText(delBtn, "×");
    row.addEventListener("mouseenter", () => {
      delBtn.style.opacity = "1";
    });
    row.addEventListener("mouseleave", () => {
      delBtn.style.opacity = "0";
    });
    delBtn.addEventListener("focus", () => {
      delBtn.style.opacity = "1";
    });
    delBtn.addEventListener("blur", () => {
      delBtn.style.opacity = "0";
    });
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!window.confirm(this.t("marker.replyDeleteConfirm"))) return;
      this.store.delete(reply.id);
      // Emit feedback:deleted so the open-popover subscription drops the
      // row in place. Do NOT call refresh() — replies have no markers, so
      // a full marker re-render would be pure cost.
      this.bus.emit("feedback:deleted", reply.id);
    });

    row.appendChild(metaLine);
    row.appendChild(bodyLine);
    row.appendChild(delBtn);
    return row;
  }

  /**
   * Status pick handler — runs the persistence + recolor side of the
   * dropdown's onPick contract. The dropdown module owns DOM/aria/keyboard;
   * this method owns store + bus + marker.
   */
  private onStatusPicked(record: AnnotationRecord, next: FeedbackStatus, handle: StatusDropdownHandle): void {
    this.store.updateStatus?.(record.id, next);
    record.status = next;
    this.bus.emit("feedback:updated", record);
    handle.setCurrent(next);
    handle.close();
    this.repositionAndRecolor(record.id);
  }

  /**
   * Update one marker's color + pulse animation in place when its status
   * changes — avoids the close-popover + refresh round-trip the legacy
   * cycle-on-click pill used to perform (PRO-67 §3). The open popover
   * stays mounted while the marker recolors beneath.
   */
  private repositionAndRecolor(id: string): void {
    const entry = this.entries.find((e) => e.record.id === id);
    if (!entry) return;
    const status: FeedbackStatus = entry.record.status ?? "todo";
    const sc = STATUS_COLORS[status];
    entry.node.style.background = sc.border;
    entry.node.dataset.status = status;
    entry.node.style.animation = status === "question" ? "ccm-pulse 1.6s ease-in-out infinite" : "";
    // The drawer + FAB count care about this status change but neither
    // re-renders from here — `feedback:updated` (emitted by the caller)
    // already drives the drawer.refreshIfOpen + fab.updateCount path in
    // src/index.ts.
  }

  private closePopover(): void {
    if (!this.popover) return;
    this.popoverStatusDropdown?.destroy();
    this.popoverStatusDropdown = null;
    this.popover.remove();
    this.popover = null;
    // Tear down the open-popover bus subscriptions so the closed popover
    // doesn't keep re-rendering when realtime delivers events after close.
    for (const off of this.popoverDisposers) off();
    this.popoverDisposers = [];
  }

  private scheduleReposition(): void {
    if (this.repositionTimer !== null) return;
    this.repositionTimer = window.setTimeout(() => {
      this.repositionTimer = null;
      this.reposition();
    }, REPOSITION_DEBOUNCE_MS);
  }

  private reposition(): void {
    // Horizontal clamp window — any marker whose center would land outside
    // [minX, maxX] gets pinned to the nearest edge so it stays visible AND
    // doesn't extend `documentElement.scrollWidth`. Combined with the
    // container's `overflow-x: clip`, this guarantees no horizontal
    // scrollbar regression on the host page. Markers are never hidden for
    // being off-viewport — reviewers must always be able to see/click
    // every comment.
    const viewportWidth = document.documentElement.clientWidth;
    const minX = MARKER_OFFSET;
    const maxX = Math.max(MARKER_OFFSET, viewportWidth - MARKER_OFFSET);
    const clampX = (x: number) => Math.max(minX, Math.min(maxX, x));

    // Parking lane for target-kind markers whose anchor element couldn't be
    // resolved on the current page. Stacked vertically along the right edge
    // of the current viewport (recomputed on scroll via scheduleReposition)
    // so they're always reachable.
    let orphanIndex = 0;
    const orphanTop = (i: number) => window.scrollY + 80 + i * (MARKER_SIZE + 8);

    for (const entry of this.entries) {
      const kind = entry.record.kind ?? "target";
      if (kind === "pin" && entry.record.pinX != null && entry.record.pinY != null) {
        entry.node.style.display = this.visible ? "flex" : "none";
        entry.node.style.top = `${entry.record.pinY}px`;
        entry.node.style.left = `${clampX(entry.record.pinX)}px`;
        entry.anchorEl = null;
        continue;
      }
      if (
        kind === "area" &&
        entry.record.areaX != null &&
        entry.record.areaY != null &&
        entry.record.areaW != null &&
        entry.record.areaH != null
      ) {
        entry.node.style.display = this.visible ? "flex" : "none";
        entry.node.style.top = `${entry.record.areaY}px`;
        entry.node.style.left = `${clampX(entry.record.areaX + entry.record.areaW)}px`;
        entry.anchorEl = null;
        continue;
      }
      const resolved = resolveAnnotation(
        {
          cssSelector: entry.record.cssSelector,
          xpath: entry.record.xpath,
          textSnippet: entry.record.textSnippet,
          elementTag: entry.record.elementTag,
          elementId: entry.record.elementId,
          textPrefix: entry.record.textPrefix,
          textSuffix: entry.record.textSuffix,
          fingerprint: entry.record.fingerprint,
          neighborText: entry.record.neighborText,
        },
        { xPct: entry.record.xPct, yPct: entry.record.yPct, wPct: entry.record.wPct, hPct: entry.record.hPct },
      );
      if (!resolved) {
        // Orphan: park at right edge of viewport, stacked. Reviewer can
        // still click to read the comment body; the popover will note the
        // anchor is unresolved.
        entry.node.style.display = this.visible ? "flex" : "none";
        entry.node.style.top = `${orphanTop(orphanIndex)}px`;
        entry.node.style.left = `${maxX}px`;
        entry.node.dataset.orphan = "true";
        entry.anchorEl = null;
        orphanIndex++;
        continue;
      }
      entry.node.dataset.orphan = "false";
      entry.anchorEl = resolved.element;
      const rect = resolved.rect;
      const top = rect.top + window.scrollY - MARKER_OFFSET;
      const center = rect.right + window.scrollX;
      entry.node.style.display = this.visible ? "flex" : "none";
      entry.node.style.top = `${top + MARKER_OFFSET}px`;
      entry.node.style.left = `${clampX(center)}px`;
    }
  }

  destroy(): void {
    // Abort any in-flight drag-or-click watcher and drag mode BEFORE we tear
    // down the rest (PRO-67 P1). The drag overlay/toolbar live on
    // document.body, not inside this.container — without explicit cancel
    // they'd survive container.remove() with five global listeners still
    // bound. Iterate a copy of watcherCleanups because each cleanup mutates
    // the live set.
    this.dragCleanup?.();
    for (const fn of [...this.watcherCleanups]) fn();
    this.watcherCleanups.clear();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("click", this.onDocClick, true);
    history.pushState = this.origPushState;
    history.replaceState = this.origReplaceState;
    this.closePopover();
    this.container.remove();
    this.entries = [];
  }
}

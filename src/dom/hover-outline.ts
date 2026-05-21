/**
 * Shared hover-outline helper.
 *
 * Owns the snapshot-and-restore state for one outlined element at a time:
 * applies a solid 2px outline + a floating tag-name badge near the target's
 * bottom-right corner, then restores the host page's pre-existing inline
 * outline on clear. Used by `PinMode` (CCM-291) and the marker-relocate drag
 * overlay (PRO-67) — both surface the same visual affordance and must share
 * one implementation so the snapshot/restore semantics stay byte-identical.
 *
 * Lifecycle:
 *   apply(target)  — snapshot existing outline + apply hover styles + mount badge
 *   clear()        — restore snapshot OR remove the inline outline, remove badge
 *   destroy()      — alias for clear(), symmetric with mode classes
 */
import { Z_INDEX_MAX } from "../constants.js";
import type { ThemeColors } from "../styles/theme.js";

/** Defensive inset so the badge never renders flush against the viewport edge. */
const BADGE_INSET = 8;

export interface HoverOutlineHandle {
  /**
   * Apply the hover outline + badge to `target`. If a different element is
   * already outlined, its snapshot is restored first (callers don't have to
   * pair every `apply` with a `clear`).
   */
  apply(target: HTMLElement): void;
  /** Remove the outline + badge and restore the previous inline outline. */
  clear(): void;
  /** Alias for `clear`. Symmetric with mode classes' destroy() lifecycle. */
  destroy(): void;
}

/**
 * Build a hover-outline helper bound to a `ThemeColors` palette. Returns an
 * object with `apply` / `clear` / `destroy`. The closure owns its own state
 * — two helpers don't share snapshot fields.
 */
export function createHoverOutline(colors: ThemeColors): HoverOutlineHandle {
  let hoveredElement: HTMLElement | null = null;
  let badge: HTMLElement | null = null;
  // Snapshot of the hovered element's pre-hover inline outline styles so
  // `clear` restores exactly what the host page had set rather than wiping
  // it. See CCM-291 P2 todo "preserve-host-inline-outline".
  let previousOutline: string | null = null;
  let previousOutlineOffset: string | null = null;
  let previousOutlinePriority = "";
  let previousOutlineOffsetPriority = "";

  const clear = (): void => {
    if (hoveredElement) {
      // Restore the snapshot captured in apply(). If the element had no
      // inline outline pre-hover, the snapshot is null and we removeProperty
      // (original behaviour). If it did, we re-apply it with its original
      // !important priority. CCM-291 P2 preserve-host-inline-outline.
      if (previousOutline !== null) {
        hoveredElement.style.setProperty("outline", previousOutline, previousOutlinePriority);
      } else {
        hoveredElement.style.removeProperty("outline");
      }
      if (previousOutlineOffset !== null) {
        hoveredElement.style.setProperty("outline-offset", previousOutlineOffset, previousOutlineOffsetPriority);
      } else {
        hoveredElement.style.removeProperty("outline-offset");
      }
      hoveredElement = null;
      previousOutline = null;
      previousOutlineOffset = null;
      previousOutlinePriority = "";
      previousOutlineOffsetPriority = "";
    }
    if (badge) {
      badge.remove();
      badge = null;
    }
  };

  const apply = (target: HTMLElement): void => {
    if (hoveredElement === target) return;
    // Restore any prior target's snapshot first — callers can call apply
    // multiple times without an intervening clear.
    if (hoveredElement) clear();

    // Snapshot any pre-existing inline outline styling so unhover restores
    // it rather than nuking host-page outline (CCM-291 P2).
    previousOutline = target.style.outline || null;
    previousOutlineOffset = target.style.outlineOffset || null;
    previousOutlinePriority = target.style.getPropertyPriority("outline");
    previousOutlineOffsetPriority = target.style.getPropertyPriority("outline-offset");

    // Solid 2px outline — distinguishes from text-edit's dashed outline.
    target.style.setProperty("outline", `2px solid ${colors.accent}`, "important");
    target.style.setProperty("outline-offset", "2px", "important");

    hoveredElement = target;

    // Floating tag-name badge near the element's bottom-right corner.
    const bounds = target.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0) {
      badge = document.createElement("div");
      const tagName = target.tagName.toLowerCase();
      badge.textContent = tagName;
      badge.setAttribute("aria-hidden", "true");
      // Clamp both axes to a defensive inset. Without Math.max the badge
      // renders off-screen when the target is partially off the top/left
      // (negative bounds). CCM-291 P3 badge-position-clamp.
      const left = Math.max(BADGE_INSET, Math.min(bounds.right - 4, window.innerWidth - 60));
      const top = Math.max(BADGE_INSET, Math.min(bounds.bottom + 4, window.innerHeight - 24));
      badge.style.cssText = `
        position:fixed;
        left:${left}px;
        top:${top}px;
        transform:translateX(-100%);
        z-index:${Z_INDEX_MAX};
        padding:2px 8px;border-radius:6px;
        background:${colors.glassBg};
        backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        border:1px solid ${colors.accent};
        color:${colors.accent};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:11px;font-weight:500;
        letter-spacing:0.02em;
        pointer-events:none;
        white-space:nowrap;
      `;
      document.body.appendChild(badge);
    }
  };

  return {
    apply,
    clear,
    destroy: clear,
  };
}

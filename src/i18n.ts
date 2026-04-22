/**
 * English-only i18n for MVP. Kept as a function so call sites stay the same
 * as the old locale-aware implementation — swap for a real locale map later.
 */

const STRINGS: Record<string, string> = {
  "fab.aria": "Feedback",
  "fab.pinLabel": "Comment on element",
  "fab.toggleOn": "Hide comments",
  "fab.toggleOff": "Show comments",
  "fab.export": "Export JSON",
  "pin.ariaLabel": "Pin mode toolbar",
  "pin.instruction": "Click any element to comment on it",
  "pin.cancel": "Cancel",
  "popup.ariaLabel": "Comment composer",
  "popup.placeholder": "Leave a comment…",
  "popup.textareaAria": "Comment",
  "popup.cancel": "Cancel",
  "popup.submit": "Send",
  "popup.submitHintMac": "⌘ + ↵ to submit",
  "popup.submitHintOther": "Ctrl + ↵ to submit",
  "marker.ariaLabel": "Comment #{n}",
  "marker.popover.delete": "Delete",
  "marker.popover.close": "Close",
  "toast.exported": "Exported {n} annotation(s)",
  "toast.empty": "No annotations to export",
};

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

export function createT(): TFunction {
  return (key, vars) => {
    const tpl = STRINGS[key] ?? key;
    if (!vars) return tpl;
    return tpl.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? ""));
  };
}

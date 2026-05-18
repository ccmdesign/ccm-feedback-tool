/**
 * English-only i18n for MVP. Kept as a function so call sites stay the same
 * as the old locale-aware implementation — swap for a real locale map later.
 */

const STRINGS: Record<string, string> = {
  "fab.aria": "Feedback",
  "fab.targetLabel": "Target element",
  "fab.pinLabel": "Drop pin",
  "fab.areaLabel": "Capture area",
  "fab.toggleOn": "Hide comments",
  "fab.toggleOff": "Show comments",
  "fab.export": "Export JSON",
  "fab.copyUrl": "Copy feedback URL", // FR: "Copier l'URL des retours"
  "fab.copyUrlLocalOnly": "Cloud mode only — use Export JSON", // FR: "Mode cloud uniquement — utilisez Export JSON"
  "fab.clear": "Clear all",
  "fab.clearConfirm": "Delete all annotations for this project? This cannot be undone.",
  "pin.ariaLabel": "Pin mode toolbar",
  "pin.instruction": "Click any element to comment on it",
  "pin.cancel": "Cancel",
  "coordPin.instruction": "Click anywhere to drop a pin",
  "area.instruction": "Drag to capture an area",
  "status.todo": "Todo",
  "status.review": "Review", // FR: "À vérifier"
  "status.done": "Done",
  "status.question": "Question",
  "status.label": "Status",
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
  "marker.popover.deleteConfirm": "Delete this comment? This cannot be undone.",
  "toast.exported": "Exported {n} annotation(s)",
  "toast.empty": "No annotations to export",
  "toast.urlCopied": "Feedback URL copied to clipboard", // FR: "URL des retours copiée dans le presse-papiers"
  "toast.urlCopyFailed": "Could not copy URL — clipboard unavailable", // FR: "Impossible de copier l'URL — presse-papiers indisponible"
};

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

export function createT(): TFunction {
  return (key, vars) => {
    const tpl = STRINGS[key] ?? key;
    if (!vars) return tpl;
    return tpl.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? ""));
  };
}

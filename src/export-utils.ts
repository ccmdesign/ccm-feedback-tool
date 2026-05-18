import type { AnnotationRecord } from "./types.js";

/** Trigger a browser download of `content` as a file. */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  requestAnimationFrame(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  });
}

/**
 * Copy `text` to the clipboard. Resolves `true` on success, `false` if the
 * Clipboard API is unavailable or blocked (e.g. insecure context, denied
 * permission). Never throws — callers surface the boolean.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Download annotations as a JSON file named `ccm-feedback-<project>-<yyyy-mm-dd>.json`. */
export function exportAsJson(projectName: string, records: AnnotationRecord[]): void {
  const date = new Date().toISOString().slice(0, 10);
  const safe = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const payload = {
    projectName,
    exportedAt: new Date().toISOString(),
    count: records.length,
    annotations: records,
  };
  downloadFile(JSON.stringify(payload, null, 2), `ccm-feedback-${safe}-${date}.json`, "application/json;charset=utf-8");
}

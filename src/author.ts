/** Reviewer-name persistence + first-time prompt. */

const STORAGE_KEY = "ccm-feedback:author";
const FALLBACK = "Anonymous";

export function loadAuthor(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function saveAuthor(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name.trim());
  } catch {
    // Quota exceeded — best-effort.
  }
}

/**
 * Resolve the current reviewer's name. Prompts on first call (no UI dep
 * yet — uses native `prompt`) and persists in localStorage. Returns
 * `"Anonymous"` if the user dismisses the prompt.
 */
export function ensureAuthor(): string {
  const cached = loadAuthor();
  if (cached) return cached;
  let entered: string | null = null;
  try {
    entered = window.prompt("Your name (shown next to your comments):", "");
  } catch {
    entered = null;
  }
  const name = entered?.trim() || FALLBACK;
  saveAuthor(name);
  return name;
}

type Listener = (...args: unknown[]) => void;

/**
 * Lightweight typed EventEmitter — zero dependencies.
 */
export class EventBus<E extends { [K in keyof E]: unknown[] }> {
  private listeners = new Map<keyof E, Set<Listener>>();

  on<K extends keyof E>(event: K, listener: (...args: E[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener);

    return () => {
      set.delete(listener as Listener);
    };
  }

  off<K extends keyof E>(event: K, listener: (...args: E[K]) => void): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener as Listener);
    }
  }

  emit<K extends keyof E>(event: K, ...args: E[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(...args);
      } catch (err) {
        // Isolate listener errors — one bad listener must not kill others
        console.error(`[ccm-feedback] Error in event listener for "${String(event)}":`, err);
      }
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

// ---------------------------------------------------------------------------
// Widget event types
// ---------------------------------------------------------------------------

export interface WidgetEvents {
  open: [];
  close: [];
  "feedback:sent": [import("@ccm-feedback/core").FeedbackResponse];
  "feedback:deleted": [string];
  "feedback:all-deleted": [];
  "feedback:error": [Error];
  "annotation:start": [];
  "annotation:end": [];
  "annotation:complete": [import("./annotator.js").AnnotationComplete];
  "annotations:toggle": [boolean];
  "panel:toggle": [boolean];
  // CCM-282 — text-edit + image-swap modes. Payloads are defined alongside
  // the mode classes to keep ownership local.
  "text-edit:start": [];
  "text-edit:end": [];
  "text-edit:complete": [import("./text-edit-mode.js").TextEditComplete];
  "image-swap:start": [];
  "image-swap:end": [];
  "image-swap:complete": [import("./image-swap-mode.js").ImageSwapComplete];
  // CCM-291 — pin mode lifecycle. Pin reuses "annotation:complete" for its
  // submission payload (shape parity with area mode), so no new complete event.
  "pin:start": [];
  "pin:end": [];
}

/** Subset of WidgetEvents exposed to consumers via CcmFeedbackInstance */
export interface PublicWidgetEvents {
  "feedback:sent": [import("@ccm-feedback/core").FeedbackResponse];
  "feedback:deleted": [string];
  "panel:open": [];
  "panel:close": [];
}

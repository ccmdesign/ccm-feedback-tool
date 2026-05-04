import type { AnnotationRecord } from "./types.js";

type Listener = (...args: unknown[]) => void;

/** Lightweight typed EventEmitter — zero dependencies. */
export class EventBus<E extends { [K in keyof E]: unknown[] }> {
  private listeners = new Map<keyof E, Set<Listener>>();

  on<K extends keyof E>(event: K, listener: (...args: E[K]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener);
    return () => {
      set.delete(listener as Listener);
    };
  }

  emit<K extends keyof E>(event: K, ...args: E[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[ccm-feedback] Error in listener for "${String(event)}":`, err);
      }
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

export interface WidgetEvents {
  "target:start": [];
  "target:end": [];
  "pin:start": [];
  "pin:end": [];
  "area:start": [];
  "area:end": [];
  "feedback:saved": [AnnotationRecord];
  "feedback:deleted": [string];
  "annotations:toggle": [boolean];
  "export:click": [];
  "clear:click": [];
}

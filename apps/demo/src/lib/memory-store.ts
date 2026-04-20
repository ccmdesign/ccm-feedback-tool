import { MemoryStore } from "@ccm-feedback/adapter-memory";

const RESET_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Singleton — survives Next.js hot reloads in dev
const g = globalThis as typeof globalThis & { __ccmFeedbackStore?: MemoryStore };
if (!g.__ccmFeedbackStore) {
  g.__ccmFeedbackStore = new MemoryStore();
  setInterval(() => g.__ccmFeedbackStore?.clear(), RESET_INTERVAL_MS);
}

export const memoryStore = g.__ccmFeedbackStore;

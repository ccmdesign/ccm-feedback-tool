import type { CcmFeedbackPrismaClient } from "@ccm-feedback/adapter-prisma";
import type { CcmFeedbackStore } from "@ccm-feedback/core";

const RESET_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

type GlobalRefs = typeof globalThis & {
  __ccmFeedbackMemoryStore?: import("@ccm-feedback/adapter-memory").MemoryStore;
  __ccmFeedbackStore?: CcmFeedbackStore;
};

/**
 * Resolve the demo's backing store.
 *
 * - When `DATABASE_URL` is set, instantiate a `PrismaStore` wrapping the shared
 *   Prisma client (dynamic import keeps `@prisma/client` out of the
 *   memory-only code path).
 * - Otherwise, fall back to a singleton `MemoryStore` that auto-clears every
 *   10 minutes — the current demo behavior.
 *
 * Cached on `globalThis` to survive Next.js hot reloads in dev.
 */
export async function resolveStore(): Promise<CcmFeedbackStore> {
  const g = globalThis as GlobalRefs;
  if (g.__ccmFeedbackStore) return g.__ccmFeedbackStore;

  if (process.env.DATABASE_URL) {
    const [{ PrismaStore }, { prisma }] = await Promise.all([
      import("@ccm-feedback/adapter-prisma"),
      import("./prisma"),
    ]);
    // Prisma's generated client is a superset of the adapter's minimal shape —
    // cast to the adapter's interface so both sides line up at the type level.
    g.__ccmFeedbackStore = new PrismaStore(prisma as unknown as CcmFeedbackPrismaClient);
    return g.__ccmFeedbackStore;
  }

  const { MemoryStore } = await import("@ccm-feedback/adapter-memory");
  if (!g.__ccmFeedbackMemoryStore) {
    g.__ccmFeedbackMemoryStore = new MemoryStore();
    setInterval(() => g.__ccmFeedbackMemoryStore?.clear(), RESET_INTERVAL_MS);
  }
  g.__ccmFeedbackStore = g.__ccmFeedbackMemoryStore;
  return g.__ccmFeedbackStore;
}

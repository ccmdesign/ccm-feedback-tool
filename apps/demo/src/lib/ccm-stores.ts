import type { CcmProjectPrismaClient, ReviewBatchPrismaClient } from "@ccm-feedback/adapter-prisma";

/**
 * Lazy Project + ReviewBatch store resolver.
 *
 * Mirrors `lib/store.ts`: returns configured stores when `DATABASE_URL` is
 * set, throws otherwise. Projects + batches are persistent configuration,
 * so there is no in-memory fallback (unlike the feedback store).
 */
let cached: {
  projectStore: import("@ccm-feedback/adapter-prisma").ProjectStore;
  reviewBatchStore: import("@ccm-feedback/adapter-prisma").ReviewBatchStore;
} | null = null;

export async function resolveProjectStores(): Promise<{
  projectStore: import("@ccm-feedback/adapter-prisma").ProjectStore;
  reviewBatchStore: import("@ccm-feedback/adapter-prisma").ReviewBatchStore;
}> {
  if (cached) return cached;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "[ccm-feedback] Project + ReviewBatch stores require DATABASE_URL. Set it in .env or Netlify env vars.",
    );
  }
  const [{ ProjectStore, ReviewBatchStore }, { prisma }] = await Promise.all([
    import("@ccm-feedback/adapter-prisma"),
    import("./prisma"),
  ]);
  cached = {
    projectStore: new ProjectStore(prisma as unknown as CcmProjectPrismaClient),
    reviewBatchStore: new ReviewBatchStore(prisma as unknown as ReviewBatchPrismaClient),
  };
  return cached;
}

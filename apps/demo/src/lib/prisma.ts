import { PrismaClient } from "@prisma/client";

/**
 * Next.js-friendly Prisma singleton.
 *
 * In development, Next.js hot-reloads this module on file changes, which would
 * otherwise spawn a new PrismaClient per reload and exhaust the connection pool.
 * Binding the instance to globalThis keeps a single client alive across reloads.
 */
const g = globalThis as typeof globalThis & { __ccmFeedbackPrisma?: PrismaClient };

export const prisma: PrismaClient = g.__ccmFeedbackPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  g.__ccmFeedbackPrisma = prisma;
}

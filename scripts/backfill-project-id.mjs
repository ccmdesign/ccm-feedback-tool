#!/usr/bin/env bun
/**
 * Backfill Project rows and FeedbackItem.projectId from existing
 * FeedbackItem.projectName values.
 *
 * Usage:
 *   bun scripts/backfill-project-id.mjs
 *
 * Requires: DATABASE_URL (and optionally DIRECT_URL for migrations).
 * Idempotent — safe to re-run; produces no duplicate Project rows.
 */

import { PrismaClient } from "@prisma/client";
import { backfillProjectIds } from "./lib/backfill-project-id-core.mjs";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[backfill] DATABASE_URL is not set — aborting.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const summary = await backfillProjectIds(prisma, { logger: (m) => console.log(m) });
    console.log(
      `[backfill] Done. projectsCreated=${summary.projectsCreated} projectsTotal=${summary.projectsTotal} feedbacksUpdated=${summary.feedbacksUpdated}`,
    );
  } catch (error) {
    console.error("[backfill] Failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

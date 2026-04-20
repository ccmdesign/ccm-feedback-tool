/**
 * Netlify Scheduled Function — runs every 5 minutes (UTC).
 *
 * Picks up ReviewBatch rows in `retrying` state whose `nextAttemptAt`
 * has elapsed and re-dispatches them via the shared adapter helper.
 *
 * Configured in netlify.toml under `[functions."dispatch-retry"]` with a
 * `schedule = "*/5 * * * *"` cron expression. Netlify runs this in the
 * same Lambda runtime as the Next.js routes.
 */

import type { Config, Context } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import {
  ProjectStore,
  ReviewBatchStore,
  processPendingReviewBatches,
} from "@ccm-feedback/adapter-prisma";

export default async (_req: Request, _ctx: Context): Promise<Response> => {
  if (!process.env.DATABASE_URL) {
    return new Response(JSON.stringify({ skipped: true, reason: "no-database-url" }), { status: 200 });
  }
  const prisma = new PrismaClient();
  try {
    const projectStore = new ProjectStore(prisma as never);
    const reviewBatchStore = new ReviewBatchStore(prisma as never);
    const { processed, outcomes } = await processPendingReviewBatches(
      { projectStore, reviewBatchStore },
      { limit: 10 },
    );
    // eslint-disable-next-line no-console
    console.log("[dispatch-retry]", JSON.stringify({ processed, outcomes }));
    return new Response(JSON.stringify({ processed, outcomes }), { status: 200 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[dispatch-retry] failed:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
};

export const config: Config = {
  schedule: "*/5 * * * *",
};

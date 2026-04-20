/**
 * Pure backfill helper — the testable core behind `scripts/backfill-project-id.mjs`.
 *
 * Given a Prisma-like client (or a mock that mirrors the subset of methods
 * used here), this function:
 *   1. Reads distinct `FeedbackItem.projectName` values.
 *   2. Upserts `Project` rows on `name` (idempotent).
 *   3. Updates `FeedbackItem.projectId` for any row where it is null.
 *
 * Returns `{ projectsCreated, projectsTotal, feedbacksUpdated }` for a
 * human-readable summary.
 */

/**
 * @typedef {Object} BackfillPrismaClient
 * @property {{
 *   findMany: (args: { select: { projectName: boolean }; distinct?: string[]; where?: unknown }) => Promise<Array<{ projectName: string }>>;
 *   updateMany: (args: { data: { projectId: string }; where: { projectName: string; projectId: null } }) => Promise<{ count: number }>;
 * }} feedbackItem
 * @property {{
 *   upsert: (args: { where: { name: string }; create: { name: string; stagingUrl: string }; update: unknown }) => Promise<{ id: string; name: string; createdAt: Date }>;
 * }} project
 */

/**
 * @param {BackfillPrismaClient} prisma
 * @param {{ logger?: (msg: string) => void }} [opts]
 */
export async function backfillProjectIds(prisma, opts = {}) {
  const log = opts.logger ?? (() => {});

  // 1. Distinct projectNames
  const rows = await prisma.feedbackItem.findMany({
    select: { projectName: true },
    distinct: ["projectName"],
  });
  const projectNames = rows.map((r) => r.projectName);
  log(`[backfill] Found ${projectNames.length} distinct project name(s)`);

  // 2. Upsert Project rows
  let projectsCreated = 0;
  const projectsByName = new Map();
  for (const name of projectNames) {
    const before = await prisma.project.upsert({
      where: { name },
      create: { name, stagingUrl: "" },
      update: {},
    });
    projectsByName.set(name, before.id);
    // `upsert` semantics: createdAt equals updatedAt → we treat it as a new row.
    if (before.createdAt instanceof Date && Math.abs(Date.now() - before.createdAt.getTime()) < 5_000) {
      projectsCreated += 1;
    }
  }

  // 3. Backfill FeedbackItem.projectId where null
  let feedbacksUpdated = 0;
  for (const [name, id] of projectsByName) {
    const { count } = await prisma.feedbackItem.updateMany({
      where: { projectName: name, projectId: null },
      data: { projectId: id },
    });
    feedbacksUpdated += count;
  }

  log(`[backfill] projectsCreated=${projectsCreated} projectsTotal=${projectNames.length} feedbacksUpdated=${feedbacksUpdated}`);
  return {
    projectsCreated,
    projectsTotal: projectNames.length,
    feedbacksUpdated,
  };
}

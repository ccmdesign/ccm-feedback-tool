import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The scheduled function itself instantiates a PrismaClient in its module
 * body which makes it awkward to unit-test without heavy mocking. The
 * relevant logic is already covered in the adapter-prisma review-dispatch
 * tests; this test is a structural smoke check that the function is wired
 * to run every 5 minutes and exports a default handler.
 */
describe("dispatch-retry scheduled function", () => {
  it("declares a 5-minute schedule in its Config export", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, "../dispatch-retry.mts"), "utf8");
    expect(src).toMatch(/schedule:\s*"\*\/5 \* \* \* \*"/);
  });

  it("calls processPendingReviewBatches with limit 10", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, "../dispatch-retry.mts"), "utf8");
    expect(src).toMatch(/processPendingReviewBatches/);
    expect(src).toMatch(/limit:\s*10/);
  });

  it("exits early when DATABASE_URL is unset", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, "../dispatch-retry.mts"), "utf8");
    expect(src).toMatch(/no-database-url/);
  });
});

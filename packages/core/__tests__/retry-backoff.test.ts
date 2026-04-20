import { describe, expect, it } from "vitest";
import { backoffDelay, nextAttemptAt, shouldStopRetry } from "../src/webhook/retry.js";

describe("backoffDelay", () => {
  it("attempt 0 centers at base (60s) with bounded jitter", () => {
    const d = backoffDelay(0, { rng: () => 0.5, jitterSeconds: 30 });
    expect(d).toBeCloseTo(60, 5);
  });

  it("attempt 5 clamps below the max (2^5 * 60 = 1920 < 3600)", () => {
    const d = backoffDelay(5, { rng: () => 0.5 });
    expect(d).toBeCloseTo(1920, 5);
  });

  it("high attempts clamp at max", () => {
    const d = backoffDelay(20, { rng: () => 0.5 });
    expect(d).toBeCloseTo(3600, 5);
  });

  it("jitter bounds are respected at the low end", () => {
    const d = backoffDelay(0, { rng: () => 0, jitterSeconds: 30 });
    expect(d).toBeCloseTo(30, 5);
  });

  it("jitter bounds are respected at the high end", () => {
    const d = backoffDelay(0, { rng: () => 1, jitterSeconds: 30 });
    expect(d).toBeCloseTo(90, 5);
  });

  it("never returns negative values even when jitter exceeds base", () => {
    const d = backoffDelay(0, { rng: () => 0, jitterSeconds: 1000, baseSeconds: 1 });
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it("rejects negative attempts", () => {
    expect(() => backoffDelay(-1)).toThrow();
  });
});

describe("shouldStopRetry", () => {
  const now = Date.now();

  it("freshly submitted with 0 attempts → keep retrying", () => {
    expect(shouldStopRetry({ submittedAt: new Date(now), attempts: 0, nowMs: now })).toBe(false);
  });

  it("stops at 10 attempts", () => {
    expect(shouldStopRetry({ submittedAt: new Date(now), attempts: 10, nowMs: now })).toBe(true);
  });

  it("stops at 24h elapsed regardless of attempts", () => {
    const oneDay = 24 * 60 * 60 * 1000;
    expect(
      shouldStopRetry({
        submittedAt: new Date(now - oneDay),
        attempts: 1,
        nowMs: now,
      }),
    ).toBe(true);
  });

  it("does not stop at 23h elapsed", () => {
    const justUnderADay = 23 * 60 * 60 * 1000;
    expect(
      shouldStopRetry({
        submittedAt: new Date(now - justUnderADay),
        attempts: 1,
        nowMs: now,
      }),
    ).toBe(false);
  });
});

describe("nextAttemptAt", () => {
  it("returns a Date strictly after 'now'", () => {
    const now = new Date("2026-04-20T00:00:00Z");
    const next = nextAttemptAt({ now, attempts: 0, options: { rng: () => 0.5 } });
    expect(next.getTime()).toBeGreaterThan(now.getTime());
    expect(next.getTime() - now.getTime()).toBeCloseTo(60_000, -3);
  });
});

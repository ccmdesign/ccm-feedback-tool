/**
 * CCM-284 — cleanup prompt regression tests.
 *
 * Two tiers:
 * 1. Message construction (always runs): no network. Asserts the cleanup
 *    messages are built from the constant system prompt + structured user
 *    block so the LLM receives a stable shape.
 * 2. Live cleanup (opt-in via CCM_TEST_LIVE_LLM=1): calls OpenRouter and
 *    compares against the fixture pairs. Skipped in CI by default; documented
 *    in docs/local-dev.md.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildCleanupMessages,
  CLEANUP_SYSTEM_PROMPT,
  createCleanupClient,
} from "../src/transcribe-clients.js";

interface FixturePair {
  name: string;
  raw: string;
  projectName: string;
  selector: string;
  surroundingText: string;
  expected: string;
}

const fixturesUrl = new URL("./fixtures/cleanup-known-bad.json", import.meta.url);
const fixtures = JSON.parse(readFileSync(fileURLToPath(fixturesUrl), "utf8")) as FixturePair[];

describe("cleanup prompt — message construction", () => {
  it("wraps the stable system prompt first", () => {
    const f = fixtures[0];
    if (!f) throw new Error("fixture missing");
    const msgs = buildCleanupMessages({
      rawText: f.raw,
      projectName: f.projectName,
      selector: f.selector,
      surroundingText: f.surroundingText,
    });
    expect(msgs[0]?.role).toBe("system");
    expect(msgs[0]?.content).toBe(CLEANUP_SYSTEM_PROMPT);
    // Critical directive stays in the prompt (regression guard on prompt drift).
    expect(CLEANUP_SYSTEM_PROMPT).toContain("remove disfluencies");
    expect(CLEANUP_SYSTEM_PROMPT).toContain("plain text with no quotes or framing");
  });

  it("passes context verbatim inside the user message", () => {
    const f = fixtures[0];
    if (!f) throw new Error("fixture missing");
    const msgs = buildCleanupMessages({
      rawText: f.raw,
      projectName: f.projectName,
      selector: f.selector,
      surroundingText: f.surroundingText,
    });
    expect(msgs[1]?.role).toBe("user");
    const user = msgs[1]?.content ?? "";
    expect(user).toContain(`raw_transcript: ${f.raw}`);
    expect(user).toContain(`project_name: ${f.projectName}`);
    expect(user).toContain(`selector: ${f.selector}`);
    expect(user).toContain(`surrounding_text: ${f.surroundingText}`);
  });

  it("accepts empty context fields without blowing up", () => {
    const msgs = buildCleanupMessages({
      rawText: "hi",
      projectName: "",
      selector: "",
      surroundingText: "",
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[1]?.content).toContain("raw_transcript: hi");
    expect(msgs[1]?.content).toContain("selector: ");
  });

  it("covers every fixture entry", () => {
    // The fixture file exists, is non-empty, and each entry has the shape
    // the live-tier test expects. Keeps the JSON honest if someone edits it.
    expect(fixtures.length).toBeGreaterThan(0);
    for (const f of fixtures) {
      expect(f.raw).toBeTruthy();
      expect(f.expected).toBeTruthy();
      expect(f.name).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Live tier — opt-in via CCM_TEST_LIVE_LLM=1. Skipped in CI by default.
// ---------------------------------------------------------------------------

const LIVE = process.env.CCM_TEST_LIVE_LLM === "1";

// `describe.skipIf` keeps the test tree honest when the env is off.
describe.skipIf(!LIVE)("cleanup prompt — live OpenRouter call (CCM_TEST_LIVE_LLM=1)", () => {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  const client = createCleanupClient({
    apiKey,
    model: process.env.CCM_CLEANUP_MODEL ?? "deepseek/deepseek-chat-v3.1:free",
  });

  for (const f of fixtures) {
    it(`cleans: ${f.name}`, async () => {
      if (!apiKey) throw new Error("CCM_TEST_LIVE_LLM=1 requires OPENROUTER_API_KEY");
      const cleaned = await client.clean({
        rawText: f.raw,
        projectName: f.projectName,
        selector: f.selector,
        surroundingText: f.surroundingText,
      });
      // Live LLM output is non-deterministic; we assert on shape, not exact bytes.
      expect(cleaned.toLowerCase()).not.toContain(" um ");
      expect(cleaned.toLowerCase()).not.toContain(" uh ");
      expect(cleaned.toLowerCase()).not.toContain(" you know");
      expect(cleaned.length).toBeGreaterThan(0);
    }, 20_000);
  }
});

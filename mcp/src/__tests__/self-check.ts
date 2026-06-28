/**
 * Offline self-check for ccm-feedback-mcp.
 *
 * Exercises the pure row-mapping / payload / query helpers AND the PostgrestClient
 * request shapes with a MOCKED global fetch — no live Supabase required. Run via
 * `npm test` (node --test + tsx).
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { buildListQuery, buildReplyPayload, buildUpdatePayload, PostgrestClient, rowToRecord } from "../postgrest.js";
import type { CloudRow, ParentInheritedFields } from "../types.js";

const SUPABASE_URL = "https://example.supabase.co";
const ANON_KEY = "anon-key-123";
const ENDPOINT = `${SUPABASE_URL}/rest/v1/ccm_widget_annotations`;

/** A minimal complete row for mapping assertions. */
function baseRow(overrides: Partial<CloudRow> = {}): CloudRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    project_name: "demo",
    message: "hello",
    author_name: "Reviewer",
    url: "https://site.test/page",
    path: "/page",
    viewport: "1280x800",
    user_agent: "Mozilla/5.0",
    css_selector: "#main > p",
    xpath: "/html/body/p",
    text_snippet: "snippet",
    element_tag: "p",
    element_id: null,
    text_prefix: "pre",
    text_suffix: "suf",
    fingerprint: "fp",
    neighbor_text: "neighbor",
    x_pct: 0.1,
    y_pct: 0.2,
    w_pct: 0.3,
    h_pct: 0.4,
    created_at: "2026-06-28T00:00:00.000Z",
    ...overrides,
  };
}

const PARENT: ParentInheritedFields = {
  project_name: "demo",
  url: "https://site.test/page",
  path: "/page",
  viewport: "1280x800",
  user_agent: "Mozilla/5.0",
};

/** A captured fetch call. */
interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

const realFetch = globalThis.fetch;

/**
 * Install a typed fetch mock. `respond` returns the JSON body for each call;
 * captured calls are pushed to `calls`.
 */
function installFetchMock(respond: (call: Captured) => unknown): Captured[] {
  const calls: Captured[] = [];
  const mock: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const rawBody = init?.body;
    const body = typeof rawBody === "string" ? JSON.parse(rawBody) : undefined;
    const call: Captured = { url, method: init?.method ?? "GET", headers, body };
    calls.push(call);
    const payload = respond(call);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  globalThis.fetch = mock;
  return calls;
}

beforeEach(() => {
  globalThis.fetch = realFetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

// ---------------------------------------------------------------------------
// rowToRecord
// ---------------------------------------------------------------------------

test("rowToRecord maps snake_case to camelCase and applies status/kind defaults", () => {
  const rec = rowToRecord(baseRow());
  assert.equal(rec.projectName, "demo");
  assert.equal(rec.authorName, "Reviewer");
  assert.equal(rec.userAgent, "Mozilla/5.0");
  assert.equal(rec.cssSelector, "#main > p");
  assert.equal(rec.textSnippet, "snippet");
  assert.equal(rec.status, "todo", "status defaults to todo when null/absent");
  assert.equal(rec.kind, "target", "kind defaults to target when null/absent");
  assert.equal(rec.xPct, 0.1);
  assert.equal(rec.elementId, undefined, "null element_id maps to undefined");
});

test("rowToRecord includes parentId and sequenceNumber only when present", () => {
  const topLevel = rowToRecord(baseRow());
  assert.equal("parentId" in topLevel, false);
  assert.equal("sequenceNumber" in topLevel, false);

  const reply = rowToRecord(baseRow({ parent_id: "22222222-2222-2222-2222-222222222222", sequence_number: 7 }));
  assert.equal(reply.parentId, "22222222-2222-2222-2222-222222222222");
  assert.equal(reply.sequenceNumber, 7);
});

test("rowToRecord includes pin/area only when their full set is non-null", () => {
  const noPin = rowToRecord(baseRow({ pin_x: 10 })); // pin_y missing
  assert.equal("pinX" in noPin, false, "pin requires both x and y");

  const withPin = rowToRecord(baseRow({ pin_x: 10, pin_y: 20 }));
  assert.equal(withPin.pinX, 10);
  assert.equal(withPin.pinY, 20);

  const partialArea = rowToRecord(baseRow({ area_x: 1, area_y: 2, area_w: 3 })); // area_h missing
  assert.equal("areaX" in partialArea, false, "area requires all four");

  const withArea = rowToRecord(baseRow({ area_x: 1, area_y: 2, area_w: 3, area_h: 4 }));
  assert.equal(withArea.areaW, 3);
  assert.equal(withArea.areaH, 4);
});

// ---------------------------------------------------------------------------
// payload + query builders
// ---------------------------------------------------------------------------

test("buildReplyPayload sets parent_id, inherits parent fields, omits status/kind/sequence", () => {
  const payload = buildReplyPayload("PARENT-ID", PARENT, "agent says hi", "Agent");
  assert.equal(payload.parent_id, "PARENT-ID");
  assert.equal(payload.message, "agent says hi");
  assert.equal(payload.author_name, "Agent");
  assert.equal(payload.project_name, "demo");
  assert.equal(payload.url, "https://site.test/page");
  assert.equal(payload.path, "/page");
  assert.equal(payload.viewport, "1280x800");
  assert.equal(payload.user_agent, "Mozilla/5.0");
  assert.equal("status" in payload, false, "replies carry no status");
  assert.equal("kind" in payload, false, "replies carry no kind");
  assert.equal("sequence_number" in payload, false, "server trigger assigns sequence_number");
});

test("buildUpdatePayload includes only supplied keys", () => {
  assert.deepEqual(buildUpdatePayload({ message: "edited" }), { message: "edited" });
  assert.deepEqual(buildUpdatePayload({ status: "review" }), { status: "review" });
  assert.deepEqual(buildUpdatePayload({ message: "edited", status: "done" }), {
    message: "edited",
    status: "done",
  });
  assert.deepEqual(buildUpdatePayload({}), {}, "no fields => empty payload");
});

test("buildListQuery encodes project and adds pending filters only when requested", () => {
  const all = buildListQuery({ project: "my project", pendingOnly: false });
  assert.ok(all.includes("project_name=eq.my%20project"), "project is URL-encoded");
  assert.ok(all.includes("order=created_at.desc"));
  assert.equal(all.includes("status=eq.todo"), false);
  assert.equal(all.includes("parent_id=is.null"), false);

  const pending = buildListQuery({ project: "demo", pendingOnly: true });
  assert.ok(pending.includes("status=eq.todo"));
  assert.ok(pending.includes("parent_id=is.null"));
  assert.ok(pending.includes("order=created_at.desc"));
});

// ---------------------------------------------------------------------------
// PostgrestClient request shapes (mocked fetch)
// ---------------------------------------------------------------------------

test("PostgrestClient.list issues a GET with anon headers and maps rows", async () => {
  const calls = installFetchMock(() => [baseRow(), baseRow({ id: "row-2" })]);
  const client = new PostgrestClient({ url: SUPABASE_URL, apiKey: ANON_KEY });

  const records = await client.list("demo", false);
  assert.equal(records.length, 2);
  assert.equal(records[0]?.projectName, "demo");

  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.method, "GET");
  assert.ok(call.url.startsWith(`${ENDPOINT}?`));
  assert.ok(call.url.includes("project_name=eq.demo"));
  assert.equal(call.headers.apikey, ANON_KEY);
  assert.equal(call.headers.Authorization, `Bearer ${ANON_KEY}`);
});

test("PostgrestClient.list with pendingOnly adds the todo + top-level filters", async () => {
  const calls = installFetchMock(() => []);
  const client = new PostgrestClient({ url: SUPABASE_URL, apiKey: ANON_KEY });

  await client.list("demo", true);
  const call = calls[0];
  assert.ok(call);
  assert.ok(call.url.includes("status=eq.todo"));
  assert.ok(call.url.includes("parent_id=is.null"));
});

test("PostgrestClient.update issues a PATCH to ?id=eq.<id> with the payload", async () => {
  const calls = installFetchMock(() => [baseRow({ status: "review" })]);
  const client = new PostgrestClient({ url: SUPABASE_URL, apiKey: ANON_KEY });

  const updated = await client.update("the-id", buildUpdatePayload({ status: "review" }));
  assert.equal(updated.length, 1);
  assert.equal(updated[0]?.status, "review");

  const call = calls[0];
  assert.ok(call);
  assert.equal(call.method, "PATCH");
  assert.equal(call.url, `${ENDPOINT}?id=eq.the-id`);
  assert.deepEqual(call.body, { status: "review" });
});

test("reply flow: getParentFields GET then insertReply POST with inherited fields", async () => {
  const calls = installFetchMock((call) => {
    if (call.method === "GET") return [PARENT];
    return [baseRow({ parent_id: "the-id", sequence_number: 3, message: "agent reply" })];
  });
  const client = new PostgrestClient({ url: SUPABASE_URL, apiKey: ANON_KEY });

  const parent = await client.getParentFields("the-id");
  assert.ok(parent);
  assert.equal(parent.project_name, "demo");

  const payload = buildReplyPayload("the-id", parent, "agent reply", "Agent");
  const inserted = await client.insertReply(payload);
  assert.equal(inserted[0]?.parentId, "the-id");

  // First call: parent lookup GET with a select projection.
  const getCall = calls[0];
  assert.ok(getCall);
  assert.equal(getCall.method, "GET");
  assert.ok(getCall.url.includes("id=eq.the-id"));
  assert.ok(getCall.url.includes("select=project_name,url,path,viewport,user_agent"));

  // Second call: reply POST carrying the inherited fields and parent_id.
  const postCall = calls[1];
  assert.ok(postCall);
  assert.equal(postCall.method, "POST");
  assert.equal(postCall.url, ENDPOINT);
  assert.deepEqual(postCall.body, {
    parent_id: "the-id",
    message: "agent reply",
    author_name: "Agent",
    project_name: "demo",
    url: "https://site.test/page",
    path: "/page",
    viewport: "1280x800",
    user_agent: "Mozilla/5.0",
  });
});

test("getParentFields returns null when no parent row matches", async () => {
  installFetchMock(() => []);
  const client = new PostgrestClient({ url: SUPABASE_URL, apiKey: ANON_KEY });
  const parent = await client.getParentFields("missing");
  assert.equal(parent, null);
});

test("close semantics: a review PATCH never sets done", () => {
  const payload = buildUpdatePayload({ status: "review" });
  assert.equal(payload.status, "review");
  assert.notEqual(payload.status, "done", "agents must never flip to done");
});

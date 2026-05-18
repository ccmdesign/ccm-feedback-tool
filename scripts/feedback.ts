#!/usr/bin/env bun
/**
 * ccm-feedback CLI — list / get / create / set-status / delete annotations
 * against a Supabase project, speaking raw PostgREST. No @supabase/supabase-js,
 * no new dependency — mirrors the widget's CloudStore posture exactly.
 *
 * Primary use: `feedback set-status <id> review` — the agent loop's close.
 * The agent sets `review`, NEVER `done`. `done` is a human-only transition;
 * this CLI accepts `done` because humans/scripts may legitimately use it, but
 * agent-facing surfaces (the apply-ccm-feedback skill, the prompts) only ever
 * pass `review`.
 *
 * Runtime: Bun (`bun run scripts/feedback.ts` / `bun run feedback`). Uses
 * top-level await and process.env directly — no build step.
 *
 * Config resolution (both URL and key required):
 *   - SUPABASE_URL / SUPABASE_ANON_KEY from the environment, OR
 *   - --url / --key flags (override env).
 * The maintainer's gitignored `.env` (see .env.example) supplies these for the
 * demo project. `bun run feedback …` loads `.env` via Bun's package-script env
 * loading; if you invoke the file directly, export the vars or pass --url/--key.
 */

const TABLE = "ccm_widget_annotations";
const VALID_STATUSES = ["todo", "review", "done", "question"] as const;
type Status = (typeof VALID_STATUSES)[number];

interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const positionals: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token === undefined) continue;
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq !== -1) {
        flags[token.slice(2, eq)] = token.slice(eq + 1);
      } else {
        const next = rest[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          flags[token.slice(2)] = next;
          i++;
        } else {
          flags[token.slice(2)] = "true";
        }
      }
    } else {
      positionals.push(token);
    }
  }
  return { command, positionals, flags };
}

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

const USAGE = `ccm-feedback CLI — raw PostgREST against Supabase.

Usage:
  bun run feedback <command> [args] [--url URL] [--key KEY]

Commands:
  list [--project P] [--status S] [--path PATH]
        List annotations (newest first). Optional filters.
  get <id>
        Print one annotation as pretty JSON.
  create --project P --message M --page-url U [--path PATH] [--status S] [--author A]
        Insert a minimal annotation. status defaults to "todo".
        --page-url is the annotated page's URL (distinct from the Supabase
        --url config flag, which always points at the Supabase project).
  set-status <id> <todo|review|done|question>
        Update an annotation's status. PRIMARY command for the agent loop.
        Agents pass "review" only — never "done" (human-only transition).
  delete <id>
        Delete an annotation.

Config (both required, same for every command):
  SUPABASE_URL / SUPABASE_ANON_KEY env vars, or --url / --key flags.
  The maintainer's .env (see .env.example) supplies these for the demo project.`;

function resolveConfig(flags: Record<string, string>): { url: string; key: string } {
  const url = flags.url ?? process.env.SUPABASE_URL ?? "";
  const key = flags.key ?? process.env.SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push("SUPABASE_URL (or --url)");
    if (!key) missing.push("SUPABASE_ANON_KEY (or --key)");
    fail(
      `missing config: ${missing.join(", ")}. ` +
        `Set the env vars (the maintainer's .env documents them — see .env.example) ` +
        `or pass --url/--key.`,
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}

function buildHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

/** PostgREST request. Never prints the key; surfaces upstream status + body. */
async function request(url: string, init: RequestInit & { headers: Record<string, string> }): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    fail(`network error: ${err instanceof Error ? err.message : String(err)}`);
  }
  const text = await res.text();
  if (!res.ok) {
    fail(`Supabase responded ${res.status}: ${text || "(empty body)"}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
}

interface AnnotationRow {
  id: string;
  status?: string | null;
  path?: string | null;
  message?: string | null;
}

async function cmdList(
  endpoint: string,
  headers: Record<string, string>,
  flags: Record<string, string>,
): Promise<void> {
  const params = new URLSearchParams();
  if (flags.project) params.set("project_name", `eq.${flags.project}`);
  if (flags.status) params.set("status", `eq.${flags.status}`);
  if (flags.path) params.set("path", `eq.${flags.path}`);
  params.set("order", "created_at.desc");
  const rows = (await request(`${endpoint}?${params.toString()}`, { headers })) as AnnotationRow[];
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("(no annotations)");
    return;
  }
  for (const r of rows) {
    const status = (r.status ?? "todo").padEnd(8);
    const path = (r.path ?? "").padEnd(20);
    console.log(`${r.id}  ${status}  ${path}  ${truncate(r.message ?? "", 60)}`);
  }
  console.log(`\n${rows.length} annotation(s)`);
}

async function cmdGet(endpoint: string, headers: Record<string, string>, id: string): Promise<void> {
  const rows = (await request(`${endpoint}?id=eq.${encodeURIComponent(id)}`, { headers })) as unknown[];
  if (!Array.isArray(rows) || rows.length === 0) {
    fail(`no annotation with id ${id}`);
  }
  console.log(JSON.stringify(rows[0], null, 2));
}

async function cmdCreate(
  endpoint: string,
  headers: Record<string, string>,
  flags: Record<string, string>,
): Promise<void> {
  const project = flags.project;
  const message = flags.message;
  const pageUrl = flags["page-url"];
  if (!project || !message || !pageUrl) {
    fail("create requires --project, --message and --page-url");
  }
  const status = flags.status ?? "todo";
  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    fail(`invalid --status "${status}". Valid: ${VALID_STATUSES.join(", ")}`);
  }
  // Minimal row satisfying the NOT NULL columns from 0001/0002. Empty anchor
  // strings mirror buildRecord()'s shape for a non-DOM-anchored record.
  const now = new Date().toISOString();
  const row = {
    project_name: project,
    message,
    author_name: flags.author ?? "CLI",
    url: pageUrl,
    path: flags.path ?? "/",
    viewport: "",
    user_agent: "ccm-feedback-cli",
    css_selector: "",
    xpath: "",
    text_snippet: "",
    element_tag: "",
    element_id: null,
    text_prefix: "",
    text_suffix: "",
    fingerprint: "",
    neighbor_text: "",
    x_pct: 0,
    y_pct: 0,
    w_pct: 0,
    h_pct: 0,
    created_at: now,
    status,
    kind: "target",
  };
  const result = (await request(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(row),
  })) as unknown[];
  console.log(JSON.stringify(Array.isArray(result) ? result[0] : result, null, 2));
}

async function cmdSetStatus(endpoint: string, headers: Record<string, string>, positionals: string[]): Promise<void> {
  const [id, status] = positionals;
  if (!id || !status) {
    fail("set-status requires <id> <todo|review|done|question>");
  }
  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    fail(`invalid status "${status}". Valid values: ${VALID_STATUSES.join(", ")}`);
  }
  const result = (await request(`${endpoint}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: status as Status }),
  })) as unknown[];
  if (!Array.isArray(result) || result.length === 0) {
    fail(`no annotation with id ${id} (nothing updated)`);
  }
  console.log(`ok: ${id} → status="${status}"`);
}

async function cmdDelete(endpoint: string, headers: Record<string, string>, id: string): Promise<void> {
  const result = (await request(`${endpoint}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  })) as unknown[];
  if (!Array.isArray(result) || result.length === 0) {
    fail(`no annotation with id ${id} (nothing deleted)`);
  }
  console.log(`ok: deleted ${id}`);
}

async function main(): Promise<void> {
  const { command, positionals, flags } = parseArgs(process.argv.slice(2));

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(USAGE);
    process.exit(command ? 0 : 1);
  }

  const { url, key } = resolveConfig(flags);
  const endpoint = `${url}/rest/v1/${TABLE}`;
  const headers = buildHeaders(key);

  switch (command) {
    case "list":
      await cmdList(endpoint, headers, flags);
      break;
    case "get": {
      const id = positionals[0];
      if (!id) fail("get requires <id>");
      await cmdGet(endpoint, headers, id);
      break;
    }
    case "create":
      await cmdCreate(endpoint, headers, flags);
      break;
    case "set-status":
      await cmdSetStatus(endpoint, headers, positionals);
      break;
    case "delete": {
      const id = positionals[0];
      if (!id) fail("delete requires <id>");
      await cmdDelete(endpoint, headers, id);
      break;
    }
    default:
      fail(`unknown command "${command}". Run with --help for usage.`);
  }
}

await main();

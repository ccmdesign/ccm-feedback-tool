/**
 * GET /feedback?project=<name>
 *
 * Serves a project's ccm-feedback annotations as JSON in the exact shape of
 * the widget's exportAsJson() payload, so the apply-ccm-feedback skill's
 * "fetch a URL" path and the "attach a downloaded file" path are byte-
 * identical to consumers.
 *
 * Security posture:
 *  - Reads SUPABASE_URL + SUPABASE_ANON_KEY from server-side Netlify env ONLY.
 *    The anon key is never returned to the client and never inlined into any
 *    client asset (w.js). The service-role key is NEVER used here.
 *  - Read-only: only GET (+ OPTIONS preflight). No POST/PATCH/DELETE; the
 *    function never accepts a key from the client.
 *  - Errors are generic — the upstream Supabase body (which could echo the
 *    key on an auth error) is never forwarded to the caller.
 *
 * Row → record mapping duplicates rowToRecord() from src/cloud-store.ts. The
 * widget source is browser/IIFE and not cleanly importable into a Netlify
 * function, so the ~25-field snake_case→camelCase rename lives here as a small
 * server-side transform (kept in sync with cloud-store.ts by hand).
 */

const TABLE = "ccm_widget_annotations";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface CloudRow {
  id: string;
  project_name: string;
  message: string;
  author_name: string;
  url: string;
  path: string;
  viewport: string;
  user_agent: string;
  css_selector: string;
  xpath: string;
  text_snippet: string;
  element_tag: string;
  element_id: string | null;
  text_prefix: string;
  text_suffix: string;
  fingerprint: string;
  neighbor_text: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  created_at: string;
  status?: string | null;
  kind?: string | null;
  pin_x?: number | null;
  pin_y?: number | null;
  area_x?: number | null;
  area_y?: number | null;
  area_w?: number | null;
  area_h?: number | null;
  captured_elements?: unknown[] | null;
}

/** Mirrors rowToRecord() in src/cloud-store.ts. */
function rowToRecord(row: CloudRow): Record<string, unknown> {
  const record: Record<string, unknown> = {
    id: row.id,
    projectName: row.project_name,
    message: row.message,
    authorName: row.author_name,
    url: row.url,
    path: row.path,
    viewport: row.viewport,
    userAgent: row.user_agent,
    cssSelector: row.css_selector,
    xpath: row.xpath,
    textSnippet: row.text_snippet,
    elementTag: row.element_tag,
    elementId: row.element_id ?? undefined,
    textPrefix: row.text_prefix,
    textSuffix: row.text_suffix,
    fingerprint: row.fingerprint,
    neighborText: row.neighbor_text,
    xPct: row.x_pct,
    yPct: row.y_pct,
    wPct: row.w_pct,
    hPct: row.h_pct,
    createdAt: row.created_at,
    status: row.status ?? "todo",
    kind: row.kind ?? "target",
  };
  if (row.pin_x != null && row.pin_y != null) {
    record.pinX = row.pin_x;
    record.pinY = row.pin_y;
  }
  if (row.area_x != null && row.area_y != null && row.area_w != null && row.area_h != null) {
    record.areaX = row.area_x;
    record.areaY = row.area_y;
    record.areaW = row.area_w;
    record.areaH = row.area_h;
  }
  if (row.captured_elements && Array.isArray(row.captured_elements)) {
    record.capturedElements = row.captured_elements;
  }
  return record;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "GET") {
    return json(405, { error: "Method not allowed. Use GET." });
  }

  const project = new URL(req.url).searchParams.get("project");
  if (!project?.trim()) {
    return json(400, { error: "Missing required query parameter: ?project=<name>" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    // Generic — never name which var or echo any value.
    console.error("[feedback fn] SUPABASE_URL / SUPABASE_ANON_KEY env not configured");
    return json(500, { error: "Server is not configured to serve feedback." });
  }

  const endpoint =
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${TABLE}` +
    `?project_name=eq.${encodeURIComponent(project)}&order=created_at.desc`;

  let rows: CloudRow[];
  try {
    const res = await fetch(endpoint, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) {
      // Do NOT forward res.text() — an auth error body can contain the key.
      console.error(`[feedback fn] upstream ${res.status}`);
      return json(502, { error: "Upstream feedback store error." });
    }
    rows = (await res.json()) as CloudRow[];
  } catch (err) {
    console.error("[feedback fn] upstream fetch failed", err);
    return json(502, { error: "Upstream feedback store error." });
  }

  const annotations = Array.isArray(rows) ? rows.map(rowToRecord) : [];
  return json(200, {
    projectName: project,
    exportedAt: new Date().toISOString(),
    count: annotations.length,
    annotations,
  });
}

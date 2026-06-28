/**
 * Raw PostgREST adapter for the ccm-feedback MCP server.
 *
 * Speaks PostgREST over the global `fetch` with the anon-key header pair, exactly
 * mirroring how `src/cloud-store.ts` (`:233-238`) authenticates. No
 * `@supabase/supabase-js` dependency. The pure helpers (`rowToRecord`, the
 * payload builders, the query builders) are side-effect-free so the self-check
 * can import and assert them without touching the network.
 */

import type { AnnotationRecord, CloudRow, FeedbackStatus, ParentInheritedFields } from "./types.js";

export const TABLE = "ccm_widget_annotations";

/** PostgREST anon-key headers. Mirrors `src/cloud-store.ts` CloudStore.headers. */
export function buildHeaders(apiKey: string): Record<string, string> {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * snake_case → camelCase mapping. Hand-mirror of `rowToRecord()` in
 * `netlify/functions/feedback.mts`. Keep aligned when columns change.
 */
export function rowToRecord(row: CloudRow): AnnotationRecord {
  const record: AnnotationRecord = {
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
  if (row.parent_id) record.parentId = row.parent_id;
  if (typeof row.sequence_number === "number") record.sequenceNumber = row.sequence_number;
  return record;
}

/**
 * Build the query string for list / pending reads.
 *
 * `pendingOnly` adds `status=eq.todo` and `parent_id=is.null` (top-level,
 * unhandled comments only). The project name is URL-encoded.
 */
export function buildListQuery(opts: { project: string; pendingOnly: boolean }): string {
  const params = [`project_name=eq.${encodeURIComponent(opts.project)}`];
  if (opts.pendingOnly) {
    params.push("status=eq.todo", "parent_id=is.null");
  }
  params.push("order=created_at.desc");
  return params.join("&");
}

/** A reply payload row. Mirrors `buildReplyRecord` in `src/store.ts:265`. */
export interface ReplyPayload {
  parent_id: string;
  message: string;
  author_name: string;
  project_name: string;
  url: string;
  path: string;
  viewport: string;
  user_agent: string;
}

/**
 * Build a degenerate reply row bound to `parentId`, inheriting the parent's
 * project / url / path / viewport / user_agent (so the DB NOT NULL on
 * `project_name` / `url` is satisfied). Anchor / rect fields are left at their
 * column defaults; `status` / `kind` are deliberately omitted (meaningless for
 * replies). `sequence_number` is NOT sent — the server trigger assigns it
 * (mirrors `buildReplyRecord` in `src/store.ts` and `recordToRow` in
 * `src/cloud-store.ts`).
 */
export function buildReplyPayload(
  parentId: string,
  parent: ParentInheritedFields,
  message: string,
  authorName: string,
): ReplyPayload {
  return {
    parent_id: parentId,
    message,
    author_name: authorName,
    project_name: parent.project_name,
    url: parent.url,
    path: parent.path,
    viewport: parent.viewport,
    user_agent: parent.user_agent,
  };
}

/** An update (PATCH) payload — only the supplied fields are included. */
export interface UpdatePayload {
  message?: string;
  status?: FeedbackStatus;
}

/**
 * Build a PATCH payload containing only the fields the caller supplied. Honors
 * `exactOptionalPropertyTypes` — a key is present only when its value is defined.
 */
export function buildUpdatePayload(input: { message?: string; status?: FeedbackStatus }): UpdatePayload {
  const payload: UpdatePayload = {};
  if (input.message !== undefined) payload.message = input.message;
  if (input.status !== undefined) payload.status = input.status;
  return payload;
}

export interface PostgrestClientOptions {
  url: string;
  apiKey: string;
}

/** Thin PostgREST client: the only module surface that touches the network. */
export class PostgrestClient {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(opts: PostgrestClientOptions) {
    this.endpoint = `${opts.url.replace(/\/$/, "")}/rest/v1/${TABLE}`;
    this.headers = buildHeaders(opts.apiKey);
  }

  /** GET comments for a project. `pendingOnly` restricts to top-level todo rows. */
  async list(project: string, pendingOnly: boolean): Promise<AnnotationRecord[]> {
    const res = await fetch(`${this.endpoint}?${buildListQuery({ project, pendingOnly })}`, {
      method: "GET",
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`PostgREST list failed: ${res.status} ${await safeBody(res)}`);
    const rows = (await res.json()) as CloudRow[];
    return Array.isArray(rows) ? rows.map(rowToRecord) : [];
  }

  /** PATCH a single comment by id with the supplied fields. Returns updated rows. */
  async update(id: string, payload: UpdatePayload): Promise<AnnotationRecord[]> {
    const res = await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...this.headers, Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`PostgREST update failed: ${res.status} ${await safeBody(res)}`);
    const rows = (await res.json()) as CloudRow[];
    return Array.isArray(rows) ? rows.map(rowToRecord) : [];
  }

  /** Fetch the inheritable fields of a parent comment (for replies). */
  async getParentFields(id: string): Promise<ParentInheritedFields | null> {
    const select = "select=project_name,url,path,viewport,user_agent";
    const res = await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(id)}&${select}`, {
      method: "GET",
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`PostgREST parent lookup failed: ${res.status} ${await safeBody(res)}`);
    const rows = (await res.json()) as ParentInheritedFields[];
    return Array.isArray(rows) && rows.length > 0 ? (rows[0] ?? null) : null;
  }

  /** POST a reply row. Caller must have resolved the parent fields first. */
  async insertReply(payload: ReplyPayload): Promise<AnnotationRecord[]> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { ...this.headers, Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`PostgREST reply insert failed: ${res.status} ${await safeBody(res)}`);
    const rows = (await res.json()) as CloudRow[];
    return Array.isArray(rows) ? rows.map(rowToRecord) : [];
  }
}

/** Read a response body for error context without throwing. */
async function safeBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}

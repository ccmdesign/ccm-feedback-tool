import { RealtimeClient } from "./realtime.js";
import {
  type AnnotationStore,
  buildRecord,
  buildReplyRecord,
  normalizePath,
  type ReplyInput,
  type SaveInput,
  type UpdateAnchorInput,
} from "./store.js";
import type { AnnotationKind, AnnotationRecord, CapturedElement, FeedbackStatus } from "./types.js";

/**
 * Cloud-backed store using Supabase PostgREST. No SDK dependency — raw fetch.
 *
 * Strategy: cache-and-sync. `init()` loads all records for the project into
 * an in-memory cache. Subsequent `list*`/`save`/`delete` operate against the
 * cache so the calling widget code stays synchronous, and writes fire-and-
 * forget against the network. On network failure, the local cache stays
 * consistent and a `console.warn` is logged.
 */

interface CloudStoreOptions {
  url: string;
  apiKey: string;
  projectName: string;
  onChange?: () => void;
  /**
   * Fired when a reply row arrives over realtime (a remote reviewer
   * commented, or our own insert echoed back). Replies do NOT trigger
   * onChange — they don't affect markers or the drawer's top-level list;
   * the popover subscribes to feedback:replied via the bus.
   */
  onReply?: (record: AnnotationRecord) => void;
  /**
   * Fired when a reply row is deleted over realtime. Covers both direct
   * deletes and cascade deletes from a parent removal. Like onReply, this
   * deliberately bypasses onChange.
   */
  onReplyDeleted?: (id: string) => void;
  /**
   * Fired when a top-level (non-reply) row arrives via realtime UPDATE so
   * host integrations on the receiving tab see anchor/status updates as
   * `feedback:updated` events (PRO-67). `onChange` is the cache-fanout
   * hook; `onUpdated` is the bus-emit hook. Optional — bypassed when not
   * wired.
   */
  onUpdated?: (record: AnnotationRecord) => void;
  log?: (...args: unknown[]) => void;
}

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
  status?: FeedbackStatus | null;
  kind?: AnnotationKind | null;
  pin_x?: number | null;
  pin_y?: number | null;
  area_x?: number | null;
  area_y?: number | null;
  area_w?: number | null;
  area_h?: number | null;
  captured_elements?: CapturedElement[] | null;
  parent_id?: string | null;
  /** PRO-68 §8 — project-scoped monotonic identifier. Server-assigned by the
   * `ccm_widget_assign_sequence` BEFORE INSERT trigger; the client may
   * supply a value for optimistic UI but the server is authoritative. */
  sequence_number?: number | null;
}

const TABLE = "ccm_widget_annotations";

/**
 * Parse a PostgREST `Content-Range` response header like "0-0/1", "*\/0", or
 * "0-2/3" and return the affected-row count from the slash-N suffix.
 *
 * Returns null when the header is absent or unparseable; returns the integer
 * count otherwise (including 0 for "*\/0"). Used by UPDATE/DELETE/CLEAR paths
 * to detect silent zero-row writes that PostgREST otherwise reports as 200 OK
 * (e.g. when an RLS policy blocks the row). See PRO-65.
 */
function parseContentRangeCount(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const slash = headerValue.lastIndexOf("/");
  if (slash === -1) return null;
  const tail = headerValue.slice(slash + 1).trim();
  if (tail === "" || tail === "*") return null;
  const n = Number(tail);
  return Number.isFinite(n) ? n : null;
}

function rowToRecord(row: CloudRow): AnnotationRecord {
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
  // Conditional set: exactOptionalPropertyTypes forbids assigning `undefined`
  // to an optional field. Match the elementId / pin / area pattern above.
  if (row.parent_id) record.parentId = row.parent_id;
  if (typeof row.sequence_number === "number") record.sequenceNumber = row.sequence_number;
  return record;
}

function recordToRow(r: AnnotationRecord): CloudRow {
  const row: CloudRow = {
    id: r.id,
    project_name: r.projectName,
    message: r.message,
    author_name: r.authorName,
    url: r.url,
    path: r.path,
    viewport: r.viewport,
    user_agent: r.userAgent,
    css_selector: r.cssSelector,
    xpath: r.xpath,
    text_snippet: r.textSnippet,
    element_tag: r.elementTag,
    element_id: r.elementId ?? null,
    text_prefix: r.textPrefix,
    text_suffix: r.textSuffix,
    fingerprint: r.fingerprint,
    neighbor_text: r.neighborText,
    x_pct: r.xPct,
    y_pct: r.yPct,
    w_pct: r.wPct,
    h_pct: r.hPct,
    created_at: r.createdAt,
  };
  if (r.status) row.status = r.status;
  if (r.kind) row.kind = r.kind;
  if (r.pinX != null) row.pin_x = r.pinX;
  if (r.pinY != null) row.pin_y = r.pinY;
  if (r.areaX != null) row.area_x = r.areaX;
  if (r.areaY != null) row.area_y = r.areaY;
  if (r.areaW != null) row.area_w = r.areaW;
  if (r.areaH != null) row.area_h = r.areaH;
  if (r.capturedElements) row.captured_elements = r.capturedElements;
  // Omit parent_id entirely for top-level rows so the column default (NULL)
  // applies — emitting `parent_id: null` would work but adds insert-payload
  // noise for the common case.
  if (r.parentId) row.parent_id = r.parentId;
  // sequence_number: send the optimistic local guess so realtime echoes
  // carry the same number the local cache rendered with. The server trigger
  // ignores any supplied value when the column is null OR — more usefully —
  // accepts the supplied value when one is present (see migration 0007).
  // For the optimistic insert path the local guess and the trigger result
  // will usually match because the client is the only writer for the typical
  // single-reviewer session; in races the realtime UPDATE/INSERT carries the
  // authoritative number.
  if (typeof r.sequenceNumber === "number") row.sequence_number = r.sequenceNumber;
  return row;
}

export class CloudStore implements AnnotationStore {
  private cache: AnnotationRecord[] = [];
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly projectName: string;
  private readonly url: string;
  private readonly apiKey: string;
  private readonly onChange: () => void;
  private readonly onReply: (record: AnnotationRecord) => void;
  private readonly onReplyDeleted: (id: string) => void;
  private readonly onUpdated: (record: AnnotationRecord) => void;
  private readonly log: (...args: unknown[]) => void;
  private realtime: RealtimeClient | null = null;

  constructor(opts: CloudStoreOptions) {
    this.projectName = opts.projectName;
    this.url = opts.url;
    this.apiKey = opts.apiKey;
    this.onChange = opts.onChange ?? (() => {});
    this.onReply = opts.onReply ?? (() => {});
    this.onReplyDeleted = opts.onReplyDeleted ?? (() => {});
    this.onUpdated = opts.onUpdated ?? (() => {});
    this.log = opts.log ?? (() => {});
    this.endpoint = `${opts.url.replace(/\/$/, "")}/rest/v1/${TABLE}`;
    this.headers = {
      apikey: opts.apiKey,
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
  }

  /** Fetch all records for the current project. Resolves on success or failure (logs on failure). */
  async init(): Promise<void> {
    try {
      const url = `${this.endpoint}?project_name=eq.${encodeURIComponent(this.projectName)}&order=created_at.desc`;
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[ccm-feedback] cloud fetch failed: ${res.status} ${body}`);
        return;
      }
      const rows = (await res.json()) as CloudRow[];
      this.cache = rows.map(rowToRecord);
      this.log("cloud loaded", this.cache.length, "annotations");
      this.startRealtime();
    } catch (err) {
      console.warn("[ccm-feedback] cloud fetch error", err);
    }
  }

  private startRealtime(): void {
    if (this.realtime) return;
    this.realtime = new RealtimeClient({
      url: this.url,
      apiKey: this.apiKey,
      table: TABLE,
      filter: `project_name=eq.${this.projectName}`,
      log: this.log,
      onInsert: (raw) => {
        const row = raw as unknown as CloudRow;
        if (this.cache.some((r) => r.id === row.id)) return;
        const record = rowToRecord(row);
        if (record.parentId) {
          // Reply: push to cache (append — listReplies sorts on read) and
          // notify the popover via onReply. NEVER call onChange() — replies
          // don't change the marker set or the drawer's top-level list,
          // and a refresh() would flicker the page.
          this.cache.push(record);
          this.onReply(record);
          return;
        }
        this.cache.unshift(record);
        this.onChange();
      },
      onUpdate: (raw) => {
        const row = raw as unknown as CloudRow;
        const next = rowToRecord(row);
        const idx = this.cache.findIndex((r) => r.id === next.id);
        if (idx === -1) {
          this.cache.unshift(next);
        } else {
          this.cache[idx] = next;
        }
        // Replies are immutable in v1 — the widget never PATCHes a reply row.
        // An UPDATE here means an external operator edited a reply via SQL or
        // a future v2 edit-reply feature is in flight. Refresh the cache entry
        // (already done above) but skip onChange(): replies aren't markers and
        // aren't in the drawer's top-level list, so a marker refresh would
        // flicker the page for no visual gain.
        if (next.parentId) return;
        // Fan out the bus event before onChange so host integrations see the
        // update with the same timing as a marker re-render (PRO-67).
        this.onUpdated(next);
        this.onChange();
      },
      onDelete: (raw) => {
        const id = (raw as { id?: string }).id;
        if (!id) return;
        const idx = this.cache.findIndex((r) => r.id === id);
        if (idx === -1) return;
        const removed = this.cache[idx];
        this.cache.splice(idx, 1);
        if (removed?.parentId) {
          // Reply delete — could be a direct user delete on the reply or a
          // cascade DELETE from a parent removal (REPLICA IDENTITY FULL +
          // on-delete-cascade emits one event per cascaded child).
          this.onReplyDeleted(id);
          return;
        }
        this.onChange();
      },
    });
    this.realtime.connect();
  }

  destroy(): void {
    this.realtime?.destroy();
    this.realtime = null;
  }

  list(): AnnotationRecord[] {
    // Replies remain in the cache (one flat array) but never surface as
    // top-level comments. Markers / drawer / FAB count all go through
    // list() — filtering here is the single source of truth.
    return this.cache.filter((r) => !r.parentId);
  }

  listForPath(path: string): AnnotationRecord[] {
    const target = normalizePath(path);
    return this.cache.filter((r) => !r.parentId && normalizePath(r.path) === target);
  }

  save(input: SaveInput): AnnotationRecord {
    // Pass the in-memory cache so `buildRecord` can compute an optimistic
    // `sequenceNumber = max(cache) + 1`. The server trigger reconfirms /
    // overwrites authoritatively on INSERT; realtime echo carries the
    // canonical value. PRO-68 §8.
    const record = buildRecord(input, this.cache);
    this.cache.unshift(record);
    void this.pushInsert(record);
    return record;
  }

  updateStatus(id: string, status: FeedbackStatus): boolean {
    const item = this.cache.find((r) => r.id === id);
    if (!item) return false;
    item.status = status;
    void this.pushUpdate(id, { status });
    return true;
  }

  updateAnchor(id: string, input: UpdateAnchorInput): boolean {
    const item = this.cache.find((r) => r.id === id);
    if (!item) return false;
    // Optimistic cache mutation so the marker re-renders before the network
    // round-trip. Mirror Store.updateAnchor's slot rules (PRO-67).
    item.cssSelector = input.anchor.cssSelector;
    item.xpath = input.anchor.xpath;
    item.textSnippet = input.anchor.textSnippet;
    item.elementTag = input.anchor.elementTag;
    item.elementId = input.anchor.elementId;
    item.textPrefix = input.anchor.textPrefix;
    item.textSuffix = input.anchor.textSuffix;
    item.fingerprint = input.anchor.fingerprint;
    item.neighborText = input.anchor.neighborText;
    item.xPct = input.rect.xPct;
    item.yPct = input.rect.yPct;
    item.wPct = input.rect.wPct;
    item.hPct = input.rect.hPct;
    item.kind = input.kind;
    if (input.pin) {
      item.pinX = input.pin.x;
      item.pinY = input.pin.y;
    } else {
      delete item.pinX;
      delete item.pinY;
    }
    if (input.area) {
      item.areaX = input.area.x;
      item.areaY = input.area.y;
      item.areaW = input.area.w;
      item.areaH = input.area.h;
    } else {
      delete item.areaX;
      delete item.areaY;
      delete item.areaW;
      delete item.areaH;
    }

    // Build the PATCH payload. Always include the full anchor+rect+kind
    // group; pin/area columns are explicitly nulled when the new kind
    // doesn't use them so the row can't carry stale coords across a kind
    // transition.
    const patch: Partial<CloudRow> = {
      css_selector: input.anchor.cssSelector,
      xpath: input.anchor.xpath,
      text_snippet: input.anchor.textSnippet,
      element_tag: input.anchor.elementTag,
      element_id: input.anchor.elementId ?? null,
      text_prefix: input.anchor.textPrefix,
      text_suffix: input.anchor.textSuffix,
      fingerprint: input.anchor.fingerprint,
      neighbor_text: input.anchor.neighborText,
      x_pct: input.rect.xPct,
      y_pct: input.rect.yPct,
      w_pct: input.rect.wPct,
      h_pct: input.rect.hPct,
      kind: input.kind,
      pin_x: input.pin ? input.pin.x : null,
      pin_y: input.pin ? input.pin.y : null,
      area_x: input.area ? input.area.x : null,
      area_y: input.area ? input.area.y : null,
      area_w: input.area ? input.area.w : null,
      area_h: input.area ? input.area.h : null,
    };
    void this.pushUpdate(id, patch);
    return true;
  }

  delete(id: string): boolean {
    const idx = this.cache.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    // Mirror the DB cascade in the cache BEFORE the network call so any
    // popover currently rendering this parent's thread stops showing the
    // (about-to-be-deleted) replies immediately. Postgres on-delete-cascade
    // does the persistence side; realtime DELETE events for each cascaded
    // child stream back through onDelete and are no-ops here because the
    // cache has already dropped them.
    this.cache = this.cache.filter((r) => r.id !== id && r.parentId !== id);
    // pushDelete still targets the parent id only — Postgres cascades from
    // there. This keeps the PRO-65 count=exact assertion intact: one row,
    // one DELETE, one count.
    void this.pushDelete(id);
    return true;
  }

  clear(): void {
    const ids = this.cache.map((r) => r.id);
    this.cache = [];
    void this.pushClear(ids);
  }

  listReplies(parentId: string): AnnotationRecord[] {
    return this.cache.filter((r) => r.parentId === parentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  addReply(input: ReplyInput): AnnotationRecord {
    const record = buildReplyRecord(input);
    // Newest-last; listReplies sorts on read.
    this.cache.push(record);
    // Reuses pushInsert verbatim — recordToRow emits parent_id when set, so
    // the PostgREST payload carries the FK. PRO-65 left pushInsert untouched
    // (no count=exact assertion on INSERT — a failed insert is already a
    // non-2xx), so reply insert has zero PRO-65 regression surface.
    void this.pushInsert(record);
    return record;
  }

  /**
   * Bulk-import existing records (e.g. from a localStorage migration) into the
   * cloud, skipping any rows whose primary key already exists. Returns the
   * count of newly-inserted records. On any error, returns 0 and logs.
   */
  async migrateFromLocal(records: AnnotationRecord[]): Promise<number> {
    if (records.length === 0) return 0;
    const known = new Set(this.cache.map((r) => r.id));
    const fresh = records.filter((r) => !known.has(r.id));
    if (fresh.length === 0) return 0;
    try {
      // PRO-68 §8 — drop client-side `sequence_number` from migration
      // payloads. Pre-migration local numbers were render-indices, not
      // canonical identifiers; the server trigger assigns fresh authoritative
      // values that interleave correctly with any existing cloud rows for the
      // same project.
      const payload = fresh.map((r) => {
        const row = recordToRow(r);
        delete row.sequence_number;
        return row;
      });
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          ...this.headers,
          Prefer: "return=representation,resolution=ignore-duplicates",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[ccm-feedback] cloud migrate failed: ${res.status} ${body}`);
        return 0;
      }
      const inserted = (await res.json()) as CloudRow[];
      for (const row of inserted) {
        const rec = rowToRecord(row);
        if (!this.cache.some((r) => r.id === rec.id)) this.cache.unshift(rec);
      }
      this.log("cloud migrated", inserted.length, "of", fresh.length, "local annotations");
      this.onChange();
      return inserted.length;
    } catch (err) {
      console.warn("[ccm-feedback] cloud migrate error", err);
      return 0;
    }
  }

  private async pushInsert(record: AnnotationRecord): Promise<void> {
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(recordToRow(record)),
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[ccm-feedback] cloud insert failed: ${res.status} ${body}`);
      }
    } catch (err) {
      console.warn("[ccm-feedback] cloud insert error", err);
    }
  }

  private async pushUpdate(id: string, patch: Partial<CloudRow>): Promise<void> {
    try {
      const res = await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...this.headers, Prefer: "return=representation, count=exact" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[ccm-feedback] cloud update failed: ${res.status} ${body}`);
        return;
      }
      const count = parseContentRangeCount(res.headers.get("content-range"));
      if (count === 0) {
        console.error(`[ccm-feedback] cloud update no-op for id=${id} — possible RLS misconfiguration or stale id`);
      }
    } catch (err) {
      console.warn("[ccm-feedback] cloud update error", err);
    }
  }

  private async pushDelete(id: string): Promise<void> {
    try {
      const res = await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...this.headers, Prefer: "return=representation, count=exact" },
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[ccm-feedback] cloud delete failed: ${res.status} ${body}`);
        return;
      }
      const count = parseContentRangeCount(res.headers.get("content-range"));
      if (count === 0) {
        console.error(`[ccm-feedback] cloud delete no-op for id=${id} — possible RLS misconfiguration or stale id`);
      }
    } catch (err) {
      console.warn("[ccm-feedback] cloud delete error", err);
    }
  }

  private async pushClear(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
      // Delete only the records this client knows about (cache snapshot).
      const inList = ids.map((i) => `"${i}"`).join(",");
      const res = await fetch(`${this.endpoint}?id=in.(${inList})`, {
        method: "DELETE",
        headers: { ...this.headers, Prefer: "return=representation, count=exact" },
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[ccm-feedback] cloud clear failed: ${res.status} ${body}`);
        return;
      }
      const count = parseContentRangeCount(res.headers.get("content-range"));
      if (count !== null && count < ids.length) {
        console.warn(`[ccm-feedback] cloud clear partial: expected ${ids.length} deleted ${count}`);
      }
    } catch (err) {
      console.warn("[ccm-feedback] cloud clear error", err);
    }
  }
}

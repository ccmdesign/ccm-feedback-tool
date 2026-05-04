import { RealtimeClient } from "./realtime.js";
import { buildRecord, normalizePath, type AnnotationStore, type SaveInput } from "./store.js";
import type {
  AnnotationKind,
  AnnotationRecord,
  CapturedElement,
  FeedbackStatus,
} from "./types.js";

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
}

const TABLE = "ccm_widget_annotations";

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
  private readonly log: (...args: unknown[]) => void;
  private realtime: RealtimeClient | null = null;

  constructor(opts: CloudStoreOptions) {
    this.projectName = opts.projectName;
    this.url = opts.url;
    this.apiKey = opts.apiKey;
    this.onChange = opts.onChange ?? (() => {});
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
      const url = `${this.endpoint}?project_name=eq.${encodeURIComponent(
        this.projectName,
      )}&order=created_at.desc`;
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
        this.cache.unshift(rowToRecord(row));
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
        this.onChange();
      },
      onDelete: (raw) => {
        const id = (raw as { id?: string }).id;
        if (!id) return;
        const idx = this.cache.findIndex((r) => r.id === id);
        if (idx === -1) return;
        this.cache.splice(idx, 1);
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
    return [...this.cache];
  }

  listForPath(path: string): AnnotationRecord[] {
    const target = normalizePath(path);
    return this.cache.filter((r) => normalizePath(r.path) === target);
  }

  save(input: SaveInput): AnnotationRecord {
    const record = buildRecord(input);
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

  delete(id: string): boolean {
    const idx = this.cache.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.cache.splice(idx, 1);
    void this.pushDelete(id);
    return true;
  }

  clear(): void {
    const ids = this.cache.map((r) => r.id);
    this.cache = [];
    void this.pushClear(ids);
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
        headers: this.headers,
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[ccm-feedback] cloud update failed: ${res.status} ${body}`);
      }
    } catch (err) {
      console.warn("[ccm-feedback] cloud update error", err);
    }
  }

  private async pushDelete(id: string): Promise<void> {
    try {
      const res = await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: this.headers,
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[ccm-feedback] cloud delete failed: ${res.status} ${body}`);
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
        headers: this.headers,
      });
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[ccm-feedback] cloud clear failed: ${res.status} ${body}`);
      }
    } catch (err) {
      console.warn("[ccm-feedback] cloud clear error", err);
    }
  }
}

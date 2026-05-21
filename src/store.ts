import type {
  AnchorData,
  AnnotationKind,
  AnnotationRecord,
  CapturedElement,
  FeedbackStatus,
  RectData,
} from "./types.js";

export interface SaveInput {
  projectName: string;
  message: string;
  authorName: string;
  url: string;
  path: string;
  viewport: string;
  userAgent: string;
  anchor: AnchorData;
  rect: RectData;
  status?: FeedbackStatus;
  kind?: AnnotationKind;
  pin?: { x: number; y: number };
  area?: { x: number; y: number; w: number; h: number };
  capturedElements?: CapturedElement[];
}

/** Narrow input for replies — degenerate annotation rows scoped to a parent comment. */
export interface ReplyInput {
  projectName: string;
  parentId: string;
  message: string;
  authorName: string;
  /** Copied verbatim from the parent record so the NOT NULL DB column is satisfied. */
  url: string;
  /** Copied verbatim from the parent record. */
  path: string;
  viewport: string;
  userAgent: string;
}

/** Common store contract implemented by both `Store` (localStorage) and `CloudStore` (Supabase). */
export interface AnnotationStore {
  list(): AnnotationRecord[];
  listForPath(path: string): AnnotationRecord[];
  save(input: SaveInput): AnnotationRecord;
  delete(id: string): boolean;
  clear(): void;
  updateStatus?(id: string, status: FeedbackStatus): boolean;
  /** Replies for one parent, oldest-first. */
  listReplies(parentId: string): AnnotationRecord[];
  /** Append a reply. Returns the freshly-built record. */
  addReply(input: ReplyInput): AnnotationRecord;
}

function storageKey(projectName: string): string {
  return `ccm-feedback:${projectName}`;
}

/**
 * Normalize a pathname for page scoping.
 * - Strips trailing slash except root
 * - Leaves case as-is (routes can be case-sensitive)
 * - Ignores query + hash (caller should pass `location.pathname`)
 */
export function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function load(projectName: string): AnnotationRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(projectName));
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data as AnnotationRecord[];
  } catch {
    return [];
  }
}

function persist(projectName: string, items: AnnotationRecord[]): void {
  try {
    localStorage.setItem(storageKey(projectName), JSON.stringify(items));
  } catch {
    // Quota exceeded — best-effort, drop silently.
  }
}

export function buildRecord(input: SaveInput): AnnotationRecord {
  const record: AnnotationRecord = {
    id: generateId(),
    projectName: input.projectName,
    message: input.message,
    authorName: input.authorName,
    url: input.url,
    path: normalizePath(input.path),
    viewport: input.viewport,
    userAgent: input.userAgent,
    createdAt: new Date().toISOString(),
    cssSelector: input.anchor.cssSelector,
    xpath: input.anchor.xpath,
    textSnippet: input.anchor.textSnippet,
    elementTag: input.anchor.elementTag,
    elementId: input.anchor.elementId,
    textPrefix: input.anchor.textPrefix,
    textSuffix: input.anchor.textSuffix,
    fingerprint: input.anchor.fingerprint,
    neighborText: input.anchor.neighborText,
    xPct: input.rect.xPct,
    yPct: input.rect.yPct,
    wPct: input.rect.wPct,
    hPct: input.rect.hPct,
    status: input.status ?? "todo",
    kind: input.kind ?? "target",
  };
  if (input.pin) {
    record.pinX = input.pin.x;
    record.pinY = input.pin.y;
  }
  if (input.area) {
    record.areaX = input.area.x;
    record.areaY = input.area.y;
    record.areaW = input.area.w;
    record.areaH = input.area.h;
  }
  if (input.capturedElements && input.capturedElements.length > 0) {
    record.capturedElements = input.capturedElements;
  }
  return record;
}

/**
 * Build a reply record — a degenerate annotation row whose only signal is
 * `parentId`. Anchor / rect / kind / pin / area / status fields stay at their
 * zero-value defaults; marker/popover code paths must never read them off a
 * reply. `url` / `path` come from the parent so the DB NOT NULL on `url` is
 * satisfied without a schema change.
 */
export function buildReplyRecord(input: ReplyInput): AnnotationRecord {
  return {
    id: generateId(),
    projectName: input.projectName,
    message: input.message,
    authorName: input.authorName,
    url: input.url,
    path: normalizePath(input.path),
    viewport: input.viewport,
    userAgent: input.userAgent,
    createdAt: new Date().toISOString(),
    cssSelector: "",
    xpath: "",
    textSnippet: "",
    elementTag: "",
    elementId: undefined,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "",
    neighborText: "",
    xPct: 0,
    yPct: 0,
    wPct: 0,
    hPct: 0,
    parentId: input.parentId,
    // Deliberately NO status / kind — they're meaningless for replies and
    // must not be read by marker / popover code paths.
  };
}

/** Client-side store backed by `localStorage`. Scoped by `projectName`. */
export class Store implements AnnotationStore {
  constructor(private readonly projectName: string) {}

  list(): AnnotationRecord[] {
    // Replies (parentId set) never surface as top-level — they live only
    // inside the parent's popover. Filter them out at every "list comments"
    // boundary so marker / drawer / FAB code paths can't accidentally render
    // a reply as a standalone work item.
    return load(this.projectName).filter((r) => !r.parentId);
  }

  /** Records scoped to a single page path. Replies excluded — see `list()`. */
  listForPath(path: string): AnnotationRecord[] {
    const target = normalizePath(path);
    return load(this.projectName).filter((r) => !r.parentId && normalizePath(r.path) === target);
  }

  save(input: SaveInput): AnnotationRecord {
    const items = load(this.projectName);
    const record = buildRecord(input);
    items.unshift(record);
    persist(this.projectName, items);
    return record;
  }

  delete(id: string): boolean {
    const items = load(this.projectName);
    const idx = items.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    // Single synchronous sweep: drop the target row AND any record whose
    // parentId points at it. This is the localStorage cascade — Postgres
    // FK + on-delete-cascade handles the equivalent for CloudStore. The
    // unified filter avoids the orphan-on-crash window a multi-step delete
    // could leak between persists. Calling .filter(r => r.parentId !== id)
    // against a reply id is a harmless no-op (no children).
    const next = items.filter((r) => r.id !== id && r.parentId !== id);
    persist(this.projectName, next);
    return true;
  }

  clear(): void {
    localStorage.removeItem(storageKey(this.projectName));
  }

  updateStatus(id: string, status: FeedbackStatus): boolean {
    const items = load(this.projectName);
    const item = items.find((r) => r.id === id);
    if (!item) return false;
    item.status = status;
    persist(this.projectName, items);
    return true;
  }

  listReplies(parentId: string): AnnotationRecord[] {
    // Sort ascending by createdAt as a belt-and-braces guard — storage order
    // is also append-order (addReply pushes newest-last), but realtime can
    // deliver out of order in the cloud store; matching the API across both
    // stores keeps callers honest.
    return load(this.projectName)
      .filter((r) => r.parentId === parentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  addReply(input: ReplyInput): AnnotationRecord {
    const items = load(this.projectName);
    const record = buildReplyRecord(input);
    // Newest-last so storage order matches read order; listReplies still
    // sorts defensively above.
    items.push(record);
    persist(this.projectName, items);
    return record;
  }
}

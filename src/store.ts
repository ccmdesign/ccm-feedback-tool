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

/**
 * Patch payload for `updateAnchor` — covers the marker-relocate write path
 * (PRO-67). All four anchor groups (selector, rect, pin coords, area rect)
 * are present; the caller passes the new kind plus the slots that apply,
 * with `pin: null` / `area: null` for the slots that don't.
 */
export interface UpdateAnchorInput {
  /** New annotation kind after the drop. */
  kind: AnnotationKind;
  /** Element-anchor fields. Empty strings when the new kind is "pin". */
  anchor: AnchorData;
  /** Drop fraction inside the anchor element (target) or zeros (pin/area). */
  rect: RectData;
  /** Document-space pin coords when kind === "pin"; null otherwise. */
  pin: { x: number; y: number } | null;
  /** Document-space area rect when kind === "area"; null otherwise. */
  area: { x: number; y: number; w: number; h: number } | null;
}

/** Common store contract implemented by both `Store` (localStorage) and `CloudStore` (Supabase). */
export interface AnnotationStore {
  list(): AnnotationRecord[];
  /**
   * Every record for the project — comments AND replies (parentId-bearing
   * rows). `list()` deliberately filters replies out so they never become
   * markers; the JSON export path uses `listAll()` instead so the downloaded
   * payload carries replies (the apply-ccm-feedback skill partitions them by
   * `parentId`). See docs/replies.md § "Export / agent ingestion".
   */
  listAll(): AnnotationRecord[];
  listForPath(path: string): AnnotationRecord[];
  save(input: SaveInput): AnnotationRecord;
  delete(id: string): boolean;
  clear(): void;
  updateStatus?(id: string, status: FeedbackStatus): boolean;
  /**
   * Overwrite an annotation's anchor + kind + pin/area slots in place
   * (PRO-67 marker relocate). Returns false when no record matches `id`.
   */
  updateAnchor?(id: string, input: UpdateAnchorInput): boolean;
  /** Replies for one parent, oldest-first. */
  listReplies(parentId: string): AnnotationRecord[];
  /** Append a reply. Returns the freshly-built record. */
  addReply(input: ReplyInput): AnnotationRecord;
}

function storageKey(projectName: string): string {
  return `ccm-feedback:${projectName}`;
}

/**
 * Sibling-key namespace for the per-project sequence-number high-water mark
 * (PRO-81). Distinct from `storageKey` so `Store.clear()` (which removes only
 * the annotation array) leaves the HWM intact — clearing a project's
 * comments must not recycle previously-issued numbers. See
 * docs/fab-toolbar-tweaks.md §8 "Store contract".
 */
function hwmKey(projectName: string): string {
  return `ccm-feedback:${projectName}:seq-hwm`;
}

/**
 * Read the persisted next-to-issue sequence number for a project. Returns
 * `1` when the key is absent, unparseable, not a number, or below `1`. The
 * try/catch posture mirrors `load` — storage failures are silent and
 * non-fatal (consistent with the rest of this module's best-effort I/O).
 */
function loadHwm(projectName: string): number {
  try {
    const raw = localStorage.getItem(hwmKey(projectName));
    if (!raw) return 1;
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "number" && parsed >= 1 ? Math.floor(parsed) : 1;
  } catch {
    return 1;
  }
}

/**
 * Best-effort write of the next-to-issue sequence number for a project.
 * Same posture as `persist` — quota errors and similar are dropped
 * silently so the calling save path doesn't fail visibly.
 */
function persistHwm(projectName: string, next: number): void {
  try {
    localStorage.setItem(hwmKey(projectName), JSON.stringify(next));
  } catch {
    // Quota exceeded — best-effort, drop silently.
  }
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

/**
 * Fill `sequenceNumber` for any top-level record missing one, in `createdAt`
 * order starting at 1. Existing numbers are preserved — the pass only fills
 * gaps. Returns true when at least one record was modified so the caller
 * knows to persist.
 */
export function backfillSequenceNumbers(items: AnnotationRecord[]): boolean {
  const tops = items.filter((r) => !r.parentId);
  if (tops.every((r) => typeof r.sequenceNumber === "number")) return false;
  // Sort ascending by createdAt (then id for stable tiebreaker) — the
  // assignment order matters because the resulting numbers are persisted.
  const ordered = [...tops].sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
  // Start from the max of already-numbered tops so we never reuse a number.
  let cursor = ordered.reduce((m, r) => (typeof r.sequenceNumber === "number" ? Math.max(m, r.sequenceNumber) : m), 0);
  let changed = false;
  for (const r of ordered) {
    if (typeof r.sequenceNumber === "number") continue;
    cursor += 1;
    r.sequenceNumber = cursor;
    changed = true;
  }
  return changed;
}

/**
 * Build a top-level annotation record from a `SaveInput`. The
 * `assignedSequenceNumber` argument carries the pre-issued `#N` from the
 * caller (PRO-81 HWM mechanism — `Store.save` reads and bumps the HWM,
 * then passes the assigned number here). Pass `undefined` to omit the
 * `sequenceNumber` field entirely — used by `CloudStore.save` so the
 * optimistic local row renders `#?` until the server trigger's assigned
 * number arrives via the realtime echo. The field is set only when the
 * argument is a number (exactOptionalPropertyTypes forbids assigning
 * `undefined` to an optional property).
 */
export function buildRecord(input: SaveInput, assignedSequenceNumber: number | undefined): AnnotationRecord {
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
  if (typeof assignedSequenceNumber === "number") {
    record.sequenceNumber = assignedSequenceNumber;
  }
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
  constructor(private readonly projectName: string) {
    // One-time pass over pre-migration localStorage data: fill any missing
    // `sequenceNumber` for top-level records by `createdAt` order. Idempotent
    // — `backfillSequenceNumbers` returns false on a second call so the
    // localStorage write is skipped. PRO-68 §8.
    const items = load(this.projectName);
    if (backfillSequenceNumbers(items)) {
      persist(this.projectName, items);
    }
    // PRO-81 — seed the per-project HWM slot. The slot lives in its own
    // localStorage key (see `hwmKey`) so it survives `Store.clear()` and
    // is never decremented by delete paths. Order matters: this runs
    // AFTER `backfillSequenceNumbers` so the seed observes the
    // post-backfill max. The seed only runs when the key is absent
    // (first construction for this project) — subsequent constructions
    // read the persisted slot and never re-derive from rows.
    const rawHwm = (() => {
      try {
        return localStorage.getItem(hwmKey(this.projectName));
      } catch {
        return null;
      }
    })();
    const maxTopSeq = items.reduce(
      (m, r) => (!r.parentId && typeof r.sequenceNumber === "number" && r.sequenceNumber > m ? r.sequenceNumber : m),
      0,
    );
    if (rawHwm === null) {
      // First-ever construction for this project (or pre-PRO-81 storage
      // with no HWM key yet). Seed from max(rows.sequenceNumber) + 1, or
      // 1 for an empty project.
      persistHwm(this.projectName, maxTopSeq + 1);
    } else {
      // Defensive self-heal: if the persisted slot is somehow below
      // max(rows) + 1 (e.g. a reviewer manually edited localStorage, or a
      // legacy bug shipped a number above the slot), bump the slot to
      // restore the monotonic invariant. The slot only moves UP — never
      // down — to preserve PRO-81's "never decrement" contract.
      const current = loadHwm(this.projectName);
      const needed = maxTopSeq + 1;
      if (current < needed) {
        persistHwm(this.projectName, needed);
      }
    }
  }

  list(): AnnotationRecord[] {
    // Replies (parentId set) never surface as top-level — they live only
    // inside the parent's popover. Filter them out at every "list comments"
    // boundary so marker / drawer / FAB code paths can't accidentally render
    // a reply as a standalone work item.
    return load(this.projectName).filter((r) => !r.parentId);
  }

  listAll(): AnnotationRecord[] {
    // Everything, replies included — the export path's gather. Never used by
    // marker / drawer / FAB code (those go through list()).
    return load(this.projectName);
  }

  /** Records scoped to a single page path. Replies excluded — see `list()`. */
  listForPath(path: string): AnnotationRecord[] {
    const target = normalizePath(path);
    return load(this.projectName).filter((r) => !r.parentId && normalizePath(r.path) === target);
  }

  save(input: SaveInput): AnnotationRecord {
    // PRO-81 HWM contract: read the slot, build with the assigned number,
    // bump the slot BEFORE persisting the row array. Bump-before-write is
    // the load-bearing crash-safety choice — if the process dies between
    // the two writes the worst case is a gap (slot consumed, row never
    // saved), which the spec declares legal. The opposite ordering would
    // risk re-issuing the same number on the next save, violating R1.
    const items = load(this.projectName);
    const assigned = loadHwm(this.projectName);
    const record = buildRecord(input, assigned);
    persistHwm(this.projectName, assigned + 1);
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
    // PRO-81: delete MUST NOT touch the HWM slot. Deleting #N (even the
    // current-highest) leaves the slot at N+1 so the next save issues N+1.
    return true;
  }

  clear(): void {
    // PRO-81: clear MUST NOT touch the HWM slot. A reviewer who clears
    // and starts fresh still gets monotonic numbers — slot at #71 before
    // clear, next save after clear issues #72, not #1.
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

  updateAnchor(id: string, input: UpdateAnchorInput): boolean {
    const items = load(this.projectName);
    const item = items.find((r) => r.id === id);
    if (!item) return false;
    // Overwrite anchor fields verbatim. Mirror Save's input mapping so kind
    // transitions stay symmetric with first-save semantics.
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
      // exactOptionalPropertyTypes: delete instead of assigning undefined.
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

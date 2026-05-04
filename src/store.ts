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

/** Common store contract implemented by both `Store` (localStorage) and `CloudStore` (Supabase). */
export interface AnnotationStore {
  list(): AnnotationRecord[];
  listForPath(path: string): AnnotationRecord[];
  save(input: SaveInput): AnnotationRecord;
  delete(id: string): boolean;
  clear(): void;
  updateStatus?(id: string, status: FeedbackStatus): boolean;
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

/** Client-side store backed by `localStorage`. Scoped by `projectName`. */
export class Store implements AnnotationStore {
  constructor(private readonly projectName: string) {}

  list(): AnnotationRecord[] {
    return load(this.projectName);
  }

  /** Records scoped to a single page path. */
  listForPath(path: string): AnnotationRecord[] {
    const target = normalizePath(path);
    return load(this.projectName).filter((r) => normalizePath(r.path) === target);
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
    items.splice(idx, 1);
    persist(this.projectName, items);
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
}

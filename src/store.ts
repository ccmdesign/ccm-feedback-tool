import type { AnchorData, AnnotationRecord, RectData } from "./types.js";

export interface SaveInput {
  projectName: string;
  message: string;
  url: string;
  path: string;
  viewport: string;
  userAgent: string;
  anchor: AnchorData;
  rect: RectData;
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

/** Client-side store backed by `localStorage`. Scoped by `projectName`. */
export class Store {
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
    const record: AnnotationRecord = {
      id: generateId(),
      projectName: input.projectName,
      message: input.message,
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
    };
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
}

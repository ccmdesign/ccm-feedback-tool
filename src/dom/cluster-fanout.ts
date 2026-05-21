/**
 * PRO-68 §7 — cluster-detection + horizontal fan-out for colocated markers.
 *
 * Run as a second pass after the natural positioning loop in
 * `MarkerManager.reposition()`. Two markers are considered colliding when
 * their centers are within `COLLISION_RADIUS` along either axis (Chebyshev).
 * Union-find groups transitively-overlapping markers; each cluster's members
 * are laid out at the cluster's mean center, sorted by `createdAt` ascending
 * (oldest leftmost for stable visual order across reloads), with
 * `MARKER_SIZE + CLUSTER_GAP` spacing. The whole row is clamped against the
 * viewport via the same `clampX` the natural pass uses — if the rightmost
 * member would exit, the entire row shifts left so spacing inside the row
 * stays even.
 *
 * The module is intentionally framework-free and reads only the DOM
 * positions written by the previous pass; mutating the records is not its
 * job. Orphan-lane targets keep their vertical stack and are excluded by
 * the caller via `dataset.orphan === "true"`.
 */
import type { AnnotationRecord } from "../types.js";

/** Minimum entry shape the fan-out pass reads. Matches `MarkerEntry` in
 * `markers.ts` without forcing that file to export its internal type. */
export interface FanOutEntry {
  record: AnnotationRecord;
  node: HTMLElement;
}

export interface FanOutOptions {
  markerSize: number;
  /** Center-to-center cutoff for grouping. */
  collisionRadius: number;
  /** Gap between adjacent marker edges in a fanned-out row. */
  clusterGap: number;
  /** Minimum left coordinate inside the viewport (matches the natural pass). */
  minX: number;
  /** Clamp helper from the caller — uses the same horizontal window as the
   * natural pass so behavior stays symmetric. Called only with finite x. */
  clampX: (x: number) => number;
}

/**
 * Lay out clustered markers side-by-side. Mutates `entry.node.style.top/left`
 * and the `data-cluster-size` / `data-cluster-index` attributes.
 */
export function fanOutClusters(entries: readonly FanOutEntry[], opts: FanOutOptions): void {
  type Cand = { entry: FanOutEntry; cx: number; cy: number };
  const candidates: Cand[] = [];
  for (const entry of entries) {
    if (entry.node.dataset.orphan === "true") continue;
    if (entry.node.style.display === "none") continue;
    const cx = Number.parseFloat(entry.node.style.left);
    const cy = Number.parseFloat(entry.node.style.top);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    candidates.push({ entry, cx, cy });
  }
  if (candidates.length < 2) {
    for (const c of candidates) {
      delete c.entry.node.dataset.clusterSize;
      delete c.entry.node.dataset.clusterIndex;
    }
    return;
  }

  // Union-find over candidate indices.
  const parent = candidates.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      const p = parent[i] as number;
      parent[i] = parent[p] as number;
      i = parent[i] as number;
    }
    return i;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i] as Cand;
      const b = candidates[j] as Cand;
      if (Math.abs(a.cx - b.cx) < opts.collisionRadius && Math.abs(a.cy - b.cy) < opts.collisionRadius) {
        union(i, j);
      }
    }
  }

  // Bucket candidates by cluster root.
  const buckets = new Map<number, Cand[]>();
  for (let i = 0; i < candidates.length; i++) {
    const root = find(i);
    const bucket = buckets.get(root);
    if (bucket) bucket.push(candidates[i] as Cand);
    else buckets.set(root, [candidates[i] as Cand]);
  }

  for (const cluster of buckets.values()) {
    if (cluster.length < 2) {
      const c = cluster[0];
      if (c) {
        delete c.entry.node.dataset.clusterSize;
        delete c.entry.node.dataset.clusterIndex;
      }
      continue;
    }
    // Stable visual order: oldest leftmost. Falls back to id compare so
    // ties don't flicker between reloads.
    cluster.sort((a, b) => {
      const da = new Date(a.entry.record.createdAt).getTime();
      const db = new Date(b.entry.record.createdAt).getTime();
      if (da !== db) return da - db;
      return a.entry.record.id.localeCompare(b.entry.record.id);
    });
    const meanCx = cluster.reduce((s, c) => s + c.cx, 0) / cluster.length;
    const meanCy = cluster.reduce((s, c) => s + c.cy, 0) / cluster.length;
    const step = opts.markerSize + opts.clusterGap;
    const n = cluster.length;
    const xs = cluster.map((_, i) => meanCx + (i - (n - 1) / 2) * step);
    // Clamp the whole row inside the viewport: shift left if the rightmost
    // exceeds the viewport, shift right if the leftmost falls below minX.
    // For rows wider than the viewport we accept the documented v1 limit
    // (PRO-68 §7) and prefer keeping the left edge on-screen.
    const maxX = opts.clampX(Number.POSITIVE_INFINITY);
    const rightmost = xs[n - 1] as number;
    const leftmost = xs[0] as number;
    let shift = 0;
    if (rightmost > maxX) shift = maxX - rightmost;
    if (leftmost + shift < opts.minX) shift = opts.minX - leftmost;
    for (let i = 0; i < n; i++) {
      const c = cluster[i] as Cand;
      const newX = (xs[i] as number) + shift;
      c.entry.node.style.left = `${newX}px`;
      c.entry.node.style.top = `${meanCy}px`;
      c.entry.node.dataset.clusterSize = String(n);
      c.entry.node.dataset.clusterIndex = String(i);
    }
  }
}

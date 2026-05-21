# PRO-66 — Comment replies (v1, flat thread inside popover)

Status: planned · Branch: `feature/PRO-66-comment-replies` (off `dev`) ·
Spec: [`docs/replies.md`](../replies.md)

This plan is the implementation sequence for the reviewer-reply feature. The
full design rationale lives in `docs/replies.md`; this file translates that
into concrete edits ordered by dependency, with the post-PRO-64 / PRO-65
overrides folded in.

---

## Overrides vs `docs/replies.md`

The spec was written against `dev` at PRO-57. Two things have changed since.
The implementer **must** follow these overrides; the spec text is otherwise
authoritative.

### 1. Migration numbering: `0006`, not `0005`

`supabase/migrations/0005_repair_rls.sql` already shipped on `dev` via
PRO-65. The replies migration is therefore `0006_replies.sql`. Every place
in the spec that names `0005_replies.sql` is stale.

Resolution for the spec text itself: as part of this PR, **edit
`docs/replies.md`** to (a) rename the migration to `0006_replies.sql`
everywhere in the body, and (b) prepend a short "Historical context"
preamble noting that the doc was drafted before PRO-65 landed and the
numbering was bumped. This keeps a single source of truth — the spec — and
avoids the "is the plan or the spec right?" footgun on the next pass.

The numeric ordering still works: `0001…0005_repair_rls → 0006_replies` is
strictly after the RLS repair, which is what the spec actually requires
(replies need anon RLS to be sane).

### 2. Popover placement: preserve PRO-64 manual `position: fixed`, not CSS Anchor Positioning

The spec section "Popover sizing" still references the old anchor-positioning
code path and a hard-coded `180px` flip threshold. PRO-64 already rewrote
`openPopover` (see `src/markers.ts:308`) to use manual `position: fixed`
placement against `marker.getBoundingClientRect()`, with two constants:

```ts
// src/markers.ts:17-18
const POPOVER_NOMINAL_HEIGHT = 180;
const POPOVER_NOMINAL_WIDTH  = 300;
```

The flip-above-marker branch (`markers.ts:414`) uses
`POPOVER_NOMINAL_HEIGHT` because the popover is appended to `document.body`
*after* the placement math runs — there's no rendered height to read.

**Do NOT reintroduce CSS Anchor Positioning.** It paints to nothing inside
the `overflow: clip` marker container on Chromium 125+ (the bug PRO-64
worked around).

Replies make the popover taller and variable-height, so the nominal
constant becomes wrong. The fix is: after the popover is in the DOM, take
one `getBoundingClientRect()` reading and re-run the flip + clamp logic
with the actual height. Keep `POPOVER_NOMINAL_HEIGHT` as the first-paint
fallback (so the popover doesn't appear at `top: 0` for a frame). Details
in step 8 below.

### 3. Preserve PRO-65 cloud-store hardening

PRO-65 hardened `pushUpdate`, `pushDelete`, and `pushClear` with:

- `Prefer: return=representation, count=exact` on the request,
- `parseContentRangeCount(res.headers.get("content-range"))` on the response,
- `console.error(...)` when the affected-row count is `0` (silent no-op
  is now a loud failure mode).

Reply work goes through:

- `pushInsert` — **untouched by PRO-65** (already returns the row in body;
  no row-count assertion needed because a failed INSERT returns a non-2xx).
  Reply insert reuses this path verbatim — no PRO-65 regression risk.
- `pushDelete` — replies inherit the `count=exact` zero-row warning for
  free. Cascade-deletes (replies that follow a parent delete) are
  server-side and arrive via realtime; the client only `pushDelete`s the
  parent and the child replies' rows are removed by Postgres + cascaded
  back over realtime DELETE events.

This plan introduces no new PostgREST mutation paths; the hardening stays
intact.

---

## Order of file changes

Numbered, dependency-correct. Each step compiles cleanly with the previous
ones in place — `bun run check` should pass at every checkpoint.

1. **`supabase/migrations/0006_replies.sql`** — schema first; the column
   has to exist before the row mappers can carry it. (Step 2.)
2. **`src/types.ts`** — add `parentId?: string` to `AnnotationRecord`.
3. **`src/store.ts`** — `ReplyInput`, `buildReplyRecord`, extend
   `AnnotationStore` interface with `listReplies` / `addReply`, implement
   them on `Store`, add `!parentId` filter to `list()` / `listForPath()`,
   add cascade in `Store.delete()`.
4. **`src/cloud-store.ts`** — `CloudRow.parent_id`, map both directions
   conditionally (exactOptionalPropertyTypes), implement `listReplies` /
   `addReply`, add `!parentId` filter to `list()` / `listForPath()`,
   cascade-drop cached replies on parent delete, route realtime
   INSERT/DELETE for reply rows.
5. **`src/events.ts`** — add `"feedback:replied": [AnnotationRecord]`.
6. **`src/i18n.ts`** — add the 5 reply strings.
7. **`src/markers.ts`** — extend `openPopover` with the thread render +
   composer + per-reply delete; switch the flip-above logic to a measured
   height after first render; subscribe to `feedback:replied` /
   `feedback:deleted` for in-place thread updates.
8. **`src/index.ts`** — wire `feedback:replied` into `syncUi` (drawer
   refresh is cheap and replies never affect FAB count, see below).
9. **`scripts/apply-migrations.sh`** + **`docs/self-hosting.md`** +
   **`docs/cloud-mode.md`** — append `0006_replies.sql` to the migration
   list in the header comment / docs body. Note: PRO-65 left the docs at
   `0004`; this PR catches them up to `0006` (one extra line per file).
10. **`docs/data-model.md`** — document `parentId` + reply grouping.
11. **`docs/replies.md`** — apply the override fix (rename `0005` →
    `0006`; add the "Historical context" preamble).
12. **`skills/apply-ccm-feedback/SKILL.md`** + **`scripts/feedback.ts`** +
    **`prompts/apply-feedback.md`** — partition rows by `parent_id`.
13. **Build + commit** — `dist/w.js` and `public/w.js` are committed
    (repo convention; see PRO-65 build commit `16724f4`).

---

## 1. Migration: `supabase/migrations/0006_replies.sql`

Self-referential FK with `on delete cascade`, plus an index on the parent
pointer (so `select * where parent_id = $1` is index-backed). Idempotent.

```sql
-- 0006_replies.sql — self-referential parent for reply rows (PRO-66).
--
-- Replies are degenerate annotation rows: identity + body fields populated,
-- everything spatial left at column defaults. The widget renders them only
-- inside the parent comment's popover; they never become markers or work
-- items in the agent ingestion path. See docs/replies.md.
--
-- on delete cascade: deleting a parent removes its replies server-side.
-- REPLICA IDENTITY FULL (migration 0003) ensures each cascaded DELETE still
-- emits a realtime event carrying project_name + parent_id so other open
-- clients stay consistent.
--
-- RLS: existing anon policies are using (true) / with check (true) — they
-- cover reply rows with no policy change. Tightened policies (see
-- prompts/harden-rls.md) must permit parent_id-bearing inserts.

alter table public.ccm_widget_annotations
  add column if not exists parent_id uuid
    references public.ccm_widget_annotations(id) on delete cascade;

create index if not exists ccm_widget_annotations_parent_idx
  on public.ccm_widget_annotations (parent_id);
```

No `status` / `kind` CHECK constraint changes — replies carry the default
`'todo'` / `'target'` (or NULL) which the existing constraints already
accept. The widget never *reads* `status` / `kind` off a reply row (see
step 4 and step 7).

---

## 2. `src/types.ts`

Add one optional field to `AnnotationRecord`, after `createdAt`:

```ts
/** Set on reply records — points at the parent comment's id. Undefined for top-level comments. */
parentId?: string;
```

That's it. No new type alias for "reply" — a reply is just an
`AnnotationRecord` where `parentId` is set. Treating it as a distinct type
would require split union handling at every cache + persistence site for
no semantic gain.

---

## 3. `src/store.ts`

### 3a. `ReplyInput` interface

Exact shape per spec (`docs/replies.md` § "Store contract"). `viewport`
and `userAgent` **are** required — they're useful debug context for the
agent reading the thread. Copy them at send time from the same source
comments use (`window.innerWidth`/`navigator.userAgent`).

```ts
export interface ReplyInput {
  projectName: string;
  parentId: string;
  message: string;
  authorName: string;
  url: string;       // copied verbatim from the parent record
  path: string;      // copied verbatim from the parent record
  viewport: string;
  userAgent: string;
}
```

### 3b. `buildReplyRecord(input: ReplyInput): AnnotationRecord`

Sits next to `buildRecord`. Same id/timestamp generation; all anchor /
rect / kind / pin / area / status / captured fields stay at their
zero-value defaults; `parentId` is the only "reply" signal.

```ts
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
```

### 3c. `AnnotationStore` interface — add two methods

```ts
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
```

Both methods are **required** (not optional) — every store needs to
answer them, and the popover code path expects them to exist on the
common contract.

### 3d. `Store` (localStorage) implementations

- `list()`: `load(...).filter(r => !r.parentId)`.
- `listForPath(path)`: same filter applied after the path filter.
- `listReplies(parentId)`:
  `load(...).filter(r => r.parentId === parentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))`.
- `addReply(input)`: build record, `items.push(record)` (newest-last so
  reads-in-order match storage-order; sort in `listReplies` is still kept
  as a belt-and-braces guard), persist, return.
- `delete(id)`: when the deleted record is a parent
  (`!record.parentId`), cascade in one synchronous filter pass:
  `items = items.filter(r => r.id !== id && r.parentId !== id)`. Single
  filter avoids the orphan-on-crash window the spec calls out
  (`docs/replies.md` § Edge cases). Persist once at the end.

The cascade can be unconditional — calling `filter(r => r.parentId !==
id)` against a reply id is just a no-op (no children) and it avoids
re-reading the record to check parent-vs-reply.

### 3e. Ordering note

Top-level comments stay newest-first in storage (current `unshift`
behaviour, unchanged). Replies are appended (newest-last), and
`listReplies` sorts ascending by `createdAt` so a future un-ordered write
(realtime arriving out of order) can't break read order.

---

## 4. `src/cloud-store.ts`

### 4a. `CloudRow.parent_id`

```ts
interface CloudRow {
  // ...existing...
  parent_id?: string | null;
}
```

### 4b. `rowToRecord` — conditional set

Mirror `record.elementId`, `record.pinX`, etc. (exactOptionalPropertyTypes
strict mode forbids `record.parentId = row.parent_id ?? undefined`):

```ts
if (row.parent_id) record.parentId = row.parent_id;
```

### 4c. `recordToRow` — conditional emit

```ts
if (r.parentId) row.parent_id = r.parentId;
```

Do NOT emit `parent_id: null` for top-level rows — the column default is
NULL, omitting it lets the column default take over and avoids touching
any PostgREST insert-resolution surprises.

### 4d. `list()` / `listForPath()` — `!parentId` filter

```ts
list(): AnnotationRecord[] {
  return this.cache.filter(r => !r.parentId);
}

listForPath(path: string): AnnotationRecord[] {
  const target = normalizePath(path);
  return this.cache.filter(r => !r.parentId && normalizePath(r.path) === target);
}
```

Replies remain in the cache (one flat array, per spec § "CloudStore"),
they just don't surface to callers that ask for "the marker set".

### 4e. `listReplies(parentId)` / `addReply(input)`

```ts
listReplies(parentId: string): AnnotationRecord[] {
  return this.cache
    .filter(r => r.parentId === parentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

addReply(input: ReplyInput): AnnotationRecord {
  const record = buildReplyRecord(input);
  this.cache.push(record);          // newest-last in the cache too
  void this.pushInsert(record);     // reuses the existing insert path
  return record;
}
```

`pushInsert` is unchanged — `recordToRow` now emits `parent_id`, the
PostgREST insert payload carries it, the FK + index do their job. Because
PRO-65 didn't modify `pushInsert`, no new hardening surface is added.

### 4f. `delete(parentId)` — cache cascade

The DB does its own cascade via `on delete cascade`, and realtime DELETE
events for each cascaded child stream back. But there's a window
(round-trip + realtime debounce) where the popover is still open and the
cache still holds stale reply rows. Drop them client-side too, *before*
the network call:

```ts
delete(id: string): boolean {
  const idx = this.cache.findIndex(r => r.id === id);
  if (idx === -1) return false;
  // Cascade reply rows for this parent out of the cache first so any
  // open popover for the parent stops rendering them before the realtime
  // DELETE events catch up. Server-side `on delete cascade` handles the
  // actual row removal.
  this.cache = this.cache.filter(r => r.id !== id && r.parentId !== id);
  void this.pushDelete(id);
  return true;
}
```

This keeps the PRO-65 `pushDelete` count-=-exact assertion intact — the
parent row's DELETE is still one row, the children are cleaned up by
Postgres and we don't issue separate DELETE requests for them.

### 4g. Realtime routing

In `startRealtime` → `onInsert`:

```ts
onInsert: (raw) => {
  const row = raw as unknown as CloudRow;
  if (this.cache.some(r => r.id === row.id)) return;
  const record = rowToRecord(row);
  if (record.parentId) {
    // Reply: push to cache, fire feedback:replied for the popover. Do NOT
    // create a marker (markers.refresh / addOne are gated on parentId via
    // listForPath in step 4d).
    this.cache.push(record);
    this.bus.emit?.("feedback:replied", record);
    // Intentionally NOT calling this.onChange() — replies don't change
    // the marker set or the drawer's top-level list.
    return;
  }
  this.cache.unshift(record);
  this.onChange();
}
```

This requires `CloudStore` to know about the bus. Two options:

**Option A (clean):** thread the bus through `CloudStoreOptions`:

```ts
interface CloudStoreOptions {
  url: string;
  apiKey: string;
  projectName: string;
  onChange?: () => void;
  onReply?: (record: AnnotationRecord) => void;   // new
  onReplyDeleted?: (id: string) => void;          // new
  log?: (...args: unknown[]) => void;
}
```

`index.ts` passes callbacks that `bus.emit("feedback:replied", record)` /
`bus.emit("feedback:deleted", id)`. CloudStore stays bus-agnostic
(matches today's onChange pattern).

**Option B (lazy):** pass the bus directly into `CloudStoreOptions`.

**Pick Option A.** It matches the existing `onChange` shape and keeps
`CloudStore` decoupled from `EventBus`. (`markers.ts` already takes
`bus: EventBus<WidgetEvents>` directly because it's the only consumer of
many event types — different role.)

`onDelete`:

```ts
onDelete: (raw) => {
  const id = (raw as { id?: string }).id;
  if (!id) return;
  const idx = this.cache.findIndex(r => r.id === id);
  if (idx === -1) return;
  const removed = this.cache[idx];
  this.cache.splice(idx, 1);
  if (removed.parentId) {
    // Reply delete (could be a cascade or a direct user delete on the
    // reply). Notify the popover so it can drop the row in place; no
    // marker refresh needed.
    this.onReplyDeleted?.(id);
    return;
  }
  this.onChange();
}
```

Note: server-side `on delete cascade` emits a separate DELETE event per
cascaded child row (REPLICA IDENTITY FULL, migration 0003). Each of
those flows through this branch and clears its cache slot without
re-rendering markers.

`onUpdate` needs no change for v1 — replies can't be edited (v1 scope).
A defensive guard isn't needed because the widget never PATCHes a reply
row.

---

## 5. `src/events.ts`

Add one event:

```ts
export interface WidgetEvents {
  // ...existing...
  "feedback:replied": [AnnotationRecord];
}
```

Carry the full record (not just the id) so subscribers — specifically
the popover — can render the reply row without a second `listReplies`
lookup. Mirrors `"feedback:saved"`.

---

## 6. `src/i18n.ts`

Add the 5 strings (alphabetical to match the existing `marker.*` block,
between `marker.popover.deleteConfirm` and `toast.exported`):

```ts
"marker.replies.heading": "Replies",
"marker.reply.delete": "Delete reply",
"marker.reply.placeholder": "Write a reply…",
"marker.reply.send": "Reply",
"marker.replyDeleteConfirm": "Delete this reply? This cannot be undone.",
```

`marker.replies.heading` only renders when ≥ 1 reply (spec § i18n).

---

## 7. `src/markers.ts` — the bulk of the UI work

All edits inside `openPopover` (lines 308–430) plus one new field on the
class and one new constant.

### 7a. New constants / state

Add at the top of the file, alongside `POPOVER_NOMINAL_HEIGHT`:

```ts
const POPOVER_MAX_HEIGHT_PX = 480;   // ceiling before the thread starts scrolling
const POPOVER_VIEWPORT_MARGIN = 16;  // safety inset against viewport edges
```

Add to the class:

```ts
/** Record id of the comment whose popover is currently open, if any. */
private openPopoverParentId: string | null = null;
/** Off-handlers for bus subscriptions opened during openPopover. */
private popoverDisposers: Array<() => void> = [];
```

### 7b. Popover structural change

Current order: `tagsRow → body → meta → btnRow`.

New order:

```
tagsRow → body → meta → divider → repliesSection → composer → btnRow
```

`repliesSection` and `composer` together = the new thread block. Both are
rendered every time the popover opens; the empty thread shows just the
composer (no "no replies" placeholder — spec § UI).

### 7c. Build the thread

Pseudocode for the section between `meta` and `btnRow`:

```ts
const divider = el("div", {
  style: `height:1px;background:${this.colors.border};margin:10px -4px 10px;`
});

const thread = el("div", {
  style: "display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"
});
const renderThread = () => {
  thread.replaceChildren();
  const replies = this.store.listReplies(record.id);
  if (replies.length > 0) {
    const heading = el("div", {
      style: `font-size:11px;font-weight:600;color:${this.colors.textTertiary};margin-bottom:2px;`
    });
    setText(heading, this.t("marker.replies.heading"));
    thread.appendChild(heading);
  }
  for (const reply of replies) {
    thread.appendChild(this.buildReplyRow(reply, record.id));
  }
};
renderThread();
```

`buildReplyRow(reply, parentId)` returns a small DOM element:

- `meta` line: `${author} · ${time}` in `textTertiary`, font-size 11.
- `body` line: `white-space: pre-wrap; word-break: break-word;` font-size
  13 (matches main body).
- hover-revealed `×` button absolutely positioned top-right inside the
  row. Click → `window.confirm(this.t("marker.replyDeleteConfirm"))` →
  `this.store.delete(reply.id)` → `this.bus.emit("feedback:deleted",
  reply.id)` → `renderThread()` (NOT `this.refresh()` — replies don't
  have markers).

### 7d. Composer

```ts
const composer = el("div", { style: "display:flex;flex-direction:column;gap:6px;margin-bottom:10px;" });

const ta = el("textarea", {
  rows: "2",
  placeholder: this.t("marker.reply.placeholder"),
  "aria-label": this.t("marker.reply.placeholder"),
  style: `
    width:100%;box-sizing:border-box;resize:vertical;min-height:48px;max-height:160px;
    border-radius:8px;border:1px solid ${this.colors.border};
    background:${this.colors.glassBg};color:${this.colors.text};
    font-family:inherit;font-size:13px;line-height:1.4;padding:8px 10px;
  `
}) as HTMLTextAreaElement;

const sendBtn = el("button", { type: "button", style: /* accent button */ });
setText(sendBtn, this.t("marker.reply.send"));

const send = () => {
  const message = ta.value.trim();
  if (!message) return;  // silent no-op
  const reply = this.store.addReply({
    projectName: record.projectName,
    parentId: record.id,
    message,
    authorName: ensureAuthor(),  // from author.ts; existing import in index.ts but we'll need a new import here
    url: record.url,
    path: record.path,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
  });
  this.bus.emit("feedback:replied", reply);
  ta.value = "";
  renderThread();
  // Keep popover open + scroll thread bottom into view.
  pop.scrollTop = pop.scrollHeight;
};
sendBtn.addEventListener("click", send);

ta.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
    return;
  }
  // ⌘/Ctrl + Enter also submits (matches popup.ts convention).
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    send();
  }
});
```

**Author name source:** `src/author.ts` already exists (confirmed —
`loadAuthor / saveAuthor / ensureAuthor`). Import `ensureAuthor` into
`markers.ts`. No new prompt: `ensureAuthor` returns the cached value on
subsequent calls.

### 7e. Popover sizing + flip — replace `POPOVER_NOMINAL_HEIGHT` with a measured height

Today's flip math (lines 410-426):

```ts
const rect = marker.getBoundingClientRect();
pop.style.position = "fixed";
let top = rect.bottom + 8;
let left = rect.left - 10;
if (top + POPOVER_NOMINAL_HEIGHT > window.innerHeight) {
  top = rect.top - POPOVER_NOMINAL_HEIGHT - 8;
}
if (left + POPOVER_NOMINAL_WIDTH > window.innerWidth) {
  left = window.innerWidth - POPOVER_NOMINAL_WIDTH - 8;
}
top = Math.max(8, top);
left = Math.max(8, left);
pop.style.top = `${top}px`;
pop.style.left = `${left}px`;
document.body.appendChild(pop);
```

Two changes:

1. **Add scroll constraint to `pop` itself:**

   ```ts
   pop.style.maxHeight = `${POPOVER_MAX_HEIGHT_PX}px`;
   pop.style.overflowY = "auto";
   ```

   This caps how tall the popover can grow; long threads scroll inside
   the popover rather than off-screen.

2. **Two-phase placement: nominal first, measured second.**

   First-paint: keep the current math using `POPOVER_NOMINAL_HEIGHT` as
   the upper-bound estimate. This avoids the popover briefly painting at
   `top: 0` before the measurement.

   After `document.body.appendChild(pop)`, read the actual rendered
   height and re-run the flip + clamp:

   ```ts
   document.body.appendChild(pop);

   // Re-place against the actual rendered height. The nominal-height
   // placement above is the first-paint estimate so we don't flash an
   // unanchored popover; this synchronous reflow corrects it before the
   // user can perceive the gap (browsers batch layout + paint).
   const actualHeight = Math.min(pop.offsetHeight, POPOVER_MAX_HEIGHT_PX);
   let measuredTop = rect.bottom + 8;
   if (measuredTop + actualHeight > window.innerHeight - POPOVER_VIEWPORT_MARGIN) {
     measuredTop = rect.top - actualHeight - 8;
   }
   measuredTop = Math.max(POPOVER_VIEWPORT_MARGIN, measuredTop);
   if (measuredTop !== top) {
     pop.style.top = `${measuredTop}px`;
   }
   ```

   `POPOVER_NOMINAL_HEIGHT` stays — it's now the fallback that bounds
   first-paint placement. Do NOT remove it; do NOT inline it. Leaving it
   in keeps the PRO-64 placement code path semantically identical for
   empty-thread popovers and provides a reasonable estimate while the
   popover renders.

   `POPOVER_NOMINAL_WIDTH` is unchanged — popover width is fixed at
   `max-width:300px;min-width:220px`, so the existing horizontal clamp
   is already correct.

### 7f. Realtime: wire bus subscriptions for the open popover

Right before `this.popover = pop`:

```ts
this.openPopoverParentId = record.id;

const offReplied = this.bus.on("feedback:replied", (reply) => {
  if (reply.parentId !== record.id) return;
  if (reply.authorName === ensureAuthor() && /* same id as our just-sent */
      thread.querySelector(`[data-reply-id="${reply.id}"]`)) return;
  renderThread();
  pop.scrollTop = pop.scrollHeight;
});

const offDeleted = this.bus.on("feedback:deleted", (id) => {
  // If the deleted id belongs to a reply in this thread (or the parent
  // itself), re-render. The parent-delete case is handled by the popover
  // closing in its own delete handler — but realtime DELETE arriving from
  // another window for the parent still needs to close us.
  if (id === record.id) { this.closePopover(); return; }
  if (thread.querySelector(`[data-reply-id="${id}"]`)) {
    renderThread();
  }
});

this.popoverDisposers.push(offReplied, offDeleted);
```

Mark each reply row with `data-reply-id` to make these checks cheap.

The "echo-suppression" check (the line guarding against re-rendering a
reply the local user just sent) is defensive: `addReply` already pushed
to cache, and our own send-handler called `renderThread()` already.
Skipping the duplicate render is purely a paint-optimization — safe to
omit if it complicates code. (Keep it simple in first pass; profile if
needed.)

### 7g. `closePopover` cleanup

```ts
private closePopover(): void {
  if (!this.popover) return;
  this.popover.remove();
  this.popover = null;
  this.openPopoverParentId = null;
  for (const off of this.popoverDisposers) off();
  this.popoverDisposers = [];
}
```

### 7h. Parent delete inside `openPopover`

The existing `deleteBtn` handler stays. After `this.store.delete(record.id)`
the cascade runs (LS or DB), the popover closes, and `this.refresh()`
re-renders markers. Replies have no markers, so `refresh()` doesn't try
to draw them. ✓

---

## 8. `src/index.ts`

Three small changes:

### 8a. Pass `onReply` / `onReplyDeleted` to `CloudStore`

```ts
cloudStore = new CloudStore({
  url: config.supabaseUrl as string,
  apiKey: config.supabaseKey as string,
  projectName: config.projectName,
  log,
  onChange: () => {
    markers.refresh();
    fab.updateCount(countActive(store.list()));
    drawer.refreshIfOpen();
  },
  onReply: (record) => bus.emit("feedback:replied", record),
  onReplyDeleted: (id) => bus.emit("feedback:deleted", id),
});
```

### 8b. `syncUi` already handles `feedback:deleted`; subscribe `feedback:replied` for completeness

```ts
bus.on("feedback:saved", syncUi);
bus.on("feedback:updated", syncUi);
bus.on("feedback:deleted", syncUi);
bus.on("feedback:replied", () => drawer.refreshIfOpen());
```

Why only `drawer.refreshIfOpen()` for replies and not full `syncUi`?

- `fab.updateCount(countActive(store.list()))`: `store.list()` already
  filters out `parentId`-bearing records (step 3d / 4d), so replies do
  NOT contribute to the active count. Calling it would be a no-op.
- `markers.refresh()`: replies have no markers, no need to re-render.
- `drawer.refreshIfOpen()`: the drawer only surfaces top-level comments
  in v1 (per spec § non-goals; see also Open Questions below). Calling
  it is also a no-op today, but it's the right place to wire any future
  "reply count badge" UI. Keep the wire for forward-compat; cost is one
  function call on a closed drawer.

### 8c. `countActive` audit

```ts
function countActive(records: readonly AnnotationRecord[]): number {
  return records.reduce((n, r) => n + ((r.status ?? "todo") !== "done" ? 1 : 0), 0);
}
```

Called with `store.list()`, which already excludes replies. No
double-filter needed — `countActive` operates on the already-filtered
top-level set. No change to this function. **Verify** by reading the
single call site (`index.ts:25, 83, 166, 191, 217, 254, 265, 280, 285,
289`) — every caller passes `store.list()`, never raw cache. ✓

---

## 9. `scripts/apply-migrations.sh` + `docs/self-hosting.md` + `docs/cloud-mode.md`

The `*.sql` glob in `apply-migrations.sh` already auto-applies any
present migration, including `0006`. The header comment lists migrations
explicitly (currently stops at `0004`); append `0005_repair_rls.sql` AND
`0006_replies.sql` so the list matches reality. PRO-65 left this stale;
this PR catches up.

`docs/self-hosting.md:63-66` and `docs/cloud-mode.md` need parallel
catch-up — one line each for `0005_repair_rls.sql` and `0006_replies.sql`.

---

## 10. `docs/data-model.md`

Add a short subsection: "Replies (`parent_id`)". Cover:

1. A reply is an `AnnotationRecord` where `parentId` is set.
2. `url` / `path` mirror the parent's.
3. Anchor / rect / kind / status / captured fields are all unset / zero.
4. Consumers grouping by `parentId` (null = top-level work item; set =
   reply folded into parent) is the load-bearing rule for the agent
   ingestion path.

Cross-link `docs/replies.md` for the full spec.

---

## 11. `docs/replies.md`

Apply the spec override fix:

1. Rename `0005_replies.sql` → `0006_replies.sql` in every body
   reference (§ "Migration", § "Implementation checklist" item 1).
2. Prepend a short preamble below the `Status:` line:

   > **Historical context (PRO-66):** This spec was drafted before
   > PRO-65 introduced `0005_repair_rls.sql`. The replies migration is
   > therefore numbered **`0006_replies.sql`** in implementation. The
   > body text below has been corrected; older references in git
   > history may still say `0005`.

This keeps a single source of truth and makes future re-reads
unambiguous.

---

## 12. Agent ingestion: `skills/apply-ccm-feedback/SKILL.md`, `scripts/feedback.ts`, `prompts/apply-feedback.md`

All three files exist in this repo (verified). The spec § "Agent
re-engagement" enumerates the partition-by-`parent_id` rules; the
implementation work is to surface them in each file at the appropriate
level of detail.

- **`skills/apply-ccm-feedback/SKILL.md`** — full treatment of the four
  rules (partition / fold / `question`-on-reply re-openable / re-apply
  → review), per spec § "Agent re-engagement (manual)".
- **`scripts/feedback.ts`** — wherever the script prints / serializes
  the row list, group by `parentId` and indicate replies as nested
  children of their parent in the output. One-line summary of the rule
  in the file's doc block.
- **`prompts/apply-feedback.md`** — one-line cross-reference to the
  SKILL rules, since this prompt restates the payload shape.

No new files to be invented. Scope-creep guard: if the changes here
balloon, defer the prompts file to a follow-up — the SKILL.md change is
the load-bearing one because Claude reads that on every apply run.

---

## 13. Build + verification

```
bun install            # if anything is out of date
bun run check          # tsc --noEmit, must be clean
bun run lint           # biome check, must be clean
bun run build          # esbuild → dist/w.js + public/w.js
```

Commit `dist/w.js` and `public/w.js` together with the source changes —
this repo commits the built artifact (see PRO-65: commit `16724f4`
"build: regenerate w.js for PRO-65"). One build commit per source PR is
the convention.

### Manual smoke (localStorage mode — the agreed verification floor)

1. Add a top-level comment. ✓ marker appears, FAB count = 1.
2. Click marker → popover open with empty thread + composer.
3. Type a reply, press Enter. Reply appears in thread, textarea clears.
4. Add 2 more replies. All three render oldest → newest.
5. Reload the page. Open the same comment's popover. All three replies
   are still there, same order.
6. Hover the middle reply, click `×`, confirm. Reply disappears from
   thread; other two stay; FAB count unchanged (still 1, replies don't
   inflate it).
7. Close popover. Click marker's delete in the popover button row,
   confirm. Marker gone, FAB count = 0. Reload → no records of any
   kind in `localStorage["ccm-feedback:<project>"]` (children cascaded).
8. Tall-thread sanity: add a comment near the bottom of the viewport,
   add 8 replies in it. Popover flips above the marker; thread
   scrolls inside the popover; nothing goes off-screen.

### Cloud-mode smoke (best-effort, two browser windows)

1. Reply in window A → appears live in window B's already-open
   popover.
2. Delete parent in window A → both the parent marker and the open
   popover state in window B clear (`feedback:deleted` arrives for the
   parent, then cascaded reply DELETE events for each child).
3. Open browser devtools console in both windows: no
   `console.error("[ccm-feedback] cloud delete no-op …")` lines. (If
   one fires, RLS regressed — PRO-65 hardening doing its job.)

---

## Out of scope (explicit)

- Marker reply-count badge. Deferred per spec § "Marker reply count
  (optional)". Would require `markers.ts` to call `listReplies` per
  entry on every `refresh()` — non-trivial perf cost on busy projects.
- Reply editing. v1 is post-only.
- Nested threads / reply-to-reply.
- `authorRole` column. Claude-authored replies use `authorName =
  "Claude"` (convention, not schema).
- Notifications / mentions / unread counts.
- Reply count surfaced in the drawer (PRO-58 navigator). Drawer stays
  top-level-only; "comments with replies" is not a v1 row badge.
- Path-scoping for replies. Replies inherit their parent's `path` but
  are never path-filtered for rendering — they only surface when the
  parent's popover is opened.

---

## Open questions for the implementer

1. **`src/author.ts` exists** — confirmed at
   `src/author.ts` (this worktree). `ensureAuthor()` is the right call.
   No new prompt UI.
2. **`apps/demo` or analogous skill scaffolding** — this repo is the
   single-script-tag widget; there is no `apps/demo` directory. The
   agent ingestion files (`skills/apply-ccm-feedback/SKILL.md`,
   `scripts/feedback.ts`, `prompts/apply-feedback.md`) live in this same
   repo and are in scope per step 12. If a separate
   apply-ccm-feedback skill repo exists outside this codebase (unknown
   from this worktree), file a follow-up to mirror the partition rule
   there.
3. **Wire `feedback:replied` into the navigator drawer (PRO-58)?**
   Plan says no for v1 — the drawer surfaces top-level comments only,
   and replies do not change marker visibility or FAB counts. The
   `drawer.refreshIfOpen()` call in step 8b is a no-op for now and
   exists purely as a forward-compat hook. If a reply-count badge or
   "comments with replies" row treatment is added later, that hook is
   already in place.
4. **Drawer reply count badge** — punt to a follow-up if requested.
   Not in v1 scope.
5. **Echo-suppression in the `feedback:replied` handler** — first pass
   can leave it out (simple `renderThread()` on every event). Add only
   if a visible flicker shows up under realtime traffic. Profile, don't
   guess.
6. **Migration list in `apply-migrations.sh` header comment + docs** —
   PRO-65 left these stale at `0004`. This PR adds `0005` *and* `0006`
   to the list. If a separate "docs catch-up" follow-up is preferred,
   carve out just the `0005` line into that ticket and add only `0006`
   here. The implementer's call; either keeps reality and docs in sync.

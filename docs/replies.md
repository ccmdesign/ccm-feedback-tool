# Feature spec: comment replies

Status: proposed · Scope: v1 (flat thread, no edit) · Owner: TBD ·
Baseline: branch `dev` after PRO-57 (status enum `todo|review|done|question`,
migrations through `0004_status_review.sql`)

> **Historical context (PRO-66):** This spec was drafted before PRO-65
> introduced `0005_repair_rls.sql`. The replies migration is therefore
> numbered **`0006_replies.sql`** in implementation. The body text below
> has been corrected; older references in git history may still say
> `0005`.

## Goal

Let a reviewer respond to an existing comment without dropping a new marker.
One comment → an ordered list of replies. One level deep only. Replies
inherit nothing visual: they have no anchor, no marker, no status, no kind.
They live entirely inside the comment's popover.

## Non-goals (v1)

- No reply-to-reply / nested trees. Flat list under the parent only.
- No editing a reply after posting.
- No per-reply status, kind, anchor, or position.
- No reply markers on the page. Replies are invisible until the parent
  popover is opened.
- No notifications / mentions / unread counts.

## Data model

Same table, self-referential parent. A reply is a degenerate
`AnnotationRecord`: identity + body fields populated, everything spatial
left at its column default.

### Type changes (`src/types.ts`)

Add one optional field to `AnnotationRecord`:

```ts
/** Set on reply records — points at the parent comment's id. Undefined for top-level comments. */
parentId?: string;
```

A "reply record" is just an `AnnotationRecord` where `parentId` is set.
It carries: `id`, `projectName`, `message`, `authorName`, `url`, `path`,
`viewport`, `userAgent`, `createdAt`, `parentId`. All anchor / rect / kind /
pin / area / status / captured fields stay at default (empty string / 0 /
undefined). `status` and `kind` are meaningless for replies and must not be
read or rendered for them.

`url` / `path` are copied verbatim from the parent so the Postgres `not null`
constraint on `url` is satisfied without a schema change to existing columns.

### Store contract (`src/store.ts`)

`SaveInput` is anchor-centric; replies don't fit it. Add a separate, narrow
input + two methods to `AnnotationStore`:

```ts
export interface ReplyInput {
  projectName: string;
  parentId: string;
  message: string;
  authorName: string;
  url: string;       // copied from parent
  path: string;      // copied from parent
  viewport: string;
  userAgent: string;
}

export interface AnnotationStore {
  // …existing…
  /** Replies for one parent, oldest-first (reply threads read top-to-bottom). */
  listReplies(parentId: string): AnnotationRecord[];
  addReply(input: ReplyInput): AnnotationRecord;
}
```

Add `buildReplyRecord(input: ReplyInput): AnnotationRecord` next to
`buildRecord` — same id/timestamp generation, empty anchor fields, `parentId`
set, no `status`/`kind`.

Ordering: top-level comments stay newest-first (`unshift`, unchanged).
Replies render **oldest-first** within a thread.

#### `Store` (localStorage)

- Replies live in the same `ccm-feedback:<project>` array as comments.
- `list()` / `listForPath()` must exclude `parentId`-bearing records so
  replies never become markers. Add `.filter(r => !r.parentId)` to both.
- `listReplies(pid)` = `load().filter(r => r.parentId === pid)` sorted by
  `createdAt` ascending.
- `delete(id)` of a parent must also delete every record whose
  `parentId === id` (cascade in app code — localStorage has no FK).
- `clear()` already nukes the whole key; unaffected.

#### `CloudStore` (Supabase)

- `init()` already fetches every row for the project — replies arrive in the
  same query for free. No second request, no path filter (replies have the
  parent's path but we never path-filter them).
- Cache stays one flat `AnnotationRecord[]`. `list()` / `listForPath()` add
  the same `!r.parentId` filter as `Store`.
- `addReply()` → `buildReplyRecord`, push to cache, `void pushInsert(record)`
  (reuses the existing insert path; `recordToRow` must emit `parent_id`).
- `delete(parentId)`: DB handles the cascade via
  `on delete cascade` (see migration). The client must also drop cached
  replies for that parent so the open popover updates without a round-trip.
- Realtime: the existing subscription filters `project_name=eq.<project>`,
  so reply INSERT/UPDATE/DELETE already stream on the same channel.
  - `onInsert`: if `row.parent_id` is set, it's a reply — push to cache and,
    if the parent's popover is open, append it live; do **not** create a
    marker.
    - `onDelete`: REPLICA IDENTITY FULL already includes `parent_id` +
    `project_name`, so cascade deletes arrive as individual DELETE events;
    drop them from cache and from any open thread.
  - Marker code must ignore any cache entry with `parentId` set (it already
    will, once `listForPath` filters them).

### `recordToRow` / `rowToRecord` (`src/cloud-store.ts`)

- `CloudRow` gains `parent_id?: string | null`.
- `rowToRecord`: `if (row.parent_id) record.parentId = row.parent_id;`
- `recordToRow`: `if (r.parentId) row.parent_id = r.parentId;`

## Migration: `supabase/migrations/0006_replies.sql`

Numbered **0006** — `0004_status_review.sql` and `0005_repair_rls.sql`
already exist on `dev` (PRO-57 + PRO-65). This migration runs strictly
after them.

```sql
alter table public.ccm_widget_annotations
  add column if not exists parent_id uuid
    references public.ccm_widget_annotations(id) on delete cascade;

create index if not exists ccm_widget_annotations_parent_idx
  on public.ccm_widget_annotations (parent_id);
```

Notes:
- `on delete cascade` makes parent deletion remove replies server-side. With
  REPLICA IDENTITY FULL (migration 0003) each cascaded delete still emits a
  realtime DELETE carrying `project_name`, so other clients stay consistent.
- Existing RLS policies are row-level and unconditional (`using (true)`), so
  reply rows are covered with no policy change. Document in
  `prompts/harden-rls.md` follow-up that tightened policies must also allow
  `parent_id`-bearing inserts.
- `status` / `kind` CHECK constraints already permit the row defaults
  (`'todo'` / `'target'`) replies carry. The status CHECK is now
  `todo|review|done|question` (0004); `'todo'` still satisfies it. No
  constraint change needed.

Self-hosters run `0006` after `0001`–`0005`. Add it to
`scripts/apply-migrations.sh`, `docs/self-hosting.md`, and
`docs/cloud-mode.md` migration lists.

## UI (`src/markers.ts` → `openPopover`)

The popover today is: tags row · body · meta · button row. Insert a thread
section **between meta and the button row**:

```
┌ tags (status pill · kind badge) ┐
│ body (parent message)           │
│ meta (author · time)            │
│ ── divider ──                   │
│ replies list (oldest → newest)  │   ← new
│   ↳ author · time               │
│     message                     │
│     [×]  (delete, on hover)     │
│ reply composer                  │   ← new
│   textarea + Send               │
└ button row (Close · Delete) ────┘
```

Behavior:

- **Replies list**: `store.listReplies(record.id)`. Each row: small
  author·time line in `textTertiary`, message below in `text`,
  `white-space:pre-wrap`. Empty thread → render nothing (no "no replies"
  placeholder; keep the popover compact).
- **Composer**: a `textarea` (reuse popup styling tokens) + a Send button
  using the existing accent button style. Enter submits, Shift+Enter
  newlines, ⌘/Ctrl+Enter also submits (match `popup.ts` hint convention).
  Blank / whitespace-only message is rejected (no-op, no error toast).
- On send: `store.addReply({ projectName, parentId: record.id, message,
  authorName: getAuthorName(), url: record.url, path: record.path,
  viewport, userAgent })`, clear the textarea, re-render the thread,
  keep the popover open and scrolled to the newest reply.
- **Delete a reply**: a small `×` affordance per reply (hover-revealed,
  like the comment delete). Confirm via `window.confirm`
  (`marker.replyDeleteConfirm`). `store.delete(replyId)` →
  `bus.emit("feedback:deleted", replyId)` → re-render thread only (do **not**
  `refresh()` all markers; replies have none).
- **Author name**: reuse the same source comments use
  (`src/author.ts`). No new prompt.
- **Popover sizing**: the popover is fixed-position with hardcoded
  `max-width:300px` and a 180px height assumption for flip logic
  (`markers.ts:277`). A thread can be tall — add `max-height` +
  `overflow-y:auto` to the popover and recompute the flip threshold from
  the actual rendered height instead of the 180 constant. Call this out as
  the one non-trivial layout change.
- **Realtime**: when a reply INSERT/DELETE arrives for the parent whose
  popover is open, re-render the thread in place. If the popover is closed,
  cache update only — no marker change.

### Marker reply count (optional, flag as stretch)

Showing a small badge with the reply count on the marker is desirable but
**out of v1 scope** unless cheap: it requires `markers.ts` to know reply
counts at render time, which means `refresh()` calling `listReplies` per
entry. Defer; spec separately if wanted.

## i18n (`src/i18n.ts`)

English-only today (the file's locale map is a stub). Add:

```ts
"marker.replies.heading": "Replies",
"marker.reply.placeholder": "Write a reply…",
"marker.reply.send": "Reply",
"marker.reply.delete": "Delete reply",
"marker.replyDeleteConfirm": "Delete this reply? This cannot be undone.",
```

(`marker.replies.heading` only rendered when ≥1 reply.)

## Events (`src/events.ts`)

Reuse `feedback:deleted` for reply deletes. Add `feedback:replied` carrying
the new reply's id so host integrations can observe thread activity,
mirroring the existing `feedback:deleted` shape. No new bus surface beyond
that one event.

## Agent re-engagement (manual)

Re-engagement is **manual** — there is no auto-trigger, no `needs-claude`
status, no owner field. The human re-invokes Claude by hand ("I added
replies to the comments, check them again"). Replies are the channel that
carries that clarification; the state machine is unchanged.

This places exactly **one** hard requirement on the agent ingestion path
(`skills/apply-ccm-feedback/SKILL.md`, `scripts/feedback.ts`, the netlify
`/feedback` payload — all read the same rows):

> **Reply rows are never standalone work items.** They have empty anchor
> fields and would otherwise fail source-mapping and false-escalate.

The skill must, on every run:

1. **Partition rows by `parent_id`.** `parent_id IS NULL` → a comment (a work
   item, mapped to source as today). `parent_id` set → a reply, folded into
   its parent's thread. Never source-map or status a reply row directly.
2. **Fold replies into the parent as conversation context.** When reading a
   comment's `message`, append its replies oldest→newest. Treat the **latest
   human reply as the current directive** — it supersedes the original
   `message` where they conflict (the reviewer is clarifying/redirecting).
3. **`question` items with a human reply are re-openable.** The standing rule
   ("agents don't act on `question`, don't re-status it") holds *until* a
   human reply arrives. A reply on a `question` is the human answering their
   own question / redirecting — re-read it as a directive and proceed as for
   `todo`. Without this, the diagram's escalate→reply→Claude arrow is inert.
4. **Re-apply + re-`review` as normal.** A comment already at `review` with a
   newer human reply = "your edit wasn't right, here's more" — re-apply
   against the latest reply, set back to `review`. (`review`+`todo` are
   already kept; `done` still filtered out.)

### Claude-authored replies (optional, convention not schema)

If the agent posts a reply back (e.g. "couldn't locate — point me at the
component", or a one-line note on what it changed), it sets
`authorName = "Claude"` (or the configured agent name). **No `authorRole`
column for v1** — manual mode means Claude identifies its own prior replies
by author-name convention when re-reading, and humans get provenance from
the name. Posting a reply is optional; the agent's primary response stays
the code edit + `review` status + its Claude Code chat report.

## Edge cases

- **Parent deleted while popover open elsewhere**: realtime DELETE removes
  parent + cascaded replies from cache; the open popover's parent marker is
  gone on next `refresh()`. Acceptable — same as deleting any comment today.
- **Reply arrives for a comment on another page**: cached, never rendered as
  a marker (no `parentId` markers), surfaces when that comment's popover is
  opened. No path scoping needed for replies.
- **localStorage cascade**: app-code cascade in `Store.delete` must run
  before `persist`; a crash between delete-parent and delete-children would
  orphan replies. Single synchronous `filter` over the array avoids this.
- **Export / agent ingestion**: `export-utils.ts` (and the netlify
  `/feedback` endpoint, byte-identical payload) dumps the whole store —
  replies included, as records with `parentId`. Every consumer (the
  `apply-ccm-feedback` skill, `scripts/feedback.ts`) MUST group by
  `parentId` (null = top-level work item; set = reply folded into parent).
  See "Agent re-engagement (manual)" — this is the load-bearing rule, not a
  nicety. No export format change; `data-model.md` documents the grouping.
- **Offline cloud insert**: reply insert is fire-and-forget like comments;
  on network failure the cached reply persists locally and a `console.warn`
  fires. Same consistency story as comment insert — acceptable for v1.

## Verification

No test suite. Before merge:

- `bun run check` + `bun run lint` clean.
- Manual: localStorage mode — add comment, open popover, add 3 replies,
  reload, replies persist and read oldest→newest; delete one reply; delete
  parent, replies gone.
- Manual: cloud mode (two browser windows) — reply in A appears in B's open
  popover live; delete parent in A cascades replies out of B.
- Tall thread: popover scrolls, flips correctly near viewport bottom.

## Implementation checklist

1. `0006_replies.sql` + register in `scripts/apply-migrations.sh`, add to
   self-hosting / cloud-mode docs.
2. `types.ts`: `parentId?: string`.
3. `store.ts`: `ReplyInput`, `buildReplyRecord`, `listReplies`, `addReply`;
   add `!parentId` filter to `Store.list/listForPath`; cascade in
   `Store.delete`.
4. `cloud-store.ts`: `CloudRow.parent_id`, row mappers, `listReplies`,
   `addReply`, cache cascade on parent delete, realtime reply routing,
   `!parentId` filter on `list/listForPath`.
5. `i18n.ts`: reply strings.
6. `events.ts`: `feedback:replied`.
7. `markers.ts`: thread render + composer + per-reply delete in
   `openPopover`; popover `max-height`/scroll + height-based flip fix.
8. `skills/apply-ccm-feedback/SKILL.md`: add the `parent_id` partition rule
   (replies never standalone) + fold-replies-as-conversation + `question`
   re-openable-on-reply + Claude-authored reply name convention. Mirror the
   one-line grouping rule into `scripts/feedback.ts` list output and
   `prompts/apply-feedback.md` if it restates the payload shape.
9. `docs/data-model.md`: document `parentId` + reply grouping.
10. Verify per above.

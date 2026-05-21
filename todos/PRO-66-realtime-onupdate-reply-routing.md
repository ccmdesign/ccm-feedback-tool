# PRO-66 — realtime `onUpdate` does not branch on `parent_id`

**Severity:** P3
**File:** `src/cloud-store.ts:259-269`
**Status:** open

## Observation

The realtime handlers for INSERT and DELETE branch on `row.parent_id` and
route reply events through `onReply` / `onReplyDeleted` (bypassing
`onChange`). `onUpdate` does not — every UPDATE fires `onChange`,
regardless of whether the row is a reply.

```ts
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
```

## Why this is P3 (not P1 or P2)

- v1 has **no edit-reply feature**. The widget never PATCHes a reply row.
- The only realistic UPDATE on a reply is an external operator running SQL
  by hand. In that case firing `onChange()` (which calls
  `markers.refresh()`) is wasteful but harmless — the marker layer filters
  by `!r.parentId`, so the reply row stays invisible.

## Risk for the future

When edit-reply (v2) ships, this handler will need to branch on
`parent_id`. Forgetting at that point would cause:
- Marker layer to refresh on every reply edit (cheap but visible flicker)
- Drawer (when it grows reply visibility) to re-render

## Suggested fix

Mirror the INSERT/DELETE shape. Skip when no v2 feature uses it; or land
proactively to remove a future footgun:

```ts
onUpdate: (raw) => {
  const row = raw as unknown as CloudRow;
  const next = rowToRecord(row);
  const idx = this.cache.findIndex((r) => r.id === next.id);
  if (idx === -1) {
    this.cache.unshift(next);
  } else {
    this.cache[idx] = next;
  }
  if (next.parentId) {
    // Reply UPDATE — replies don't affect markers/drawer. Fire onReply
    // as the conventional "reply changed" signal; popovers re-render via
    // the bus subscription that already handles inserts.
    this.onReply(next);
    return;
  }
  this.onChange();
},
```

## Out of scope for safe_auto

The decision to fire `onReply` vs a new `onReplyUpdated` callback is a
design choice. Until v2 lands edit-reply, deferring is fine.

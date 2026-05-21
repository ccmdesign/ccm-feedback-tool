# Cloud mode

Cloud mode persists annotations to a Supabase Postgres table and streams cross-browser updates over Supabase Realtime. It's optional — without it, the widget runs in localStorage-only mode and needs no backend.

## When to use it

| Use cloud mode when…                                 | Use local mode when…                                |
| ---------------------------------------------------- | --------------------------------------------------- |
| Multiple reviewers need to see each other's pins     | One reviewer per browser is fine                    |
| Reviewers move between devices                       | Reviewer always uses the same machine               |
| You want a server-side audit trail                   | Ephemeral, hand-the-JSON-to-a-dev workflow is fine  |
| You're OK running a Supabase project                 | You don't want any infra                            |

Local mode is the default. You opt in to cloud mode by passing `data-supabase-url` + `data-supabase-key`.

## Schema

Cloud mode requires nine migrations applied in order: `0001_init.sql`, `0002_status_pin_area.sql`, `0003_realtime.sql`, `0004_status_review.sql`, `0005_repair_rls.sql`, `0006_replies.sql`, `0007_sequence_number.sql`, `0008_sequence_unique.sql`, `0009_sequence_hwm.sql`. Each is idempotent. `0005` repairs the anon RLS policies from `0001` (some live projects had `anon update` missing or altered); `0006` adds the self-referential `parent_id` FK that powers comment replies; `0007` adds the persisted `sequence_number` column + BEFORE INSERT trigger that maintains the per-project `#N` identifier; `0008` hardens that trigger against concurrent INSERTs (advisory transaction lock per `project_name`) and adds a unique partial index `(project_name, sequence_number) WHERE parent_id IS NULL` as a safety net; `0009` introduces the per-project `ccm_widget_project_meta` HWM table and replaces the trigger body with read-and-bump semantics against that slot so deleting the highest-numbered comment no longer recycles its number (PRO-81). See [self-hosting.md](self-hosting.md#step-2--run-the-migrations) for the full list and how to apply them.

## How it works

The widget speaks **raw PostgREST + Realtime** — no `@supabase/supabase-js` SDK. This keeps the bundle small (~30 KB minified) and avoids version drift.

### Read on init

When the widget mounts, `CloudStore.init()` does a single fetch:

```http
GET /rest/v1/ccm_widget_annotations?project_name=eq.<projectName>&order=created_at.desc
apikey: <anonKey>
Authorization: Bearer <anonKey>
```

Rows come back as JSON. They're cached in memory (`this.cache`) and used to populate markers.

### Cache-and-sync writes

Every write (`save`, `updateStatus`, `delete`, `clear`) is **synchronous against the in-memory cache** and **fire-and-forget against the network**:

```ts
save(input) {
  const record = buildRecord(input);
  this.cache.unshift(record);     // immediate UI update
  void this.pushInsert(record);   // POST in background
  return record;
}
```

If the network call fails, the cache stays consistent and a `console.warn` is logged. The widget never blocks the UI on network IO.

### Realtime subscription

After `init()` succeeds, `CloudStore` opens a WebSocket to `wss://YOURREF.supabase.co/realtime/v1/websocket` and subscribes to `INSERT`, `UPDATE`, `DELETE` on `public.ccm_widget_annotations` filtered to `project_name=eq.<projectName>`.

Inbound events update the cache and call `onChange()`, which re-renders markers. This is what makes "open in another browser, pin appears within a second" work.

`0003_realtime.sql` enables this by adding the table to `supabase_realtime` and setting `replica identity full` (so DELETE events include the `project_name` column for the filter).

### Project scoping

Every read and the realtime subscription filter by `project_name=eq.<projectName>`. The same Supabase project can host annotations for many sites — they don't collide because each site sets a distinct `data-project` value.

This is a cooperation contract, not a security boundary. With permissive RLS, any client with the anon key can write any `project_name`. To enforce isolation, scope your RLS policies (see [self-hosting.md](self-hosting.md#3-rls-policies--tighten-before-public-exposure)).

## Conflict semantics

There's no merge logic. Last write wins:

- **Concurrent inserts**: both succeed, both render. New rows go to the top of the list (`created_at desc`).
- **Concurrent updates**: the later `updated_at` wins per Postgres. Realtime delivers both events; the cache reflects whichever arrived last.
- **Delete during edit**: if reviewer A deletes a pin while reviewer B is updating it, reviewer B's update may either succeed (resurrecting the row) or fail with a 404, depending on order. This is rare and acceptable for a review tool — not a Google-Docs replacement.

If you need real OT/CRDT semantics, ccm-feedback is the wrong tool.

## Share endpoint (`/feedback`)

Cloud mode unlocks a server-side share path so an agent can be handed a project's feedback by **URL** instead of a downloaded file.

```http
GET /feedback?project=<name>
```

This is the Netlify function `netlify/functions/feedback` (wired via `netlify.toml`: `[functions]` dir + a `/feedback` rewrite). It:

- Reads `SUPABASE_URL` + `SUPABASE_ANON_KEY` from **server-side Netlify env vars only**. The anon key is never returned to the client and never inlined into `w.js` or any client asset. The **service-role key is never used.**
- Queries `GET {SUPABASE_URL}/rest/v1/ccm_widget_annotations?project_name=eq.<name>&order=created_at.desc` with the anon key as `apikey` + `Authorization` headers.
- Maps each row snake_case → camelCase (same field mapping as `rowToRecord()` in `src/cloud-store.ts`) and responds with the **exact `exportAsJson()` shape**: `{ projectName, exportedAt, count, annotations }`.
- Is **read-only**: only `GET` (+ `OPTIONS` preflight). No `POST`/`PATCH`/`DELETE`; it never accepts a key from the client.
- Returns generic errors — `400` (missing `?project`), `405` (non-GET), `5xx` (upstream/config). The upstream Supabase body is never forwarded (an auth-error body could echo the key).
- Sends `Access-Control-Allow-Origin: *` for GET so an agent on any origin can `WebFetch` it.

To deploy it on your own host, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (anon only) in your Netlify site's environment variables. `netlify.toml` documents this requirement in a comment; no secret is committed.

The widget's FAB exposes a **"Copy feedback URL"** action in cloud mode that copies `<site>/feedback?project=<name>` (the reviewed site's own origin) to the clipboard. In localStorage mode that item is visibly disabled with a tooltip — there is no server-side data to serve — and Export JSON remains the always-available fallback.

The `apply-ccm-feedback` skill consumes either the URL or a downloaded JSON file (identical shape) and, after applying each edit, sets the handled comment's status to `review` (via `bun run feedback set-status <id> review` or a PostgREST PATCH). It **never** sets `done` — a human verifies in the widget and flips `review` → `done`.

## Auth model

The widget uses the **anon (publishable) key**. It's expected to be in the browser. Security comes from RLS, not key secrecy.

The **service-role key** is never used by the widget runtime. If you put it in `data-supabase-key`, you've handed full DB access to anyone who views the page source. Don't.

## Localhost behavior

In `src/index.ts`:

```ts
const local = isLocalHost(window.location.hostname);
// ...
...(!local && currentScript.dataset.supabaseUrl ? { supabaseUrl: ... } : {}),
...(!local && currentScript.dataset.supabaseKey ? { supabaseKey: ... } : {}),
```

`localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, `*.local`, `*.localhost` → cloud mode is forced off, even if `data-supabase-*` are set. This prevents dev sessions from polluting the production demo DB. To test cloud mode end-to-end, deploy to a preview URL.

## Failure modes

| Symptom                                          | Likely cause                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `cloud fetch failed: 401`                        | Wrong anon key, or RLS blocks anon SELECT.                                        |
| `cloud insert failed: 403`                       | RLS blocks anon INSERT — check your policies.                                     |
| Pins save locally but don't appear elsewhere     | Realtime not enabled. Run `0003_realtime.sql`.                                    |
| DELETE doesn't sync to other browsers            | Same — `replica identity full` missing means DELETE events lose the filter column. |
| Widget works on production but not local         | Expected — cloud mode is disabled on localhost. Test on a deployed URL.           |
| Network panel: requests to `qnkvkumtssihbjmocbtv.supabase.co` | That's the maintainer's demo project. You're using the public CDN build with `data-supabase-*` unset — local mode is on, the URL probably comes from another widget. |

Enable `data-debug="true"` on the script tag to log every cloud op to the console.

## Known limitations

- **Sequence-number issuance is HWM-backed** (PRO-81 §8, supersedes PRO-68). The `#N` identifier on every top-level comment is assigned by a BEFORE INSERT trigger that read-and-bumps a per-project slot in `ccm_widget_project_meta` (migration `0009`). The slot is never decremented by any code path (single delete, cascade delete, bulk clear, undo), so deleting `#3` from `#1, #2, #3` leaves the next insert at `#4`, not `#3`. Concurrent inserts on the same project are serialized by the advisory transaction lock carried from `0008`, and the unique partial index on `(project_name, sequence_number) WHERE parent_id IS NULL` from `0008` remains as a defense-in-depth safety net. Local-mode `Store` enforces the same contract via a sibling localStorage key (`ccm-feedback:<project>:seq-hwm`).
- **`#?` placeholder during optimistic insert.** The cloud `save()` path inserts the local row with no `sequenceNumber` and renders `#?` until the realtime echo carrying the trigger-assigned number arrives (~1 RTT). Markers and the drawer use the same `?` fallback that covers pre-PRO-68 legacy rows, so no UI code change is required for the placeholder window.
- **`migrateFromLocal` preserves client sequence numbers.** PRO-81 reversed the prior strip-on-migrate behavior: local numbers are now canonical (the localStorage path uses the HWM mechanism, same contract as cloud), so the migration POST carries each row's `sequence_number` through and the server trigger fast-forwards the per-project meta slot when a supplied number is at or above its current value. A migration that includes `#70` leaves the slot at `>= 71`, so future cloud inserts don't collide.

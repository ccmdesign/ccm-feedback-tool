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

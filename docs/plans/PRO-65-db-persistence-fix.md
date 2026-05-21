---
title: "fix: PRO-65 — DB persistence regression in cloud mode"
type: fix
status: active
created: 2026-05-21
ticket: PRO-65
depth: standard
---

# fix: PRO-65 — DB persistence regression in ccm-feedback cloud mode

## Summary

In cloud mode the widget appears to mutate annotations (status cycle, delete, clear) but the changes vanish on hard-reload. Three independent root causes were diagnosed against the production Supabase project (`qnkvkumtssihbjmocbtv`):

1. **Anon `UPDATE` RLS is broken on the prod DB.** `PATCH ?id=eq.<known-row>` with `{"status":"done"}` using the anon key returns HTTP 200 with `content-range: */0` (zero rows touched). The same PATCH with the service-role key returns 200 with `content-range: 0-0/1`. The `"anon update"` policy declared in `supabase/migrations/0001_init.sql` (`using (true) with check (true)`) is either missing or has been altered on the live project. Anon `SELECT` is fine, which is why reads look normal.
2. **CHECK constraint on `status` is missing `'review'`.** Service-role `PATCH {"status":"review"}` returns HTTP 400 / `23514` `violates check constraint "ccm_widget_annotations_status_check"`. Migration `0004_status_review.sql` widens the constraint to include `review` but was never applied to the production project.
3. **The widget silently treats a zero-row PATCH as success.** `src/cloud-store.ts` `pushUpdate` (and the parallel `pushDelete` / `pushClear`) only checks `res.ok`. PostgREST returns HTTP 200 for an UPDATE that matched zero rows under RLS — the widget treats the no-op as success, the optimistic cache stays "updated", and nothing surfaces in the console. This is what makes the DB bugs invisible until a hard-reload re-fetches from PostgREST.

Causes 1 and 2 are **DB-side, fixed by a new migration + a manual apply step against prod**. Cause 3 is **widget-side, fixed by parsing PostgREST's `Content-Range` response header** so a silent zero-row write logs an error.

---

## Problem Frame

PRO-57 shipped the `review` status across the type system, popover, marker color map, drawer filter chips, and `src/i18n.ts`. PRO-58 shipped the drawer. Both flows write through `CloudStore.updateStatus()` → `pushUpdate()`. In local-only mode (`Store` against `localStorage`) status cycling persists across reloads. In cloud mode it does not — the on-page UI updates because the optimistic cache update succeeds, but the network UPDATE silently fails on the server and the next page load shows the old value.

The maintainer's diagnosis already isolated the three causes via direct curl against the prod PostgREST endpoint with the anon key vs the service-role key. This plan implements the fixes; it does not re-diagnose.

---

## Scope Boundaries

**In scope:**

- New idempotent migration `supabase/migrations/0005_repair_rls.sql` that drops + re-creates the four anon policies (`anon read`, `anon insert`, `anon update`, `anon delete`) with permissive defaults, mirroring `0001`.
- Documented manual apply procedure (Supabase SQL editor or `supabase db push`) + curl acceptance probes for the implementer/operator to run against prod after applying `0004` and `0005`.
- Harden `src/cloud-store.ts`:
  - Add `Prefer: count=exact` to the request that `pushUpdate`, `pushDelete`, and `pushClear` issue (NOT `pushInsert`, which already returns the row via `Prefer: return=representation`).
  - Parse the `Content-Range` response header on update/delete calls and `console.error` a clear message when `res.ok` but the row count is `0`.
  - `pushClear` (multi-row): verify `Content-Range` matches the expected count; `console.warn` on mismatch.
- Note (no edit unless warranted) in `CLAUDE.md` about the RLS contract + count assertion. Only add if the architectural note is justified — do not edit unrelated docs.

**Out of scope (explicitly):**

- Do NOT rewrite `cloud-store.ts` to use the Supabase JS SDK. The raw-fetch contract is intentional (no SDK dep, smaller bundle).
- Do NOT change the realtime subscription path (`src/realtime.ts`).
- Do NOT touch `src/markers.ts` (PRO-64 popover paint, shipped).
- Do NOT change the optimistic-cache strategy. The user already saw the local mutation; the only behavior change is *detecting* the silent server-side failure and logging it.
- Do NOT make `cycleStatus` async or otherwise change the public store contract. The push functions stay fire-and-forget.
- Do NOT add the migration runner to CI — the maintainer applies migrations manually via Supabase SQL editor or `supabase db push`.
- Do NOT commit any real key, JWT, or service-role token into the repo. All sample curl commands in the plan reference env vars (`$SUPABASE_URL`, `$ANON_KEY`, `$SERVICE_KEY`).

---

## Key Technical Decisions

### D1. New migration `0005_repair_rls.sql` instead of editing `0001_init.sql`

Migrations are append-only history. Editing `0001` would break self-hosters who have already run it. A new `0005` that idempotently drops + re-creates the four anon policies is safe on:
- Fresh projects (where `0001` already created them — `drop policy if exists` is a no-op, then `create policy` re-asserts).
- The broken prod project (where the `anon update` policy is missing or altered — drop+create restores it).
- Already-repaired projects (re-running is a no-op).

The migration's top comment must explain the bug it repairs and reference PRO-65 so future maintainers understand why a "redundant" policy migration exists.

### D2. `Prefer: count=exact` on UPDATE/DELETE/CLEAR only

PostgREST's `Content-Range` response header reports affected-row count only when the request opts in via `Prefer: count=exact` (or `count=planned`/`count=estimated`). `exact` is fine here — we are writing one row at a time on UPDATE/DELETE and a small known list on CLEAR. Adding it to `pushInsert` is unnecessary (we already use `return=representation` and parse the returned row to confirm insert).

The widget already sets a shared `Prefer: return=representation` header in the constructor. The per-call header for UPDATE/DELETE/CLEAR must combine both: `Prefer: return=representation, count=exact`. Multiple `Prefer` tokens are comma-separated per RFC 7240. Do not overwrite the constructor header globally — build the per-call header from `{ ...this.headers, Prefer: "return=representation, count=exact" }`.

### D3. `console.error` (not `console.warn`) for the zero-row no-op

The existing failure paths use `console.warn`. A silent zero-row UPDATE is a *correctness* failure (the user thinks they saved; the DB disagrees) and is the exact symptom this ticket fixes. `console.error` makes it stand out from the existing network warnings and is loud enough that a developer running the host page will see it without opening the warning filter.

Message format:
`[ccm-feedback] cloud update no-op: id=<id> — possible RLS misconfiguration or stale id`

Same shape for delete:
`[ccm-feedback] cloud delete no-op: id=<id> — possible RLS misconfiguration or stale id`

`pushClear` uses `console.warn` (not error) with the row-count mismatch:
`[ccm-feedback] cloud clear partial: expected <N> deleted <M>`

### D4. Keep optimistic cache; do not roll back on detected no-op

The user already saw the marker change color (or disappear). Rolling back the local cache after the fact would create a worse UX than the silent failure: the row would visually "snap back" to the old state seconds later with no explanation. The console.error is the signal — the operator follows up by checking RLS, and once policies are repaired the next mutation is real. The plan stays conservative on user-visible behavior and only improves diagnostics.

### D5. Manual apply, not automated

`supabase db push` requires the maintainer's CLI to be linked to the prod project; the agent in the worktree cannot do this safely (and the repo CLAUDE.md notes the widget runtime never reads env vars). The plan documents the apply step + acceptance probes; the implementer runs them.

---

## Implementation

### Step 1 — Write `supabase/migrations/0005_repair_rls.sql`

Idempotent. Drops + re-creates the four anon policies with the same permissive defaults as `0001`. Top comment references PRO-65 and explains the bug it repairs.

Shape (matching the style of `0001` and `0004`):

```sql
-- Repairs anon RLS on ccm_widget_annotations (PRO-65).
--
-- The "anon update" policy declared in 0001_init.sql allows the anon role to
-- update any row in the project namespace (using (true) with check (true)).
-- On at least one live Supabase project (qnkvkumtssihbjmocbtv) this policy
-- was missing or altered, causing PATCH requests with the anon key to return
-- HTTP 200 with content-range: */0 (zero rows affected). Anon SELECT was
-- unaffected, which is why reads looked normal but status cycles did not
-- persist across reloads.
--
-- This migration drops + re-creates all four anon policies (read/insert/
-- update/delete) with the same permissive defaults as 0001. Safe to re-run.
-- Self-hosters who have tightened these policies in their own follow-up
-- migration should review before applying.

drop policy if exists "anon read"   on public.ccm_widget_annotations;
drop policy if exists "anon insert" on public.ccm_widget_annotations;
drop policy if exists "anon update" on public.ccm_widget_annotations;
drop policy if exists "anon delete" on public.ccm_widget_annotations;

create policy "anon read"
  on public.ccm_widget_annotations
  for select
  to anon
  using (true);

create policy "anon insert"
  on public.ccm_widget_annotations
  for insert
  to anon
  with check (true);

create policy "anon update"
  on public.ccm_widget_annotations
  for update
  to anon
  using (true)
  with check (true);

create policy "anon delete"
  on public.ccm_widget_annotations
  for delete
  to anon
  using (true);
```

### Step 2 — Apply `0004` and `0005` to the prod DB (manual operator step)

Apply both migrations to `qnkvkumtssihbjmocbtv` via the Supabase SQL editor (paste the file contents) or `supabase db push` if the CLI is linked. **The agent does not run this step from inside the worktree.**

Order matters: `0004` first (widens the CHECK constraint so `review` is legal), then `0005` (repairs the policies).

#### Acceptance probes (run with the maintainer's `.env` keys; never paste real values into committed files)

Set env vars in a local shell — do not commit them:

```bash
export SUPABASE_URL="https://qnkvkumtssihbjmocbtv.supabase.co"
export ANON_KEY="<value of ANON_PUBLIC_KEY from .env>"
export SERVICE_KEY="<value of ANON_SECRET_ROLE from .env>"
# Pick any known existing row id for the project. List with:
#   curl -s "$SUPABASE_URL/rest/v1/ccm_widget_annotations?project_name=eq.<your-project>&select=id&limit=1" \
#     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
export ROW_ID="<uuid>"
```

**Probe A — `0004` applied, `review` accepted by CHECK:**

```bash
curl -i -X PATCH "$SUPABASE_URL/rest/v1/ccm_widget_annotations?id=eq.$ROW_ID" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: count=exact" \
  -d '{"status":"review"}'
```
- Expected: `HTTP/2 200` with `content-range: 0-0/1`. No `23514`.
- Before-fix: `HTTP/2 400` with body containing `violates check constraint "ccm_widget_annotations_status_check"`.

**Probe B — `0005` applied, anon UPDATE actually writes:**

```bash
curl -i -X PATCH "$SUPABASE_URL/rest/v1/ccm_widget_annotations?id=eq.$ROW_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: count=exact" \
  -d '{"status":"done"}'
```
- Expected: `HTTP/2 200` with `content-range: 0-0/1`.
- Before-fix: `HTTP/2 200` with `content-range: */0`.

**Probe C — anon DELETE actually deletes (optional; pick a throwaway row):**

```bash
curl -i -X DELETE "$SUPABASE_URL/rest/v1/ccm_widget_annotations?id=eq.$THROWAWAY_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact"
```
- Expected: `HTTP/2 204` (or `200` depending on PostgREST) with `content-range: 0-0/1`.

Once Probes A and B pass, the DB-side fixes are in.

### Step 3 — Harden `src/cloud-store.ts`

Three private methods change: `pushUpdate`, `pushDelete`, `pushClear`. `pushInsert` is left alone (it already round-trips the inserted row).

The helper that parses `Content-Range` is small and local — no new file. Suggested shape (the implementer may inline or factor as preferred):

```ts
// Parse a PostgREST Content-Range header like "0-0/1", "*/0", or "0-2/3".
// Returns the affected-row count from the slash-N suffix, or null if the
// header is missing or malformed.
function parseContentRangeCount(header: string | null): number | null {
  if (!header) return null;
  const slash = header.lastIndexOf("/");
  if (slash === -1) return null;
  const tail = header.slice(slash + 1).trim();
  if (tail === "" || tail === "*") return null;
  const n = Number(tail);
  return Number.isFinite(n) ? n : null;
}
```

**`pushUpdate`** — request header includes `count=exact`; after `res.ok`, parse `Content-Range`; if count is `0`, `console.error` and return:

```ts
const res = await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(id)}`, {
  method: "PATCH",
  headers: { ...this.headers, Prefer: "return=representation, count=exact" },
  body: JSON.stringify(patch),
});
if (!res.ok) {
  const body = await res.text();
  console.warn(`[ccm-feedback] cloud update failed: ${res.status} ${body}`);
  return;
}
const count = parseContentRangeCount(res.headers.get("Content-Range"));
if (count === 0) {
  console.error(
    `[ccm-feedback] cloud update no-op: id=${id} — possible RLS misconfiguration or stale id`,
  );
}
```

**`pushDelete`** — same shape. PostgREST DELETE without `return=representation` usually returns `204`, but adding `count=exact` makes it return `200` with `Content-Range`. The existing `this.headers.Prefer` already includes `return=representation`, so combining the two via `Prefer: return=representation, count=exact` keeps the existing behavior and adds the count header:

```ts
const res = await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(id)}`, {
  method: "DELETE",
  headers: { ...this.headers, Prefer: "return=representation, count=exact" },
});
if (!res.ok) {
  const body = await res.text();
  console.warn(`[ccm-feedback] cloud delete failed: ${res.status} ${body}`);
  return;
}
const count = parseContentRangeCount(res.headers.get("Content-Range"));
if (count === 0) {
  console.error(
    `[ccm-feedback] cloud delete no-op: id=${id} — possible RLS misconfiguration or stale id`,
  );
}
```

**`pushClear`** — multi-row; we know the expected count from `ids.length`:

```ts
const expected = ids.length;
const inList = ids.map((i) => `"${i}"`).join(",");
const res = await fetch(`${this.endpoint}?id=in.(${inList})`, {
  method: "DELETE",
  headers: { ...this.headers, Prefer: "return=representation, count=exact" },
});
if (!res.ok) {
  const body = await res.text();
  console.warn(`[ccm-feedback] cloud clear failed: ${res.status} ${body}`);
  return;
}
const count = parseContentRangeCount(res.headers.get("Content-Range"));
if (count !== null && count !== expected) {
  console.warn(
    `[ccm-feedback] cloud clear partial: expected ${expected} deleted ${count}`,
  );
}
```

Notes for the implementer:
- The header name from `fetch` `Response` is case-insensitive — `res.headers.get("Content-Range")` works regardless of how PostgREST capitalizes it.
- Do NOT touch `cycleStatus` or any public method signature. The push functions stay private fire-and-forget; only their internal verification changes.
- Do NOT touch `pushInsert` or `migrateFromLocal`. The insert path round-trips the inserted row, so a zero-row insert would surface as an empty array — already handled.
- Keep `exactOptionalPropertyTypes` happy: the parsed count helper returns `number | null`, not `number | undefined`.

### Step 4 — Docs

If a one-paragraph note in `CLAUDE.md`'s **Supabase** section captures the new contract (anon policies must be present + writes are now count-asserted), add it. Otherwise leave the file alone. Do not touch `docs/cloud-mode.md`, `docs/architecture.md`, or any other file unless directly required by the implementation. Out of scope: rewriting docs.

---

## Verification

Per repo `CLAUDE.md`:

1. `bun install` (if not already current).
2. `bun run check` — `tsc --noEmit` must be clean. The new `parseContentRangeCount` helper and the additional `console.error` calls should type-check under strict + `exactOptionalPropertyTypes`.
3. `bun run lint` — Biome must be clean.
4. `bun run build` — produces `dist/w.js` and (per `esbuild.config.mjs`) the copy in `public/w.js`. No size regression expected; the changes are ~30 LOC.
5. **DB-side acceptance: Probes A and B from Step 2** pass against prod after applying `0004` + `0005`. (Optional Probe C if the operator wants to verify DELETE.)
6. **Manual smoke (cloud mode):**
   - Open a host page running the built `public/w.js` against the prod Supabase project.
   - Cycle the status of a known marker (e.g. `todo` → `review`).
   - Hard-reload the page. The marker must still show the updated status. (Before fix: it reverts.)
   - Delete a marker via the popover. Hard-reload. The marker must stay gone.
7. **Console assertion:** with policies repaired, force a known-bad PATCH (e.g. open DevTools and run a fetch with an invalid `id`) and verify the new `console.error("[ccm-feedback] cloud update no-op: ...")` message appears.

If all of the above pass, the regression is closed.

---

## Risks & Mitigations

- **Risk:** Applying `0005` against a self-hosted project that intentionally tightened the anon policies would reset them to the permissive defaults.
  **Mitigation:** The migration's top comment calls this out explicitly and tells self-hosters to review before running. Mirrors the existing self-hosting language in `0001_init.sql`.
- **Risk:** `Prefer: count=exact` adds a small server cost on every UPDATE/DELETE.
  **Mitigation:** Negligible — these are single-row PKs hitting an index. Worth it for the no-op detection.
- **Risk:** `console.error` is loud and could be noisy if the policies regress in the future.
  **Mitigation:** That is the desired property. The whole point of this fix is to make a future regression visible at the time of failure rather than at the next reload.

---

## Open Questions (for the implementer)

1. **Branch flow:** The `dev`-only push rule still applies. PR targets `dev`; do not push to `main`. Confirm before merging.
2. **Helper placement:** Inline `parseContentRangeCount` inside `src/cloud-store.ts`, or extract to `src/utils/` (none exists today). The plan recommends inline — it is one function used only here.
3. **Self-host messaging:** Should `docs/cloud-mode.md` or `docs/self-hosting.md` get a one-line "if your anon UPDATE returns `content-range: */0`, run `0005_repair_rls.sql`" troubleshooting note? The plan defers this to the implementer's judgement and does not require it.
4. **Apply order in the SQL editor:** If applying via the Supabase SQL editor (not `supabase db push`), confirm `0004` is applied before `0005`. The two are independent of each other but `0004` is a prerequisite for `review` round-tripping at all.

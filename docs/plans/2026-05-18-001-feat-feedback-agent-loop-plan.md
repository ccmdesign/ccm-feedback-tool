---
title: "feat: Feedback agent loop — review status, feedback CLI, apply-feedback skill + share endpoint"
type: feat
status: active
plan_depth: deep
ticket: PRO-57
created: 2026-05-18
branch: feature/PRO-57-feedback-agent-loop
---

# feat: Feedback agent loop — `review` status, feedback CLI, apply-feedback skill + share endpoint

## Summary

PRO-57 closes the review→edit→review loop for ccm-feedback so a coding agent can be handed a
project's feedback by URL, apply each edit, and mark each handled comment as `review` (never
`done`) for a human to verify in the widget and flip `review`→`done`.

The work is three coupled phases that **must execute in order**:

1. **`review` status** (foundation) — a new `FeedbackStatus` end-to-end: DB constraint, types,
   i18n, popup + marker UI, cloud-store passthrough verification.
2. **feedback CLI** (`scripts/feedback.ts`) — a Bun script speaking raw PostgREST (no
   `@supabase/supabase-js`), whose primary job is `set-status <id> review`.
3. **apply-feedback skill + share endpoint + URL handoff** — a Netlify function that serves a
   project's feedback as JSON from the anon key (server-side only), a widget FAB "Copy feedback
   URL" action (cloud mode only), and the `prompts/apply-feedback.md` prompt converted into an
   installable Claude Code skill that fetches feedback by URL and runs `feedback set-status
   <id> review` after each applied edit.

### HARD CAVEAT (carried through every phase)

**The agent sets feedback status `review`, NEVER `done`.** `done` is a human-only transition.
The `review` status exists *precisely* so the agent does not auto-complete its own work — a
human verifies the edit in the widget, then flips `review`→`done`. Every artifact that lets the
agent write status (the CLI `set-status` default usage, the skill's final step, the prompt
fallback documentation) must make `review`-only explicit and must never instruct or default to
`done`. The CLI `set-status` command still *accepts* `done` as a valid value (humans/scripts may
use it) but the agent-facing skill and prompts must only ever call it with `review`.

---

## Problem Frame

Today the loop is open: a reviewer pins comments, exports JSON (download) or syncs to Supabase,
and a human pastes `prompts/apply-feedback.md` plus the downloaded file into an agent. The agent
applies edits but has no way to record that a comment was handled, and there is no machine
handoff path (the agent reads a file a human downloaded and attached). There are three gaps:

1. **No "handled but unverified" state.** `status` is `todo | done | question`. An agent that
   applies an edit has only `done` available, which would let it mark its own work complete with
   no human gate. `apply-feedback.md` currently filters out `done` and never writes status back
   at all — the loop never closes.
2. **No CLI.** There is no scripted way to list/get/create/status/delete annotations against the
   Supabase project. `scripts/` holds only `apply-migrations.sh`. The agent cannot programmatically
   flip a status.
3. **No URL handoff.** The only handoff format is a downloaded JSON file (`exportAsJson()`), or a
   reviewer reading `cloud-mode.md` and hand-constructing a PostgREST URL. There is no
   one-paste-a-URL path, and the prompt is a `.md` file a human must paste, not an
   auto-triggering skill.

## Scope Boundaries

### In scope

- New `review` `FeedbackStatus` across DB, types, i18n, popup, markers, cloud-store (verify).
- Migration `0004_status_review.sql`, idempotent, guarded, ordered strictly after `0003`.
- `scripts/feedback.ts` Bun CLI: `list`, `get`, `create`, `set-status`, `delete`; raw PostgREST.
- `package.json` script `"feedback": "bun run scripts/feedback.ts"`.
- Netlify function at `netlify/functions/feedback` — GET `?project=<name>` → JSON in
  `exportAsJson()` shape; anon key from server-side env only; read-only; CORS for GET.
- `netlify.toml`: functions directory + `/feedback` redirect; verify no secret leak.
- Widget FAB "Copy feedback URL" action — cloud mode only, disabled with tooltip in localStorage
  mode; JSON download stays as fallback.
- `skills/apply-ccm-feedback/SKILL.md` — converted from `prompts/apply-feedback.md` with
  auto-trigger frontmatter, URL-fetch Step 1, and the new `review`-only final step.
- Orchestrator + docs updates: `prompts/install-widget.md`, `prompts/README.md`,
  `docs/data-model.md`, `docs/cloud-mode.md`, `README.md`, `llms.txt`.

### Non-goals

- Reviving `packages/cli/` — it is a **dead upstream SitePing artifact** and does not exist in
  this tree. The CLI lives in `scripts/feedback.ts`. Do not recreate the `packages/` layout.
- Any new runtime dependency. No `@supabase/supabase-js`. Raw `fetch` only, matching widget posture.
- Auth/RLS changes. The endpoint and CLI use the anon key under existing permissive RLS. RLS
  hardening remains the separate `harden-rls.md` flow.
- Service-role key anywhere. Never used by widget, CLI, or function.
- Automatic `done` transitions anywhere agent-facing (the hard caveat).
- A real i18n locale map. `src/i18n.ts` stays a flat English `STRINGS` record (see Open Question 1).

### Deferred to Follow-Up Work

- Fixing the stale `biome.json` overrides that reference non-existent paths
  (`packages/widget/src/events.ts`, `packages/cli/src/generators/prisma.ts`). Noticed during
  research; out of PRO-57 scope. The correct current path is `src/events.ts`; the override
  silently does nothing today, so this is latent, not breaking.
- A real French locale map (the broader i18n refactor `src/i18n.ts` defers with "swap for a real
  locale map later"). PRO-57 only adds one more English string + records the intended FR value.

---

## High-Level Technical Design

*This illustrates the intended approach and is directional guidance for review, not
implementation specification. The implementing agent should treat it as context, not code to
reproduce.*

### The closed loop (target end state)

```
Reviewer pins comments ──> widget (localStorage OR Supabase)
                                       │
                  ┌────────────────────┴─────────────────────┐
            localStorage mode                            cloud mode
                  │                                            │
            Export JSON (download)                  FAB "Copy feedback URL"
                  │                                            │
                  │                          <site>/feedback?project=<name>
                  │                                            │
                  └──────────────┬─────────────────────────────┘
                                 ▼
                  Agent runs apply-ccm-feedback skill
                  (fetches JSON file OR URL via WebFetch)
                                 │
                  applies edit for each todo/review item
                                 │
                  bun run feedback set-status <id> review   ◄── NEVER done
                                 │
                                 ▼
                  Human opens widget, sees REVIEW pills,
                  verifies edit, flips review ──> done  (human only)
```

### `review` status — surface map

`FEEDBACK_STATUSES` is the single source the **popup** composer iterates (`src/popup.ts`
`for (const s of FEEDBACK_STATUSES)`), so adding `review` there auto-renders a fourth pill in
the composer. The **marker popover** status cycle is a *separate hardcoded array* in
`src/markers.ts` `cycleStatus()` (`["todo", "done", "question"]`) — it will NOT pick up `review`
automatically and must be updated explicitly. `STATUS_COLORS` in `src/popup.ts` is a
`Record<FeedbackStatus, …>` consumed by both popup and markers; once `review` is added to the
union, TypeScript will flag the missing key — that compile error is the checklist.

### Endpoint contract

```
GET /feedback?project=<name>
  ── Netlify function ──> GET {SUPABASE_URL}/rest/v1/ccm_widget_annotations
                              ?project_name=eq.<name>&order=created_at.desc
                          headers: apikey + Authorization: Bearer (anon, server-side env)
  200 → { projectName, exportedAt, count, annotations: [ AnnotationRecord... ] }
        (byte-for-byte the exportAsJson() shape; rows mapped snake_case→camelCase)
  400 → missing/invalid ?project
  405 → non-GET
  502 → upstream Supabase error (never leak the key or raw upstream body)
  CORS: Access-Control-Allow-Origin: * for GET + OPTIONS preflight only
```

---

## Output Structure

New files this plan creates (existing files modified in place are not shown):

```
docs/plans/
  2026-05-18-001-feat-feedback-agent-loop-plan.md   (this file)
supabase/migrations/
  0004_status_review.sql
scripts/
  feedback.ts
netlify/
  functions/
    feedback.mts                 (extension is Open Question 2: .mts vs .ts vs .mjs)
skills/
  apply-ccm-feedback/
    SKILL.md
```

The per-unit **Files** lists remain authoritative.

---

## Key Technical Decisions

1. **One migration, additive, ordered after 0003.** `0004_status_review.sql` only alters the
   `status` CHECK constraint to add `'review'`. Default stays `'todo'`. It must be idempotent
   and guarded in the exact style of `0002_status_pin_area.sql` (which uses
   `add column if not exists … check (...)`). Since `status` already exists, this is a
   `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT … CHECK (status in ('todo','done','question','review'))`
   inside a guarded `do $$ … $$` block (Postgres has no `ALTER … ALTER CONSTRAINT` for CHECK; the
   constraint must be dropped and re-added — the implementer must discover the existing
   constraint name, which Supabase auto-generates as `ccm_widget_annotations_status_check`, and
   guard for it not existing). Numbered `0004` so `scripts/apply-migrations.sh` (globs
   `supabase/migrations/*.sql` in order) and `prompts/self-host-supabase.md` pick it up after
   `0003`.

2. **CLI is `scripts/feedback.ts`, run with Bun, raw `fetch`.** Mirrors `CloudStore`'s
   PostgREST posture exactly: endpoint `${SUPABASE_URL}/rest/v1/ccm_widget_annotations`, write
   headers `apikey`, `Authorization: Bearer <key>`, `Content-Type: application/json`,
   `Prefer: return=representation`. No SDK, no new dependency. Bun is the runtime
   (`bun run scripts/feedback.ts`), so it can use `Bun`/`process.env` and top-level `await`
   without a build step.

3. **`set-status` accepts all four statuses; agent-facing surfaces only ever pass `review`.**
   The CLI is a general tool (a human may legitimately `set-status <id> done`). The *guardrail*
   lives in the skill and prompt text, which only ever invoke `review`. This keeps the CLI
   honest and reusable while preserving the hard caveat at the agent boundary.

4. **Netlify function over a static endpoint.** A static file cannot do a server-side keyed
   Supabase query. The function reads `SUPABASE_URL` + `SUPABASE_ANON_KEY` from Netlify env
   (server-side only — never shipped to the browser), queries PostgREST, and reshapes rows to
   the `exportAsJson()` payload so the skill's "fetch a URL" path and the existing "attach a
   downloaded file" path are byte-identical to consumers.

5. **Function language: Netlify TS function (`.mts`/`.ts`), not `.mjs`** — *proposed, see Open
   Question 2*. Repo is TS-strict + esbuild; a typed function is consistent. Netlify natively
   bundles TS functions. The row→record reshape should reuse the `rowToRecord` field mapping
   conceptually (the function cannot import widget `src/` cleanly because that's browser/IIFE
   code — the mapping will be duplicated as a small server-side transform; acceptable, it is the
   same ~25-field rename already in `cloud-store.ts`).

6. **"Copy feedback URL" is cloud-mode-only by construction.** The URL only resolves to data if
   the project's annotations are in Supabase. In localStorage mode there is nothing server-side
   to serve, so the FAB item must be visibly disabled with an explanatory tooltip, and JSON
   download stays as the always-available fallback. The widget already knows its mode
   (`useCloud` in `src/index.ts`); the FAB needs that signal passed in.

7. **Skill, not just a prompt.** `skills/apply-ccm-feedback/SKILL.md` keeps the existing
   5-step logic verbatim in spirit, adds YAML frontmatter with a `description` that auto-triggers
   when an agent is handed a ccm-feedback URL or JSON, swaps Step 1 to fetch via WebFetch from
   the share URL (raw PostgREST URL + anon key documented as the no-infra fallback), and adds a
   new final step: after each applied edit run `bun run feedback set-status <id> review`
   (PostgREST PATCH documented as fallback) — `review` only, NEVER `done`. `question`/`pin`/`area`
   handling is unchanged: surface, don't edit, don't re-status.

---

## System-Wide Impact

| Surface | Change | Risk |
|---|---|---|
| Supabase schema (`ccm_widget_annotations`) | CHECK constraint widened to include `review` | Low — additive; existing rows unaffected; default unchanged |
| Widget bundle (`dist/w.js`) | +1 status everywhere, +1 FAB item | Low — type-driven; `STATUS_COLORS` compile error guides completeness |
| `scripts/` | New `feedback.ts` Bun CLI | Low — new file, isolated; not bundled into `w.js` |
| Netlify deploy | New function + redirect | Medium — env vars must be set on Netlify; anon-key-only leak risk if mis-coded |
| `prompts/` + `skills/` | Prompt → skill; orchestrator updated | Medium — agent-behavior contract; the hard caveat must survive the rewrite |
| Docs (`docs/`, `README.md`, `llms.txt`) | Document URL handoff + endpoint | Low — doc-only |
| `tsconfig.json` / `biome.json` | `scripts/feedback.ts` is Bun (not DOM); currently `tsconfig` only `include`s `src/**/*` so `bun run check` will NOT type-check it — acceptable, but lint (`biome check .`) WILL cover it | Low — see U6 verification note |

**Stakeholders:** the maintainer (runs CLI against the demo project, sets Netlify env), agents
(consume the skill + endpoint), self-hosters (run `0004`, optionally deploy the function),
reviewers (see the new `review` pill, perform `review`→`done` themselves).

---

## Implementation Units

Phases are strict gates. **Do not start Phase 2 until Phase 1 verifies; do not start Phase 3
until Phase 2 verifies.** Within a phase, units are dependency-ordered.

### PHASE 1 — `review` status (foundation)

### U1. Add `review` to the database CHECK constraint

**Goal:** Widen the `status` CHECK constraint on `ccm_widget_annotations` to permit `review`,
without breaking existing rows or changing the default.

**Requirements:** PRO-57 Phase 1 bullet 1. Foundation for U6/U10 (CLI/skill writing `review`).

**Dependencies:** none (but conceptually depends on `0003` existing — it does).

**Files:**
- `supabase/migrations/0004_status_review.sql` (new)

**Approach:** Mirror `0002_status_pin_area.sql`'s idempotent, guarded style. `status` already
exists with constraint `ccm_widget_annotations_status_check` (Supabase's auto-generated name from
`0002`). Postgres cannot alter a CHECK in place, so: inside a guarded `do $$ … $$` block (or
using `IF EXISTS`), drop the existing status check constraint if present, then add it back as
`check (status in ('todo','done','question','review'))`. Keep `default 'todo'`. Header comment
must state it runs **after** `0003` and is idempotent (safe to re-run). Do not touch `kind` or
any other column.

**Patterns to follow:** `supabase/migrations/0002_status_pin_area.sql` (idempotent
`if not exists` / guarded DDL), `0003_realtime.sql` (the `do $$ begin … end $$` guard pattern).

**Test scenarios:**
- *Happy path:* Run `0004` against the maintainer demo project (`.env` `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` via `scripts/apply-migrations.sh` or the SQL editor). After it
  runs, a row can be `UPDATE … SET status='review'` successfully; `status='todo'` default
  unchanged for new inserts.
- *Idempotency:* Running `0004` a second time succeeds with no error (re-running is safe).
- *Constraint still enforced:* `UPDATE … SET status='bogus'` is rejected by the CHECK.
- *Ordering:* `scripts/apply-migrations.sh` applies `0001→0002→0003→0004` in order with no
  failure on a fresh project.
- Test expectation: SQL migration — verification is manual DB execution against the demo
  project, not an automated suite (repo has no test runner). Covered by the Phase 1 verify gate.

**Verification:** Migration applies cleanly to the demo project; a manual `UPDATE` to `review`
succeeds; re-running the migration is a no-op; `bogus` status still rejected.

---

### U2. Add `review` to `FeedbackStatus` type + `FEEDBACK_STATUSES`

**Goal:** Make `review` a first-class member of the status union and the canonical status list.

**Requirements:** PRO-57 Phase 1 bullet 2.

**Dependencies:** none (pure type change; U1 is the DB side, independent).

**Files:**
- `src/types.ts` (modify — `FeedbackStatus` union + `FEEDBACK_STATUSES` array)

**Approach:** Add `"review"` to the `FeedbackStatus` union and to the `FEEDBACK_STATUSES`
readonly tuple. Decide ordering deliberately: `["todo", "review", "done", "question"]` reflects
the lifecycle (todo → handled-pending-verify → done; question is orthogonal) and is the order
the popup composer will render. This single change will produce compile errors at every
non-exhaustive consumer (notably `STATUS_COLORS` in `src/popup.ts`) — those errors are the
to-do list for U3/U4.

**Patterns to follow:** existing `FeedbackStatus` / `FEEDBACK_STATUSES` definition in
`src/types.ts`; `AnnotationKind` as a sibling union example.

**Test scenarios:** Test expectation: none — pure type definition with no behavior. Exhaustive-
ness is enforced by `bun run check` failing until U3/U4 land (this is the intended forcing
function, verified at the Phase 1 gate).

**Verification:** `bun run check` now reports errors *only* at the known status consumers
(`STATUS_COLORS`, marker cycle) — confirming the union widened and TS is enforcing exhaustiveness.

---

### U3. Add `status.review` i18n string (EN + recorded FR)

**Goal:** Provide the display label for the `review` status.

**Requirements:** PRO-57 Phase 1 bullet 3.

**Dependencies:** none.

**Files:**
- `src/i18n.ts` (modify — add `"status.review"` to `STRINGS`)

**Approach:** Add `"status.review": "Review"` to the flat `STRINGS` record next to the existing
`status.todo`/`status.done`/`status.question` entries. **`src/i18n.ts` is English-only today**
(flat record, comment: "swap for a real locale map later") — there is *no existing FR map to
match*. Per the scope's "FR (match existing FR tone, e.g. 'À vérifier')": record the intended
French value **`À vérifier`** as a code comment beside the EN entry (e.g.
`// FR: "À vérifier"`) so it is captured for the deferred locale-map refactor, without
introducing a locale map this ticket does not scope. See **Open Question 1** — confirm whether
a comment is sufficient or a structured FR placeholder is wanted.

**Patterns to follow:** existing `status.*` entries in `src/i18n.ts`'s `STRINGS`.

**Test scenarios:** Test expectation: none — static string addition; visually confirmed via U4
browser smoke test (the pill must read "Review").

**Verification:** `t("status.review")` returns `"Review"`; FR value present as a comment for the
future locale map.

---

### U4. Render `review` in the popup composer + marker popover/cycle + styling

**Goal:** The `review` status is selectable in the composer, displayed on markers, included in
the marker popover status cycle, and has a distinct pill color.

**Requirements:** PRO-57 Phase 1 bullet 4.

**Dependencies:** U2 (union), U3 (label).

**Files:**
- `src/popup.ts` (modify — add `review` to `STATUS_COLORS`)
- `src/markers.ts` (modify — `cycleStatus()` hardcoded order array)

**Approach:**
- `STATUS_COLORS` in `src/popup.ts` is `Record<FeedbackStatus, {fg,bg,border}>`; U2 makes it a
  compile error until a `review` entry is added. Pick a palette distinct from
  todo(amber)/done(green)/question(violet) — a blue/indigo family reads as "pending verification"
  and matches the product's accent semantics (exact hexes are the implementer's call within the
  existing visual language; suggest `fg:#1d4ed8, bg:#dbeafe, border:#3b82f6`).
- The popup composer auto-renders `review` because it iterates `FEEDBACK_STATUSES` — no popup
  code change beyond `STATUS_COLORS`. **Verify** the composer shows four pills.
- `src/markers.ts` `cycleStatus()` has its **own hardcoded** `order: FeedbackStatus[] =
  ["todo", "done", "question"]`. It will NOT include `review` automatically. Update it to
  `["todo", "review", "done", "question"]` so clicking the marker status pill cycles through
  `review`. (The marker pill rendering itself reads `STATUS_COLORS[status]` and
  `t("status."+status)`, so it works once the color + label exist.)
- Marker pulse animation is `question`-only (`if (status === "question")`); `review` should
  not pulse (leave that branch as-is).

**Patterns to follow:** existing `STATUS_COLORS` entries (`src/popup.ts`); the existing
`cycleStatus()` array (`src/markers.ts`); marker pill build in `markers.ts` `buildMarker()`.

**Test scenarios:**
- *Happy path (composer):* Open the FAB → target an element → composer shows four status pills
  (Todo, Review, Done, Question); selecting "Review" then submitting persists a record with
  `status: "review"`.
- *Happy path (marker cycle):* Click an existing marker → popover status pill → clicking it
  cycles `todo→review→done→question→todo`; the pill label + colors update each click.
- *Persistence (localStorage):* Create a `review` comment, reload the page, marker re-renders
  with the review color and the popover shows `REVIEW`.
- *Persistence (cloud demo):* Same on a deployed preview against the demo Supabase — `review`
  round-trips through PostgREST and re-renders after reload.
- *Edge:* Legacy record with no `status` still defaults to `todo` (existing `?? "todo"`
  behavior unchanged).
- Test expectation: manual browser smoke (no automated UI suite). These scenarios ARE the
  Phase 1 verification checklist.

**Verification:** `bun run check` + `bun run lint` clean; browser smoke on the demo page: create
a comment, cycle status through Review, confirm Review pill shows and persists in **both**
localStorage and cloud demo modes.

---

### U5. Verify cloud-store passes `status` through generically

**Goal:** Confirm — do NOT special-case — that `CloudStore` round-trips the new status with no
code change.

**Requirements:** PRO-57 Phase 1 bullet 5.

**Dependencies:** U2.

**Files:**
- `src/cloud-store.ts` (read-only verification; expected: **no change**)

**Approach:** `CloudRow.status` is typed `FeedbackStatus | null`; `rowToRecord` does
`row.status ?? "todo"`; `recordToRow` does `if (r.status) row.status = r.status`. All generic —
widening the union requires no cloud-store edit. Read the file and confirm there is no
hardcoded status allowlist anywhere. If (and only if) a hardcoded list is found, that is a bug
to fix; the expectation is none exists. Do not add `review` special-casing.

**Patterns to follow:** N/A — verification unit.

**Test scenarios:**
- *Integration (cloud round-trip):* On a deployed preview against the demo Supabase, create a
  `review` annotation in the widget; confirm the row in Supabase has `status='review'`; reload
  and confirm `rowToRecord` rehydrates it as `review` (folded into U4's cloud persistence test).
- Test expectation: none for code (no change expected) — covered by U4's cloud-demo scenario.

**Verification:** Code read confirms generic passthrough (no diff to `cloud-store.ts`); U4 cloud
round-trip proves `review` survives PostgREST + realtime.

**>>> PHASE 1 GATE:** `bun run check` + `bun run lint` pass; browser smoke confirms Review
selectable, cycled, and persisted in localStorage **and** cloud demo. Do not start Phase 2
until this gate is green.

---

### PHASE 2 — feedback CLI (`scripts/feedback.ts`)

### U6. Build the feedback CLI

**Goal:** A Bun script speaking raw PostgREST to list/get/create/set-status/delete annotations,
whose primary use is `set-status <id> review`.

**Requirements:** PRO-57 Phase 2 (all bullets). Depends on U1 (DB must accept `review`).

**Dependencies:** U1 (constraint must allow `review` or `set-status … review` 400s).

**Files:**
- `scripts/feedback.ts` (new)
- `package.json` (modify — add `"feedback": "bun run scripts/feedback.ts"` to `scripts`)

**Approach:**
- Pure Bun script, raw `fetch`, **no `@supabase/supabase-js`**, no new dependency. Endpoint
  `${SUPABASE_URL}/rest/v1/ccm_widget_annotations`.
- **Config resolution:** read `SUPABASE_URL` / `SUPABASE_ANON_KEY` from `process.env`;
  `--url` / `--key` flags override; if neither env nor flag yields both values, exit non-zero
  with a clear, actionable message (name the missing var and that `.env` documents it). The
  maintainer's `.env` (gitignored) supplies these for demo testing — Bun does not auto-load
  `.env` for `bun run <script>` the same way as `bun run` package scripts in all versions;
  the implementer should either rely on `bun run` `.env` loading (verify it loads) or document
  that the user exports the vars / passes `--url`/`--key`. (Execution-time detail — resolve
  when wiring; do not over-specify here.)
- **Commands:**
  - `list [--project P] [--status S] [--path PATH]` → GET with PostgREST query params
    (`project_name=eq.`, `status=eq.`, `path=eq.`), `order=created_at.desc`; print a compact
    table or JSON lines (id, status, path, truncated message).
  - `get <id>` → GET `?id=eq.<id>`, print the full record as pretty JSON.
  - `create --project --message --url [--path --status --author …]` → POST a minimal record.
    Required: project, message, url. Mirror `buildRecord()` defaults conceptually (status
    `todo`, kind `target`, empty anchor strings) so the row satisfies NOT NULL columns from
    `0001`.
  - `set-status <id> <todo|review|done|question>` → PATCH `?id=eq.<id>` body `{ status }`.
    **Primary command.** Validate the status arg against the four values; reject anything else
    with a clear message. (CLI accepts `done`; the *agent* never passes it — guardrail lives in
    U9/U10, not here.)
  - `delete <id>` → DELETE `?id=eq.<id>`.
- **Write headers** (create/set-status/delete): `apikey`, `Authorization: Bearer <key>`,
  `Content-Type: application/json`, `Prefer: return=representation` — exactly matching
  `CloudStore`'s header block.
- Non-zero exit on any HTTP error or bad args; print the upstream status + a readable message
  (never dump the key).
- Keep it single-file, no framework; a tiny hand-rolled arg parser is fine and matches the
  zero-dependency posture.

**Patterns to follow:** `src/cloud-store.ts` — `endpoint` construction, `headers` object,
`pushUpdate`/`pushInsert`/`pushDelete` PostgREST verbs and query-param style
(`?id=eq.${encodeURIComponent(id)}`), error logging shape. `scripts/apply-migrations.sh` for
the "fail clearly when config is absent" CLI ergonomic.

**Test scenarios (run against the maintainer demo project from `.env`):**
- *Happy path — list:* `bun run feedback list --project <demo>` returns the demo project's
  annotations; `--status todo` and `--path /foo` filters narrow correctly.
- *Happy path — get:* `bun run feedback get <id>` prints the full record JSON for a known id.
- *Happy path — create:* `create --project <demo> --message "cli smoke" --url https://x/test`
  inserts a row; the returned representation has an `id` and `status:"todo"`; it appears in a
  subsequent `list`.
- *Happy path — set-status (primary):* `set-status <id> review` flips the row; a follow-up
  `get <id>` shows `status:"review"`; verify the same in the Supabase table.
- *set-status all values:* `todo`, `review`, `done`, `question` each succeed (CLI is general).
- *delete:* `delete <id>` removes the smoke-test row; subsequent `get` returns empty.
- *Error — missing config:* unset env + no flags → exits non-zero with a message naming
  `SUPABASE_URL`/`SUPABASE_ANON_KEY`.
- *Error — bad status:* `set-status <id> shipped` → exits non-zero, lists the four valid values,
  does not call the network.
- *Error — bad id:* `get <bogus>` / `set-status <bogus> review` → clean non-zero, readable
  message, no key leak in output.
- Test expectation: manual CLI runs against the demo project (no automated suite). These ARE
  the Phase 2 verification checklist; confirm row state changes in the DB after each mutating
  command.

**Verification:** Every command run against the demo project behaves as above; mutating
commands provably change DB row state (confirmed via `get` and/or the Supabase table); the
smoke-test row is cleaned up with `delete`; `bun run lint` passes for `scripts/feedback.ts`.

**>>> PHASE 2 GATE:** All CLI commands verified against the demo project; `set-status <id>
review` round-trips; `bun run lint` clean. Do not start Phase 3 until this gate is green.

---

### PHASE 3 — apply-feedback skill + share endpoint + URL handoff

### U7. Netlify share endpoint function

**Goal:** `GET /feedback?project=<name>` returns the project's feedback as JSON in the exact
`exportAsJson()` shape, querying Supabase server-side with the anon key.

**Requirements:** PRO-57 Phase 3 bullet 1.

**Dependencies:** none code-wise, but the response shape must match `exportAsJson()` (U-agnostic).

**Files:**
- `netlify/functions/feedback.mts` (new — extension is **Open Question 2**)

**Approach:**
- Read `SUPABASE_URL` + `SUPABASE_ANON_KEY` from the function's `process.env` (Netlify env vars,
  **server-side only** — never inlined into `w.js` or any client asset).
- Parse `?project=<name>`; reject missing/empty with `400`.
- `GET ${SUPABASE_URL}/rest/v1/ccm_widget_annotations?project_name=eq.<urlencoded>&order=created_at.desc`
  with `apikey` + `Authorization: Bearer <anon>` headers.
- Map each snake_case row → camelCase `AnnotationRecord` using the **same field mapping** as
  `rowToRecord` in `src/cloud-store.ts` (duplicated as a small server-side transform — the
  widget source is browser/IIFE and not cleanly importable into a Netlify function; ~25 field
  renames, same as cloud-store).
- Respond `200` with `{ projectName, exportedAt: new Date().toISOString(), count,
  annotations }` — byte-compatible with `src/export-utils.ts` `exportAsJson()` so the skill's
  URL path and file path are indistinguishable downstream.
- `405` for non-GET; handle `OPTIONS` preflight. `502`/`500` on upstream failure with a generic
  message — **never** echo the anon key or the raw upstream body that could contain it.
- CORS: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, OPTIONS` (read-only).
- Read-only: no POST/PATCH/DELETE; the function never accepts a key from the client.

**Patterns to follow:** `src/cloud-store.ts` `init()` (the exact GET query + headers) and
`rowToRecord` (the field mapping); `src/export-utils.ts` `exportAsJson()` (the response shape:
`projectName`, `exportedAt`, `count`, `annotations`).

**Test scenarios:**
- *Happy path:* `GET /feedback?project=<demo>` returns `200` with valid JSON; `count` equals
  `annotations.length`; a known annotation's fields are camelCase and match the widget's record
  shape; `projectName` echoes the query.
- *Empty project:* unknown project → `200` with `count: 0`, `annotations: []` (not an error).
- *Missing param:* `GET /feedback` (no `?project`) → `400` with a clear message.
- *Method:* `POST /feedback?project=x` → `405`; `OPTIONS` → preflight headers, no body.
- *Secret safety:* response headers + body never contain `SUPABASE_ANON_KEY`; an induced
  upstream error (e.g. bad env) returns a generic `5xx` with no key/RLS internals leaked.
- *CORS:* `Access-Control-Allow-Origin: *` present on the `200` GET response.
- Test expectation: manual `curl` against a Netlify deploy preview (no automated suite). These
  ARE part of the Phase 3 verification.

**Verification:** Deployed preview endpoint returns valid `exportAsJson()`-shaped JSON for the
demo project; bad/missing param and non-GET handled; grep the function + built output to
confirm the anon key never reaches any client asset.

---

### U8. Wire `/feedback` route + functions dir in `netlify.toml`

**Goal:** Map the public `/feedback` path to the function and register the functions directory,
with no secret in the committed config.

**Requirements:** PRO-57 Phase 3 bullet 2.

**Dependencies:** U7.

**Files:**
- `netlify.toml` (modify — add `[functions]` directory + `[[redirects]]` for `/feedback`)

**Approach:** `netlify.toml` currently has only `[build]`, `[build.environment]`, and two
`[[headers]]`. Add `[functions]` with `directory = "netlify/functions"` and a `[[redirects]]`
from `/feedback` to `/.netlify/functions/feedback` (status `200` so the path stays `/feedback`).
Do **not** put `SUPABASE_*` values in `netlify.toml` — they are Netlify dashboard env vars
referenced by the function at runtime. Add a comment in `netlify.toml` noting the function
requires `SUPABASE_URL` + `SUPABASE_ANON_KEY` env vars (anon only) so a self-hoster knows what
to set.

**Patterns to follow:** existing `netlify.toml` structure; Netlify's standard
`netlify/functions` convention.

**Test scenarios:**
- *Happy path:* On a deploy preview, `GET https://<preview>/feedback?project=<demo>` resolves
  to the function and returns the U7 JSON (proves the redirect + functions dir wiring).
- *No secret leak:* `git grep` for the anon key / `SUPABASE_ANON_KEY` value in `netlify.toml`
  and committed files returns nothing; only the env-var *name* appears (in a comment).
- Test expectation: none beyond the U7 endpoint test (this unit is config that U7's deployed
  test exercises).

**Verification:** `/feedback?project=<demo>` works on a deploy preview; `netlify.toml` contains
no secret, only the documented env-var requirement.

---

### U9. Widget FAB "Copy feedback URL" action (cloud-mode only)

**Goal:** Add a FAB radial item that copies `<site>/feedback?project=<name>` to the clipboard;
disabled with an explanatory tooltip in localStorage mode; JSON download remains the fallback.

**Requirements:** PRO-57 Phase 3 bullet 3.

**Dependencies:** U7/U8 (the URL must resolve), conceptually U2 (same widget build) — not a code dep.

**Files:**
- `src/fab.ts` (modify — new radial item + disabled state + tooltip)
- `src/index.ts` (modify — pass cloud-mode flag + project name into `Fab`; handle new bus event)
- `src/events.ts` (modify — add the new event, e.g. `"copyUrl:click"`)
- `src/i18n.ts` (modify — labels: copy-url action, success toast, localStorage-disabled tooltip)
- `src/export-utils.ts` (possibly — a small clipboard helper alongside `downloadFile`)

**Approach:**
- `Fab` is constructed in `src/index.ts` with `(shadow, bus, t)`; `useCloud` is known there.
  Pass cloud-mode (and the project name, or build the URL in `index.ts` and pass it) into the
  `Fab` so it can enable/disable the new item. The share base is the current site origin
  (`window.location.origin`) + `/feedback?project=<encoded projectName>` — the endpoint is
  same-origin with the reviewed site only if the function is deployed there; for the CCM-hosted
  demo it is the widget's known host. **Open Question 3:** which origin does the copied URL use
  — the reviewed page's origin (requires the site to host the function) or the ccm-feedback
  Netlify host (always works for the demo, cross-site for self-hosters)? Resolve before coding.
- Add a radial item (id e.g. `copyUrl`) to the `items` array in `src/fab.ts` with an icon
  (a link/share glyph; reuse an existing icon from `src/icons.ts` or add one). In localStorage
  mode render it visibly disabled (reduced opacity, `aria-disabled`, not firing the bus) and
  attach a tooltip/`title` explaining "Cloud mode only — use Export JSON". JSON download
  (`export` item) is untouched and remains the fallback.
- On click in cloud mode: emit a new bus event; `src/index.ts` handles it by writing the URL to
  the clipboard (`navigator.clipboard.writeText`, with a graceful fallback/console path if the
  clipboard API is unavailable) and showing the existing toast pattern (mirror how
  `toast.exported` is surfaced).
- Add `events.ts` entry for the new event (the `WidgetEvents` interface — note `events.ts` has
  a biome override allowing `any`, but follow the existing typed-tuple pattern).

**Patterns to follow:** `src/fab.ts` `items` array + `handleItemClick()` switch +
`bus.emit("export:click")`; `src/index.ts` `bus.on("export:click", …)` handler and the
`console.info`/toast pattern; `src/events.ts` `WidgetEvents` tuple style; `src/i18n.ts`
`fab.*`/`toast.*` keys.

**Test scenarios:**
- *Happy path (cloud):* On a deployed preview in cloud mode, open the FAB → "Copy feedback URL"
  → clipboard contains `<origin>/feedback?project=<name>` (URL-encoded project); success toast
  shows; pasting the URL in a browser returns the U7 JSON.
- *Disabled (localStorage):* In localStorage mode the item renders disabled, clicking it does
  nothing (no bus emit, no toast), and the tooltip/`title` explains it's cloud-only; the
  Export JSON item still works (fallback intact).
- *Project encoding:* a project name with spaces/special chars is correctly URL-encoded in the
  copied URL.
- *Clipboard unavailable:* if `navigator.clipboard` is missing/blocked, the widget fails
  gracefully (no uncaught error; a console warning or fallback), not a crash.
- Test expectation: manual browser smoke in both modes (no automated UI suite). Part of Phase 3
  verification.

**Verification:** `bun run check` + `bun run lint` clean; cloud-mode preview copies a working
URL that returns valid JSON; localStorage mode shows the disabled item + tooltip and Export
still works.

---

### U10. Convert `apply-feedback.md` → `skills/apply-ccm-feedback/SKILL.md`

**Goal:** An installable Claude Code skill that auto-triggers on a ccm-feedback URL or JSON,
keeps the existing 5-step logic, fetches input via the share URL, and after each applied edit
runs `feedback set-status <id> review` — **`review` only, NEVER `done`**.

**Requirements:** PRO-57 Phase 3 bullet 4 + the HARD CAVEAT.

**Dependencies:** U6 (the CLI the final step calls), U7/U8 (the URL Step 1 fetches), U1 (DB
accepts `review`).

**Files:**
- `skills/apply-ccm-feedback/SKILL.md` (new — content derived from `prompts/apply-feedback.md`)
- `prompts/apply-feedback.md` (decide: keep as the human-pasteable longform, or thin it to
  point at the skill — see Open Question 4)

**Approach:**
- New `skills/apply-ccm-feedback/SKILL.md` with YAML frontmatter: a `name` and a `description`
  written so the agent auto-triggers when handed a ccm-feedback share URL
  (`…/feedback?project=…`), a raw PostgREST URL, or an exported `ccm-feedback-*.json` /
  `{ annotations: [...] }` payload. Mirror the description-trigger style of other skills in the
  user's environment (concise, keyword-rich: "ccm-feedback", "feedback URL", "apply review
  comments", "pinned comments JSON").
- **Keep the existing 5 steps verbatim in intent** (validate JSON → locate source → apply edit
  → respect codebase → report). Carry the existing nuances: filter `status === "done"`; group
  by `path`; `question`/`pin`/`area` are surfaced, not edited.
- **Step 1 change:** input is fetched from the share URL via WebFetch (the
  `exportAsJson()`-shaped JSON from U7) instead of a downloaded file. Document the raw PostgREST
  URL + anon key as the **no-infra fallback** (`GET {SUPABASE_URL}/rest/v1/ccm_widget_annotations?project_name=eq.<p>&order=created_at.desc`).
  Still accept an attached/downloaded JSON file (the localStorage-mode path) — the shape is
  identical, so the rest of the skill is unchanged.
- **New final step (the loop close):** after each applied edit, run
  `bun run feedback set-status <id> review`. Document a PostgREST `PATCH
  ?id=eq.<id>` body `{"status":"review"}` (anon key) as the fallback when the CLI/repo isn't
  present. **State, prominently and in imperative form, that the agent sets `review` and NEVER
  `done`** — `done` is the human verification gate. Re-state the existing rule that
  `question`/`pin`/`area` items are surfaced only — not edited, not re-statused.
- Preserve "don't commit anything," "don't refactor surrounding code," "one annotation = one
  focused change."

**Patterns to follow:** `prompts/apply-feedback.md` (the 5-step body, the report format, the
notes); the user's environment skill `description` conventions (auto-trigger keyword style);
`prompts/install-widget.md` orchestrator tone.

**Test scenarios:**
- *Trigger:* handed a `…/feedback?project=…` URL (or an exported JSON blob), the skill
  description matches and the skill engages without the user naming it explicitly (dry-run /
  description review).
- *Step 1 URL fetch:* given the demo project's share URL, the skill fetches via WebFetch and
  parses the `exportAsJson()` JSON (count + annotations) correctly.
- *Step 1 fallback:* given an attached `ccm-feedback-*.json` file, the skill still works
  (identical shape) — the file path is not broken by the URL addition.
- *Loop close (the critical scenario):* dry-run apply on a sample annotation flips exactly one
  comment to `review` in the demo DB via `bun run feedback set-status <id> review`; verify the
  Supabase row is `review` and **was not set to `done`**.
- *Caveat enforcement:* the SKILL.md text contains no instruction or example that sets `done`;
  `question`/`pin`/`area` items are surfaced, not edited, not re-statused.
- Covers the HARD CAVEAT: agent → `review` only, never auto-`done`.
- Test expectation: skill-trigger + dry-run verification against the demo project (no automated
  suite). This IS the core Phase 3 verification.

**Verification:** Skill auto-triggers on a URL; dry-run apply flips one demo comment to
`review` (confirmed in Supabase, never `done`); URL and file inputs both parse; SKILL.md
contains zero `done`-setting guidance.

---

### U11. Update orchestrator + docs for the URL handoff

**Goal:** `prompts/install-widget.md`, `prompts/README.md`, and the docs document the skill,
the URL handoff, the endpoint, and a refreshed raw-GitHub URL table.

**Requirements:** PRO-57 Phase 3 bullets 5–6.

**Dependencies:** U6–U10 (documents their behavior).

**Files:**
- `prompts/install-widget.md` (modify — install/document the skill; point at URL handoff)
- `prompts/README.md` (modify — refresh the raw-GitHub URL table; add the skill + endpoint)
- `docs/data-model.md` (modify — export → URL handoff section; note `review` in the status enum)
- `docs/cloud-mode.md` (modify — document the `/feedback` endpoint)
- `README.md` (modify — the export/handoff section + status list mentioning `review`)
- `llms.txt` (modify — index the new skill, endpoint, CLI, migration `0004`)

**Approach:**
- `prompts/install-widget.md`: add a step (or extend Step 5) describing the closed loop —
  reviewer copies the feedback URL (cloud) or exports JSON (local); the agent installs/uses the
  `apply-ccm-feedback` skill; the agent sets handled comments to `review` and a human verifies.
  Keep the one-prompt posture.
- `prompts/README.md`: add `skills/apply-ccm-feedback/SKILL.md` and the `/feedback` endpoint to
  the routing table; refresh the raw-GitHub URL list (add the skill's raw URL; keep existing
  `self-host-supabase.md`/`harden-rls.md`).
- `docs/data-model.md`: add `review` to the documented `status` enum (currently
  `"todo" | "done" | "question"`); add an "Export → URL handoff" subsection describing the
  `/feedback?project=` endpoint returning the same `exportAsJson()` shape.
- `docs/cloud-mode.md`: add a section for the `/feedback` share endpoint (anon-key, server-side,
  read-only, the response shape, the env vars Netlify needs).
- `README.md`: update the data-model `status?` line to include `review`; update the "Hand it to
  your agent" / handoff section to mention the URL path + skill.
- `llms.txt`: add entries for `scripts/feedback.ts`, `netlify/functions/feedback`,
  `skills/apply-ccm-feedback/SKILL.md`, and `supabase/migrations/0004_status_review.sql`
  (matching the existing index style).
- Restate the hard caveat wherever the agent loop is described in docs: the agent sets
  `review`, humans flip `review`→`done`.

**Patterns to follow:** existing `prompts/README.md` table + raw-URL list; `docs/data-model.md`
status/export sections; `docs/cloud-mode.md` section structure; `llms.txt` index format.

**Test scenarios:** Test expectation: none (documentation). Verification is a consistency
review: every doc that mentions `status` lists `review`; every doc that describes handoff
mentions the URL path; the raw-GitHub URL table includes the skill; the caveat (agent →
`review`, human → `done`) appears wherever the loop is described. No code/behavior change.

**Verification:** Docs reviewed for consistency: `review` present in every status listing; URL
handoff + endpoint documented; raw-URL table refreshed; hard caveat restated in the loop docs;
no broken internal links.

**>>> PHASE 3 GATE:** Endpoint returns valid JSON on a deploy preview; skill auto-triggers on a
URL; dry-run apply flips one demo comment to `review` (never `done`); FAB copy-URL works in
cloud / disabled in local; `bun run check` + `bun run lint` pass; docs consistent.

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Agent marks work `done`, skipping human verification (defeats the feature's purpose) | Med | High | The hard caveat is restated in U10 SKILL.md (imperative, no `done` example), U11 docs, and the CLI usage docs. U10 test explicitly asserts the demo row is `review` and *not* `done`. The CLI accepting `done` is fine — only the *agent-facing* surfaces are constrained. |
| Anon key leaks via the Netlify function (into client asset or error body) | Low | High | U7: key read from server-side env only, never returned, generic error messages. U8: `git grep` confirms no secret in `netlify.toml`/committed files. Function is read-only and never accepts a client key. |
| Migration `0004` breaks on the existing CHECK constraint name | Med | Med | U1 uses guarded `DROP CONSTRAINT IF EXISTS` + re-add in the `0002`/`0003` idempotent style; tested against the demo project incl. a second (no-op) run before merge. |
| `review` missed at a status consumer (marker cycle is a separate hardcoded array) | Med | Med | U2 widens the union so `bun run check` *fails* until `STATUS_COLORS` is fixed; U4 explicitly calls out the separate `cycleStatus()` array as a required, non-type-enforced edit. |
| Copy-URL points at the wrong origin (self-hoster's site doesn't host the function) | Med | Med | Open Question 3 must be resolved before U9; document the chosen origin behavior in U11 docs. |
| `bun run check` does not type-check `scripts/feedback.ts` (tsconfig only includes `src/**/*`) | High | Low | Accepted: `biome check .` *does* lint `scripts/`. Do not broaden `tsconfig` include (would pull DOM-typed widget config onto a Bun script). Note in U6 verification. |

## Open Questions / Decisions for the Implementer

1. **FR string handling (U3).** `src/i18n.ts` is English-only (flat `STRINGS`, "swap for a real
   locale map later"); there is **no existing FR map to match**. Plan's default: add EN
   `"Review"` and record the intended FR `"À vérifier"` as a code comment for the deferred
   locale-map refactor. Confirm a comment is acceptable vs. wanting a structured FR placeholder
   now. *(Scope says "match existing FR tone" — but no FR infrastructure exists; flagged per the
   ticket's note that this is a left choice.)*

2. **Netlify function file extension/language (U7).** Plan proposes a typed Netlify function
   (`netlify/functions/feedback.mts` or `.ts`) for consistency with the TS-strict repo. The
   ticket leaves `ts` vs `mjs` open. Decide `.mts`/`.ts` (typed, repo-consistent, Netlify
   bundles it) vs `.mjs` (zero build, plain ESM). Recommendation: typed.

3. **Copied URL origin (U9).** Should "Copy feedback URL" produce the *reviewed page's* origin
   + `/feedback?project=` (requires that site to deploy the function) or the *ccm-feedback
   Netlify host* (always works for the CCM demo, cross-origin for self-hosters who host their
   own function)? Affects U9 and the U11 docs wording. Not specified in the ticket.

4. **Fate of `prompts/apply-feedback.md` (U10).** Keep it as the human-pasteable longform
   (skill is the agent-auto path) or thin it to a pointer at the skill? Either preserves the
   one-prompt posture; pick to avoid two drifting copies of the 5-step logic. Plan leans:
   keep a thin human-facing version that defers to the skill for the canonical steps.

5. **`.env` loading for the CLI (U6).** Whether `bun run feedback …` auto-loads `.env` for the
   demo project depends on Bun version/run mode (installed Bun is 1.3.6; `packageManager` pins
   1.3.11). Resolve at wiring time: rely on Bun `.env` loading if reliable, else document
   exporting the vars or passing `--url`/`--key`. Execution-time detail, not a blocker.

## Deferred / Out of Scope (explicit)

- `packages/cli/` is **dead upstream SitePing code** and absent from this tree. Do not recreate
  it. The stale `biome.json` overrides pointing at `packages/widget/src/events.ts` and
  `packages/cli/src/generators/prisma.ts` are latent no-ops — fixing them is **deferred
  follow-up**, not PRO-57.
- A real i18n locale map / French translation pipeline — deferred (only one EN string + a
  recorded FR value here).
- RLS hardening, auth, service-role usage — unchanged; the separate `harden-rls.md` flow owns it.

---
name: apply-ccm-feedback
description: >-
  Apply ccm-feedback review comments to this codebase. Use when handed a
  ccm-feedback share URL (.../feedback?project=...), a raw Supabase PostgREST
  URL for ccm_widget_annotations, or an exported ccm-feedback-<project>-<date>.json
  / { "annotations": [...] } payload of pinned client review comments. The skill
  fetches the feedback, maps each comment back to its source file, applies the
  edit, and marks each handled comment "review" (for a human to verify — never
  "done"). Triggers on: "apply feedback", "apply the review comments", "apply
  the ccm-feedback URL", "pinned comments JSON", "ccm-feedback".
---

# Apply ccm-feedback to the codebase

You've been handed feedback from the **ccm-feedback** widget — open source
(MIT), homepage: https://github.com/ccmdesign/ccm-feedback-tool. It contains
client review comments pinned to real DOM elements on a deployed website. Your
job is to translate each comment into a code edit in this repository, then
record each handled comment as `review` so a human can verify it.

Run this end-to-end. Don't ask the user to confirm individual edits unless
something is genuinely ambiguous. Batch the work and report at the end.

## The loop you are closing — read this first

`status` has four values: `todo`, `review`, `done`, `question`.

> **You set `review`. You NEVER set `done`.**
>
> `review` means "an agent handled this; a human still needs to verify the
> edit in the widget." `done` is a **human-only** transition — the reviewer
> opens the widget, checks your edit against what they asked for, and flips
> `review` → `done` themselves. The `review` status exists *precisely* so you
> do not auto-complete your own work. Never run `set-status … done`, never
> PATCH `{"status":"done"}`, never instruct anyone/anything else to. There is
> no scenario in this skill where an agent sets `done`.

## Step 1 — Fetch and validate the feedback

The input is one of (all the same shape — handle whichever you're given):

1. **A ccm-feedback share URL** — `https://<site>/feedback?project=<name>`.
   Fetch it with WebFetch. It returns the `exportAsJson()` payload:
   `{ projectName, exportedAt, count, annotations: [ ... ] }`.
2. **A downloaded JSON file** — `ccm-feedback-<project>-<date>.json`, attached
   or pasted (localStorage-mode export). Identical shape; read it directly.
3. **No-infra fallback — a raw Supabase PostgREST URL.** If you're given the
   Supabase project URL + anon key instead of a share endpoint, GET:
   `{SUPABASE_URL}/rest/v1/ccm_widget_annotations?project_name=eq.<project>&order=created_at.desc`
   with headers `apikey: <anon>` and `Authorization: Bearer <anon>`. This
   returns the raw rows array (snake_case); treat it as the `annotations`
   list. Use the **anon key only** — never a service-role key.

Each annotation looks roughly like:

```json
{
  "id": "uuid",
  "projectName": "acme-marketing",
  "message": "this CTA needs more contrast",
  "authorName": "Jane",
  "url": "https://acme.com/pricing",
  "path": "/pricing",
  "viewport": "1440x900",
  "createdAt": "2026-05-09T14:22:00.000Z",
  "status": "todo",
  "kind": "target",

  "cssSelector": "main > section.hero > a.btn-primary",
  "xpath": "/html/body/main/section[1]/a",
  "elementTag": "a",
  "elementId": "",
  "textSnippet": "Get started →",
  "textPrefix": "Ready to ship? ",
  "textSuffix": " No credit card.",
  "fingerprint": "html>body>main>section>a",
  "neighborText": "Try it free for 14 days",

  "xPct": 0.42, "yPct": 0.18, "wPct": 1, "hPct": 1
}
```

Validate:
- The payload parses as JSON.
- Top level is `{ "annotations": [...] }`, a bare array of records, or the raw
  PostgREST rows array — all equivalent.
- Filter out anything with `status === "done"` (already shipped and verified).
- Keep `todo` **and** `review` items (a `review` item may have been re-opened
  or only partially handled — re-apply and re-set it to `review`).
- **Partition by `parentId`** (camelCase from JSON / share URL; `parent_id`
  from raw PostgREST). See "Replies (`parentId`)" below — this is the
  load-bearing rule for this skill, not a nicety.
- Group remaining **top-level** annotations by `path` — work one route at
  a time.

If the input is malformed or empty, stop and tell the user.

### Replies (`parentId`) — partition this BEFORE everything else

A reply row is an `AnnotationRecord` where `parentId` is set. Replies are
degenerate: empty anchor fields, zero rect, no `status`/`kind`. If you treat
a reply as a standalone work item you'll fail source-mapping (it has no
anchor to mapping back to source) and false-escalate it as "couldn't locate."

> **Reply rows are never standalone work items.** Apply these four rules on
> every run.

1. **Partition rows by `parentId`.** `parentId` undefined / null → a comment
   (a work item, mapped to source as today). `parentId` set → a reply,
   folded into its parent's thread. **Never source-map or status a reply
   row directly.**
2. **Fold replies into the parent as conversation context.** When reading a
   comment's `message`, append its replies in `createdAt` ascending order
   (oldest → newest). Treat the **latest human reply as the current
   directive** — it supersedes the original `message` where they conflict
   (the reviewer is clarifying or redirecting).
3. **`question` items with a human reply are re-openable.** The standing
   rule ("agents don't act on `question`, don't re-status it") holds *until*
   a human reply arrives on it. A reply on a `question` is the human
   answering their own question / redirecting — re-read the thread as a
   directive and proceed as for a `todo`. Without this exception, the
   escalate → reply → re-engage loop is inert.
4. **Re-apply + re-`review` as normal.** A comment already at `review` with
   a newer human reply means "your edit wasn't right, here's more" —
   re-apply against the latest reply, set back to `review`. (`review` and
   `todo` are already kept above; `done` is still filtered out.)

### Claude-authored replies (convention, not schema)

If you post a reply back (e.g. "couldn't locate — point me at the component"
or a one-liner explaining what you changed), set `authorName = "Claude"`
(or the configured agent name). There is **no `authorRole` column** —
identify your own prior replies by author-name convention when re-reading
a thread. Posting a reply is optional; your primary response is still the
code edit + `review` status + the Claude Code chat report.

## Step 2 — For each annotation, find the source file

The widget captured the **rendered DOM** of the live site. Map each annotation
back to the **source file** in this repo. Walk these strategies in order,
stopping at the first high-confidence match:

1. **Route → file.** Use `path` (e.g. `/pricing`) to narrow to the route. By
   framework:
   - Next.js App Router: `app/pricing/page.tsx`
   - Next.js Pages Router: `pages/pricing.tsx`
   - Astro: `src/pages/pricing.astro`
   - SvelteKit: `src/routes/pricing/+page.svelte`
   - Nuxt: `pages/pricing.vue`
   - Remix: `app/routes/pricing.tsx`
   - Rails: search controllers + views for `pricing`
   - Plain static: `pricing.html` or `pricing/index.html`

2. **Element ID.** If `elementId` is non-empty, grep for `id="<elementId>"`
   (or `id={'<elementId>'}` for JSX). Usually a unique hit.

3. **Text snippet.** Grep for `textSnippet`, then for `textSnippet` flanked by
   `textPrefix` / `textSuffix` if the bare snippet has many matches.

4. **CSS selector chain.** Walk `cssSelector` right-to-left (most specific
   first). The rightmost segment is often a component name or class. Grep for
   it; if ambiguous, intersect with the route file from step 1.

5. **Neighbor text.** `neighborText` is text from sibling/parent elements —
   a tiebreaker when the snippet appears in multiple components.

6. **Fingerprint.** `fingerprint` is the structural tag chain. Use only when
   text-based strategies fail (icon/image with no text). Match by structure
   within the route's component tree.

If after all six strategies you still can't confidently locate the source,
**flag it** rather than guessing — add it to the "needs human" list.

## Step 3 — Apply the edit

Read `message` literally. The reviewer wrote what they want changed. Common
categories:

- **Visual / styling** — "more contrast", "smaller", "use brand color", "add
  spacing" → edit the component's CSS / Tailwind / styled-components props.
  Respect existing design tokens.
- **Copy** — "change to X", "this should say Y" → edit the text node.
- **Behavior** — "should open in new tab", "this link is broken" → edit
  attributes / handlers.
- **Layout** — "move this above the form", "stack on mobile" → restructure
  the JSX/template.
- **Question** (`status === "question"` or `kind === "question"`) — the
  reviewer is asking, not directing. **Don't edit. Don't re-status it.** Add
  to a "questions" list at the end and surface it to the user.

Use `xPct` / `yPct` only as a hint — where *on the element* the reviewer
pointed.

For `pin` and `area` kinds (no DOM anchor), `pinX`/`pinY` and
`areaX`/`areaY`/`areaW`/`areaH` are viewport coordinates. These are usually
meta-comments about the page — **surface them as "page-level notes," don't
edit, don't re-status.**

## Step 4 — Respect the codebase

- Match existing conventions — Tailwind project → write Tailwind; CSS Modules
  → CSS Modules; design token `var(--brand-primary)` → use it, not a literal.
- Don't refactor surrounding code. One annotation = one focused change.
- Don't introduce new dependencies.
- If a single annotation requires a sweeping change (e.g. "redesign this
  page"), flag it rather than attempting it — that's a design conversation.

## Step 5 — Close the loop: mark each handled comment `review`

After you apply the edit for an annotation, record that you handled it by
setting its status to **`review`** (NEVER `done` — see the box at the top).

Preferred (the repo has the ccm-feedback CLI / is the ccm-feedback repo):

```bash
bun run feedback set-status <id> review
```

(The CLI reads `SUPABASE_URL` / `SUPABASE_ANON_KEY` from the environment, or
takes `--url` / `--key`. Run `bun run feedback --help` for usage.)

Fallback (no CLI / not in the repo) — PATCH PostgREST directly with the
**anon key only**:

```
PATCH {SUPABASE_URL}/rest/v1/ccm_widget_annotations?id=eq.<id>
Headers: apikey: <anon>
         Authorization: Bearer <anon>
         Content-Type: application/json
         Prefer: return=representation
Body:    {"status":"review"}
```

Rules for this step:
- Only items you actually **applied an edit for** get set to `review`.
- `question`, `pin`, and `area` items are **surfaced only** — not edited, not
  re-statused.
- Items you couldn't locate are **left as-is** (still `todo`) and reported.
- **Never** set `done`. A human verifies your edit in the widget and performs
  the `review` → `done` transition.

If the feedback came from a downloaded JSON file with no Supabase backing
(localStorage mode), there is nothing to PATCH — note in your report that the
reviewer should mark the items verified in the widget themselves.

## Step 6 — Report back

```
Applied + set to review (N):
  - [path] [short description] → [file:line]  (id <id> → review)
  - …

Questions for you (N):
  - [path] "[reviewer message]" — needs decision because [reason]

Couldn't locate (N, left as todo):
  - [path] "[reviewer message]" — tried [strategies], no high-confidence match

Page-level notes (N, surfaced only):
  - [path] "[reviewer message]" (kind: pin/area)
```

Don't commit anything. The user reviews the diff and commits themselves. They
also open the widget, verify each `review` item, and flip it to `done` — that
is their step, not yours.

## Notes

- The widget never edits source. It describes what the reviewer saw on the
  live site at review time; the DOM may have drifted. If `cssSelector` and
  `xpath` both miss but `textSnippet` + `neighborText` resolve, trust the
  text-based match.
- If the same reviewer message appears multiple times (a clear pattern, e.g.
  "use brand color" on three CTAs), don't dedupe — apply each individually so
  the diff matches the review, and set each to `review`.
- If you find a clear bug while applying an edit (e.g. a broken link flagged
  by the reviewer is broken in 5 other places), add it to "Page-level notes" —
  don't silently expand scope.
- The whole point of `review` (vs. letting you set `done`) is the human gate.
  If you ever feel the urge to "just mark it done since the edit is obvious" —
  don't. That decision is the reviewer's.

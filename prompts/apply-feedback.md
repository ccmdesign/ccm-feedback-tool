# Prompt — apply ccm-feedback JSON to the codebase

> Paste everything below this line into your coding agent (Claude Code, Cursor, Copilot, Aider, etc.) **after** attaching or pasting the exported `ccm-feedback-<project>-<date>.json` file. The agent will read each annotation, find the right source file, apply the edit, and report back.

---

You have a JSON file exported from the **ccm-feedback** widget — open source (MIT), homepage: https://github.com/ccmdesign/ccm-feedback-tool. The file contains client review comments pinned to real DOM elements on a deployed website. Your job is to translate each comment into a code edit in this repository.

Run this end-to-end. Don't ask me to confirm individual edits unless something is genuinely ambiguous. Batch your work and report at the end.

## Step 1 — Read and validate the JSON

The export is an array of `AnnotationRecord` objects. Each one looks roughly like:

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
- File parses as JSON.
- Top level is either an array of records, or `{ "annotations": [...] }`.
- Filter out anything with `status === "done"` (already shipped).
- Group remaining annotations by `path` — you'll work one route at a time.

If the file is malformed or empty, stop and tell me.

## Step 2 — For each annotation, find the source file

The widget captured the **rendered DOM** of the live site. You need to map each annotation back to the **source file** in this repo. Walk these strategies in order, stopping at the first match with high confidence:

1. **Route → file.** Use `path` (e.g. `/pricing`) to narrow to the route handler. By framework:
   - Next.js App Router: `app/pricing/page.tsx`
   - Next.js Pages Router: `pages/pricing.tsx`
   - Astro: `src/pages/pricing.astro`
   - SvelteKit: `src/routes/pricing/+page.svelte`
   - Nuxt: `pages/pricing.vue`
   - Remix: `app/routes/pricing.tsx`
   - Rails: search controllers + views for `pricing`
   - Plain static: `pricing.html` or `pricing/index.html`

2. **Element ID.** If `elementId` is non-empty, grep the codebase for `id="<elementId>"` (or `id={'<elementId>'}` for JSX). Usually a unique hit.

3. **Text snippet.** Grep for `textSnippet` first, then for `textSnippet` flanked by `textPrefix` / `textSuffix` if the bare snippet has many matches. Component text strings are usually unique within a route.

4. **CSS selector chain.** Walk `cssSelector` from the right (most specific) leftward. The rightmost segment (e.g. `a.btn-primary`) is often a component name or class. Grep for it. If still ambiguous, intersect with the route file from step 1.

5. **Neighbor text.** `neighborText` contains text from sibling/parent elements — useful as a tiebreaker when the snippet appears in multiple components (e.g. a generic "Submit" button).

6. **Fingerprint.** `fingerprint` is the structural tag chain (e.g. `html>body>main>section>a`). Use only when text-based strategies fail (e.g. the element is an icon or image with no text). Match by structure within the route's component tree.

If after all six strategies you still can't confidently locate the source for an annotation, **flag it** rather than guessing. Add it to the "needs human" list at the end.

## Step 3 — Apply the edit

Read `message` literally. The reviewer wrote what they want changed. Common categories:

- **Visual / styling** — "more contrast", "smaller", "use brand color", "add spacing" → edit the component's CSS / Tailwind classes / styled-components props. Respect existing design tokens.
- **Copy** — "change to X", "this should say Y" → edit the text node.
- **Behavior** — "should open in new tab", "this link is broken" → edit attributes / handlers.
- **Layout** — "move this above the form", "stack on mobile" → restructure the JSX/template.
- **Question** (`status === "question"` or `kind === "question"`) — the reviewer is asking, not directing. Don't edit. Add to a "questions" list at the end and surface to me.

Use `xPct` / `yPct` (fractions of the anchor element's bounding box) only as a hint — they tell you *where on the element* the reviewer pointed, useful when the element has multiple sub-parts.

For `pin` and `area` kinds (no DOM anchor), `pinX` / `pinY` and `areaX` / `areaY` / `areaW` / `areaH` are viewport coordinates from the captured `viewport` size. These are usually meta-comments about the page rather than a specific element — surface them to me as "page-level notes."

## Step 4 — Respect the codebase

- Match existing conventions — if the project uses Tailwind, write Tailwind. If it uses CSS Modules, write CSS Modules. If it uses a design token like `var(--brand-primary)`, use that, not a literal hex.
- Don't refactor surrounding code. One annotation = one focused change.
- Don't introduce new dependencies.
- If a single annotation requires a sweeping change (e.g. "redesign this page"), flag it rather than attempting it — that's a design conversation, not a code edit.

## Step 5 — Report back

When done, summarize in this shape:

```
Applied (N):
  - [path] [short description] → [file:line]
  - …

Questions for you (N):
  - [path] "[reviewer message]" — needs decision because [reason]

Couldn't locate (N):
  - [path] "[reviewer message]" — tried [strategies], no high-confidence match
  - …

Page-level notes (N):
  - [path] "[reviewer message]" (kind: pin/area)
```

Don't commit anything. I'll review the diff and commit myself.

## Notes

- The widget never edits source. It only describes what the reviewer saw on the live site at review time. The DOM may have changed since — if `cssSelector` and `xpath` both miss but `textSnippet` + `neighborText` resolve, trust the text-based match.
- If the same reviewer message appears multiple times (clearly a pattern, e.g. "use brand color" on three different CTAs), don't dedupe — apply each individually so the diff matches the review.
- If you find a clear bug while applying an edit (e.g. a broken link the reviewer flagged is broken in 5 other places), add it to "Page-level notes" — don't silently expand scope.

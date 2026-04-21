# CCM Feedback Tool — Initial Spec

**Status:** Draft / ideation
**Owner:** Claudio Mendonca (CCM Design)
**Date:** 2026-04-19
**Working name:** TBD (placeholder: `feedback.ccmdesign.ca`)
**Scope:** Internal CCM tool. Collects structured feedback on CCM-built staging sites. **Emits structured change-request objects only** — does not implement changes. A separate implementation agent (different repo, TBD architecture) consumes these objects and decides what to auto-apply vs. escalate.

---

## 1. One-line

A lightweight, markup.io-style feedback collection service for CCM client reviews. Clients pin comments, propose text edits, and swap images on a live staging site; the service emits structured change-request objects (elements, coords, proposed edits) that a separate downstream implementation agent consumes.

---

## 2. Why build this

- Client reviews on CCM projects currently happen in email threads, shared PDFs, and scattered Slack/Loom messages. Nothing structured, nothing machine-readable.
- Existing tools (markup.io, BugHerd, Usersnap, Pastel) solve the commenting layer but emit comments as prose, not structured edit intents. We can't pipe "change this tagline to X" into downstream automation without parsing free text.
- The value of this service is the **structured output contract**: every reviewer action becomes a typed object with selectors, coords, and proposed values. What happens downstream — auto-apply via PR, escalation to ClickUp, manual review — is someone else's problem (a separate implementation agent).
- Owning the review UX also lets us brand the client-facing experience without a third-party login.

---

## 3. Core user flows

### 3.1 Reviewer (client) flow

1. Receives a plain URL to the staging site (e.g., `staging.client-project.ca`) — the widget is already installed and auto-loads.
2. First interaction prompts for a name (and optionally email, both free-text, no verification). Name is stored in localStorage and used to "sign" every annotation from that browser.
3. Thin control panel appears bottom-right (non-intrusive, collapsible).
4. Reviewer can:
   - **Comment mode** — click any element, leave a comment (text or voice).
   - **Edit mode** — click any text element, edit it inline, submit as a "proposed change."
   - **Area mode** — drag a box to annotate a region (for layout/whitespace feedback).
5. Each annotation is saved locally (PoC) or synced to Supabase (MVP).
6. Reviewer submits the review → triggers webhook dispatch to the implementation agent.

### 3.2 CCM team flow

1. On reviewer submission, the service emits a structured batch (see §6, Output contract) to a configured webhook URL — the implementation agent's entry point.
2. The implementation agent (separate system) decides what to do with each item: auto-apply, escalate, request clarification, ignore.
3. The implementation agent reports status back via a callback API so reviewers and internal CCM users can see the state of each annotation ("applied in PR #123," "escalated," "won't fix," etc.) in the review dashboard.
4. This service owns none of the decision logic or side effects — it's a pure signal source with a status-display layer on top.

---

## 4. Key features

### 4.1 Pin comments (baseline)

Markup.io-style: click element → comment bubble → thread.

- Stable selector (`@medv/finder`) + xpath + text-content fallback for pin re-location.
- Viewport-relative coordinates stored as well for rendering pin positions across different screen sizes.
- Comment threads with replies.
- Resolve / won't-fix / open states.

### 4.2 Inline text edits ("proposed text changes") — *new vs. markup.io*

Instead of leaving a comment like "change this tagline to X," the client just edits the text directly.

- Click-to-edit on any text node; the element becomes `contenteditable` in the shadow-DOM-isolated widget layer.
- On blur/submit, we capture:
  - Element selector + xpath + current text content (pre-edit)
  - Proposed text content (post-edit)
  - Optional accompanying comment ("make this punchier" etc.)
- **Visual cue:** element gets a subtle dashed outline + pencil badge while in edit mode; once submitted, it shows a "proposed change" badge (small orange dot) until the team acts on it.
- The change is **not** applied to the live site — it's a request, not a CMS write.
- Emits as a structured `text_change` intent, distinct from `comment`.

### 4.3 Image swaps ("proposed asset changes") — *new*

Same mental model as inline text edits, applied to `<img>` / `<picture>` / CSS background images.

- Click an image in edit mode → swap panel opens in the widget.
- Two input methods:
  - **Paste URL** — external link (Unsplash, Dropbox share, another staging URL, etc.). We `HEAD` the URL server-side to validate `content-type: image/*` and grab dimensions; reject if invalid.
  - **Upload file** — drag-drop or file picker. Uploaded to Supabase Storage (per-project bucket, public read, signed upload). Limits: 10 MB, formats `jpg/jpeg/png/webp/avif/svg/gif`.
- Preview shows old image vs. new image side-by-side in the widget before submit.
- Optional: edit `alt` text in the same panel (accessibility is usually missing from client feedback).
- Optional accompanying comment ("try this one, less corporate").
- **Visual cue:** image gets a dashed outline + swap icon badge when in edit mode; once submitted, a "proposed swap" badge overlays the corner.
- Stored fields: original `src`, proposed asset URL, source type (`link` | `upload`), proposed alt text, dimensions, file size, optional comment.
- Emits as a structured `image_swap` intent.

**Link durability:** Externally-linked URLs (Dropbox, Imgur, Unsplash) can rot before the implementation agent acts on them. We mirror every proposed external URL to Supabase Storage on submission so downstream consumers always have a stable source. The original URL is preserved for reference.

### 4.4 Voice comments via Whisper — *new*

- Mic button in the comment composer.
- Records audio in-browser, posts to a `/transcribe` Nitro endpoint.
- Endpoint calls Whisper API (OpenAI or self-hosted `whisper.cpp` for cost), then a cleanup prompt via a small model (DeepSeek V3.2 or similar — cheap) to:
  - Strip filler words ("um," "like," "you know")
  - Fix obvious transcription errors using the page context (selector, surrounding text) as grounding
  - Normalize punctuation
- Returned text goes into the comment field — reviewer can edit before submitting.
- Raw audio URL optionally stored for reference (Supabase storage).

**Why this matters:** clients describing design feedback verbally is 3–5× faster than typing, and most reviewers are non-technical. This is the single feature most likely to drive adoption vs. markup.io.

### 4.5 Downstream integration (implementation agent) — *not in this service*

This service does **not** implement, classify, or escalate anything. It delivers structured data to a separate implementation agent (different repo, architecture TBD — could be autonomous, hook-based, manually triggered, etc.) which owns all decision logic.

**What this service does:**

- On reviewer submission, POSTs the structured batch (see §6, Output contract) to a per-project webhook URL.
- Exposes a callback API so the implementation agent can report status updates per annotation (`applied`, `escalated`, `rejected`, custom strings, + optional metadata like PR URL or ClickUp task ID).
- Displays those statuses in the review dashboard so reviewers see what happened to their submissions.

**What this service does not do:**

- Classify annotations by confidence or category.
- Decide which edits to auto-apply vs. escalate.
- Open PRs, run builds, invoke Claude Code, or touch any project repo.
- Choose escalation destinations (ClickUp vs. Slack vs. email vs. nothing).
- Make any judgment about which reviewer edits are "good" or "risky."

All of that belongs to the implementation agent. This clean boundary means the implementation agent can be swapped, upgraded, or replaced entirely without touching the feedback service, and multiple implementation strategies (autonomous, human-in-the-loop, hook-based) can be A/B tested against the same feedback data.

### 4.6 Project & access

- Internal tool, no reviewer authentication.
- Each project exists in config (Supabase row); reviewers just visit the staging URL — the widget picks up `data-project` from the script tag.
- First interaction prompts for a name (required) and email (optional). Stored in localStorage + echoed on every annotation from that browser. Trivially spoofable — that's fine, this is not a security boundary.
- CCM team access to the status dashboard is behind a single shared Supabase login (one admin account for the whole team), or Supabase RLS + email allowlist. Pick whichever is simpler to set up.

---

## 5. Architecture

### 5.1 Delivery mechanism

**Script-tag injection only.** Since we control every target site, every CCM project repo gets a standard snippet in its base layout:

```html
<script
  src="https://feedback.ccmdesign.ca/w.js"
  data-project="<project-id>"
  defer
></script>
```

Guarded by an env flag (`NUXT_PUBLIC_FEEDBACK_ENABLED` or equivalent) so the widget only loads on staging/preview deploys, never production. Reviewers visit the staging URL directly — no proxy layer, no `/site=URL` indirection, no CSP/iframe issues. Same-origin with the page gives us full DOM access, auth state, and normal CSS/JS behavior for free.

**Not building:** the server-side proxy (`/site=URL`) and browser extension paths from the original brainstorm. Both only mattered for arbitrary third-party URLs, which is out of scope.

### 5.2 Stack

Superseded by [ADR-001](./adr-001-fork-baseline.md): we hard-forked SitePing (MIT) and adopted its reference stack (Next.js + Prisma) instead of the originally-planned Nuxt + Nitro. The widget remains framework-agnostic on the host site — only the feedback-tool's own server changed.

- **Frontend / widget:** SitePing baseline — vanilla TS + tsup, mounted in closed **Shadow DOM** for CSS isolation from the host page. Framework-agnostic; embeds on Nuxt, Next, static, or WordPress host sites via `<script>` tag.
- **Selector engine:** `@medv/finder` (CSS) + xpath + text-snippet + 6 additional disambiguation fields (`AnchorData` in [packages/core/src/types.ts](../packages/core/src/types.ts)).
- **State (widget-side PoC):** existing `@siteping/adapter-localstorage` — no server required.
- **State (MVP):** Prisma pointed at **Supabase Postgres**; existing `@siteping/adapter-prisma` handlers. **Supabase Storage** added for uploaded + mirrored image assets (new integration).
- **Server:** Next.js 15 App Router API routes (SitePing's reference implementation in `apps/demo/app/api/siteping/route.ts`). We add `/submit-review`, `/transcribe`, and the callback endpoint alongside the inherited `GET/POST/PATCH/DELETE` handlers.
- **Monorepo:** bun + Turborepo. Packages: `@siteping/core`, `@siteping/widget`, `@siteping/adapter-prisma`, `@siteping/adapter-memory`, `@siteping/adapter-localstorage`, `@siteping/cli`. Rebrand scope deferred to P0 (see ADR-001).
- **AI (in-scope for this service):**
  - Whisper: OpenAI API for voice transcription. Internal volume is low enough that cost is negligible.
  - Light LLM cleanup on transcribed voice comments (filler removal, punctuation). DeepSeek V3.2 via OpenRouter or similar — minor.
- **Deploy:** Netlify (Next.js app); Supabase cloud (Postgres + Storage).
- **Out of stack for this service:** anything related to implementing changes (Claude Code, GitHub Actions, PR automation, repo access, ClickUp task creation). That's the implementation agent's concern, in a separate repo with its own stack choices.

### 5.3 Data model (MVP, Supabase)

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  staging_url text not null,           -- reviewers land here
  implementation_webhook_url text,     -- where to POST submitted batches
  implementation_webhook_secret text,  -- optional HMAC signing secret
  created_at timestamptz default now()
);

create table reviewers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  name text not null,           -- prompted on first use
  email text,                   -- optional
  browser_fingerprint text,     -- crude client-generated id to dedupe same-browser reviewers
  created_at timestamptz default now()
);

create table annotations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  reviewer_id uuid references reviewers,
  url text not null,
  type text not null,           -- 'comment' | 'text_change' | 'area' | 'image_swap'
  selector text,
  xpath text,
  text_content text,            -- original text (for text_change)
  proposed_text text,           -- new text (for text_change)
  original_asset_url text,      -- original image src (for image_swap)
  proposed_asset_url text,      -- mirrored URL in our storage (for image_swap)
  proposed_asset_source text,   -- 'link' | 'upload' (for image_swap)
  proposed_alt_text text,       -- optional alt update (for image_swap)
  asset_meta jsonb,             -- { width, height, size_bytes, mime } (for image_swap)
  rect jsonb,
  viewport jsonb,
  body text,                    -- comment body (optional for text_change / image_swap)
  audio_url text,               -- voice source (optional)
  -- Status fields below are REPORTED BACK by the implementation agent
  -- via callback API. This service does not compute them.
  status text default 'submitted', -- submitted | acknowledged | applied | escalated | rejected | <custom>
  implementation_result jsonb,     -- free-form metadata from agent: { pr_url, task_url, reasoning, ... }
  implementation_updated_at timestamptz,
  created_at timestamptz default now()
);

create table replies (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid references annotations on delete cascade,
  author_id uuid,
  body text not null,
  created_at timestamptz default now()
);

create table review_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  reviewer_id uuid references reviewers,
  submitted_at timestamptz default now(),
  -- Dispatch state: did we successfully POST to the implementation webhook?
  dispatch_status text default 'pending', -- pending | delivered | failed | retrying
  dispatch_attempts int default 0,
  dispatch_last_error text
);
```

---

## 6. Output contract (the important part)

This is the stable interface between this service and any downstream implementation agent. Everything else in this spec can change; this shouldn't.

### 6.1 Outbound: batch submission webhook

On reviewer submission, POST to the project's `implementation_webhook_url`. If an HMAC secret is configured, sign the body and include the signature in `X-CCM-Signature`; if not, POST unsigned (internal network, acceptable).

```json
{
  "schema_version": "1",
  "event": "review.submitted",
  "batch_id": "uuid",
  "project_id": "uuid",
  "project_name": "BFNA Indo-Pacific",
  "staging_url": "https://staging.example.com",
  "submitted_at": "2026-04-19T15:22:00Z",
  "reviewer": {
    "name": "Jane Doe",
    "email": "jane@client.org"
  },
  "annotations": [
    {
      "id": "uuid",
      "type": "comment",
      "url": "https://staging.example.com/about",
      "target": {
        "selector": "main > section:nth-child(2) > h1",
        "xpath": "/html/body/main/section[2]/h1",
        "text_content": "Our approach to...",
        "rect": { "x": 120, "y": 340, "w": 640, "h": 48 },
        "viewport": { "w": 1440, "h": 900 },
        "scroll_y_at_creation": 200
      },
      "body": "Feels too corporate.",
      "audio_url": null,
      "created_at": "2026-04-19T15:18:00Z"
    },
    {
      "id": "uuid",
      "type": "text_change",
      "url": "https://staging.example.com/",
      "target": { "selector": "...", "xpath": "...", "rect": {...}, "viewport": {...} },
      "original_text": "Building tomorrow's data commons",
      "proposed_text": "Building the data commons of tomorrow",
      "body": null,
      "created_at": "2026-04-19T15:19:00Z"
    },
    {
      "id": "uuid",
      "type": "image_swap",
      "url": "https://staging.example.com/",
      "target": { "selector": "img.hero", "xpath": "...", "rect": {...}, "viewport": {...} },
      "original_asset_url": "https://staging.example.com/hero.jpg",
      "proposed_asset_url": "https://storage.ccmdesign.ca/projects/<id>/assets/<uuid>.jpg",
      "proposed_asset_source": "upload",
      "proposed_alt_text": "Delegates at the 2026 ASEAN summit",
      "asset_meta": { "width": 2400, "height": 1600, "size_bytes": 489201, "mime": "image/jpeg" },
      "body": "Warmer, less stock-photo.",
      "created_at": "2026-04-19T15:20:00Z"
    },
    {
      "id": "uuid",
      "type": "area",
      "url": "https://staging.example.com/",
      "target": {
        "rect": { "x": 0, "y": 1200, "w": 1440, "h": 400 },
        "viewport": { "w": 1440, "h": 900 },
        "scroll_y_at_creation": 1100
      },
      "body": "This whole section feels empty. More whitespace above, or move the CTA up?",
      "created_at": "2026-04-19T15:21:00Z"
    }
  ]
}
```

### 6.2 Inbound: status callback API

The implementation agent reports per-annotation state back via:

```
POST https://feedback.ccmdesign.ca/api/v1/annotations/<annotation_id>/status

{
  "status": "applied" | "escalated" | "rejected" | "<any string>",
  "result": {                // free-form, agent decides shape
    "pr_url": "https://github.com/ccmdesign/bfna-indo-pacific/pull/42",
    "task_url": "https://app.clickup.com/t/xyz",
    "assignee": "Aline",
    "reasoning": "..."
  },
  "updated_at": "2026-04-19T15:40:00Z"
}
```

No auth required on the callback endpoint (internal service, accepts writes from anywhere that knows a valid `annotation_id`). If this ever becomes a concern, add an optional shared bearer token later.

### 6.3 Guarantees

- **Stable selector triple:** every DOM-anchored annotation includes `selector` (CSS), `xpath`, and `text_content` so the downstream agent has fallback options if the first doesn't resolve.
- **Stable asset URLs:** externally-linked images are mirrored to CCM storage before the webhook fires; the `proposed_asset_url` is always a CCM-hosted URL the agent can rely on.
- **Retry semantics:** failed webhook deliveries are retried with exponential backoff for up to 24h; `review_batches.dispatch_status` tracks state.
- **Idempotency:** each annotation has a stable UUID; the agent can safely re-process the same batch without duplication.

### 6.4 Non-guarantees

- This service makes no promises about how fast the downstream agent responds, or whether it responds at all. If no callback arrives, annotations simply remain in `submitted` state indefinitely.
- No opinion on the agent's internal model of what's "auto-applyable" vs. "escalate-worthy." The agent is free to implement any policy.

---

## 7. Build plan

### Phase 0 — PoC (1 week, solo)

- Nuxt 3 project, deploys to Netlify. `/w.js` served from same deploy.
- Widget with Shadow DOM mount + Vue island.
- Comment pin mode only. LocalStorage-backed via Pinia.
- Install the widget snippet on one live CCM staging site (BFNA Indo-Pacific or newcommons.ai preview) via env flag.

**Exit criteria:** Can leave 10 comments on a CCM staging site, reload, and see them re-pin correctly.

### Phase 1 — Text edits + voice (1 week)

- Inline edit mode + "proposed change" badge.
- `/transcribe` endpoint + mic UI in composer.
- Still localStorage-backed.

**Exit criteria:** Can submit a mix of comments and text edits, with at least one voice-dictated comment per session, on a real client staging site.

### Phase 2 — Persistence + reviewers + image swaps (1.5 weeks)

- Supabase project set up, schema applied.
- Per-project Supabase Storage buckets for uploaded + mirrored assets.
- Image swap mode: paste URL (with `HEAD` validation + server-side mirror) + file upload.
- Pinia sync action backed by Supabase.
- Name-only reviewer prompt on first interaction; name stored in localStorage + echoed to annotations.

**Exit criteria:** Two people can annotate the same page from different machines and see each other's pins; a reviewer can submit an image swap using both a pasted URL and a local file upload, and both land as `image_swap` annotations with stable URLs in our storage.

### Phase 3 — Webhook dispatch + status dashboard (1 week)

- `/submit-review` endpoint batches annotations into a `review_batch` and POSTs to the project's `implementation_webhook_url` with HMAC signing.
- Retry/backoff logic for failed deliveries.
- `/api/v1/annotations/<id>/status` callback endpoint for the implementation agent to report results back.
- Minimal status dashboard for CCM users: list of batches, annotation statuses reported by the agent, raw `implementation_result` payloads expanded.

**Exit criteria:** Submit a review → webhook fires → a mock implementation agent (stub script) POSTs status callbacks → statuses appear in the dashboard. End-to-end without the real implementation agent existing yet.

### Phase 4 — Polish / dogfood (ongoing)

- Use on 2–3 active CCM projects (BFNA Indo-Pacific, Harvard Shorenstein, newcommons.ai) once the implementation agent (separate repo) is ready to consume webhooks.
- Improve selector re-anchoring heuristics based on observed drift.
- Richer status dashboard: filters by reviewer, type, status; link-outs to PR/task URLs reported in `implementation_result`.

---

## 8. Open questions

1. **Schema versioning:** Output contract schema is versioned (`schema_version: "1"`) but no policy yet for migrations. Additive changes (new optional fields) are safe; breaking changes would need contract negotiation with the implementation agent. Revisit if/when a v2 shape becomes necessary.
2. **Selector drift:** How much effort to invest in re-anchoring pins after content changes? Start with "flag drift, don't fix" and revisit.
3. **Screenshot capture:** Should we include a rasterized screenshot URL in every annotation payload (via `html2canvas` client-side, or Playwright server-side)? Useful for the downstream agent when selectors fail, but adds weight. Leaning: client-side screenshot of the annotated element's bounding box only, lazy-uploaded to storage.
4. **Multiple implementation webhooks per project:** Useful if we ever want to fan out to, say, a logging/analytics sink alongside the real implementation agent. Simple to add later — skip in v1.
5. **Widget authoring model:** Widget is served from `feedback.ccmdesign.ca/w.js`, versioned how? Always-latest risks breaking deployed sites; pinned versions per project adds maintenance. Leaning: single evergreen bundle with a stable public API and careful backwards compat, since we control all consumers.

---

## 9. Non-goals (explicit)

- **Not an implementation agent.** This service does not apply changes, open PRs, classify by confidence, escalate, or make any decision about what to do with reviewer input. It emits structured data and displays status reported back. The implementation agent is a separate project with its own repo and architecture.
- **Not a CMS.** The widget never writes to the live site. Every edit is a proposed change emitted on the output contract.
- **Not a bug tracker.** Technical bug reports are out of scope; ClickUp/Linear stay as-is for internal engineering issues.
- **Not a universal tool.** Targets CCM-built sites only (Nuxt, Next, static, WordPress we maintain). No effort spent on proxying arbitrary third-party URLs, browser extensions, or cross-origin hacks.
- **Not a SaaS.** Internal tool for CCM Design. No white-labeling, no external tenants, no billing.
- **Not a chat tool.** Threaded replies exist, but real-time chat / presence is out of scope for v1.

---

## 10. Related CCM work to leverage

- **Nuxt + D3 muscle memory** — widget, Nitro server, and status dashboard build on the familiar CCM stack.
- **newcommons.ai Contentful pattern** — potential reuse for project/reviewer configuration UI in the admin area.
- **Whisper + cleanup LLM pattern** — similar to existing Varro agent prompt scaffolding; can borrow the transcription cleanup prompt shape.
- **Implementation agent (separate project, TBD)** — will leverage Varro routing patterns, `pr-review-handoff` skill, Claude Code workflows, etc. None of that work lives here.

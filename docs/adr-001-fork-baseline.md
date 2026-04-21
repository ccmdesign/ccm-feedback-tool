# ADR-001: Hard-fork SitePing as baseline for CCM Feedback Tool

**Status:** Accepted
**Date:** 2026-04-20
**Author:** Claudio Mendonca

---

## Context

The CCM Feedback Tool (see [spec.md](./spec.md)) needs a browser widget that:

- Injects into CCM-built staging sites via `<script>` tag
- Lives in Shadow DOM, framework-agnostic on the host
- Captures DOM-anchored annotations with a stable multi-strategy selector (CSS + xpath + text)
- Ships structured change-request objects to a downstream implementation agent

An open-source survey (see session history) found **SitePing** (`NeosiaNexus/SitePing`, MIT) as a near-direct architectural match: same Shadow DOM approach, same `@medv/finder` selector library, framework-agnostic, ~23KB gzipped, bun + Turborepo monorepo, 780+ unit tests, 29 E2E tests, actively maintained (last commit 4 days before fork).

Building from scratch would duplicate ~70% of SitePing's implementation (selector capture, Shadow DOM isolation, FAB/panel UX, retry-with-backoff, adapter abstraction, i18n scaffold) with no meaningful differentiation. The differentiators in our spec — typed `text_change` / `image_swap` intents, HMAC webhook dispatch, voice-first comments, asset mirroring — are additive, not replacements.

## Decision

**Hard-fork SitePing at upstream commit `f3e8833`.**

- **Repo:** [ccmdesign/ccm-feedback-tool](https://github.com/ccmdesign/ccm-feedback-tool) (private)
- **Seed commit:** `d3a8de2` — `feat: seed CCM feedback tool spec`
- **Upstream remote preserved** at `https://github.com/NeosiaNexus/SitePing.git` for cherry-picking fixes and improvements
- **License:** MIT retained; copyright notice stays in `LICENSE`
- **Stack:** **Option A** — Next.js 15 + Prisma + Supabase Postgres + Supabase Storage. Supersedes the original spec's Nuxt + Nitro + Supabase stack (spec §5.2). The SitePing widget is framework-agnostic, so host sites remain free to be Nuxt, Next, static, or WordPress — only the feedback-tool's own server is affected.

## Rationale for Option A (stack)

| Factor | Option A: Next + Prisma | Option B: Nuxt + Nitro |
|---|---|---|
| Reuse of SitePing's 780+ tests | Full | Partial (widget only) |
| Rework of `adapter-prisma` + `apps/demo` | None | Major rewrite |
| Supabase compatibility | Prisma → Supabase Postgres; Supabase Storage as separate client | Native Supabase JS client |
| Stack familiarity (CCM) | Less mature on Next | Nuxt is CCM muscle memory |
| Time to first deploy | Low | High |

The widget is the value; the admin/server is implementation detail. Staying on SitePing's reference stack preserves the monorepo's existing test coverage and shortens time-to-first-dogfood. The cost — dropping Nuxt muscle memory for the server — is recoverable later if it matters.

## Deltas vs. SitePing baseline

Four features from the spec are absent from SitePing and represent the actual net-new work:

1. **Typed `text_change` intent** — contenteditable UI on text nodes, `original_text`/`proposed_text` fields, "proposed change" badge. New annotation type.
2. **Typed `image_swap` intent** — swap panel with URL paste / file upload, HEAD validation, Supabase Storage mirror, alt editing. New annotation type.
3. **HMAC webhook dispatch** — `projects` table with `implementation_webhook_url`, `review_batches`, `/submit-review` endpoint, callback API for status reports. Leverages SitePing's existing retry-with-backoff pattern in [packages/widget/src/api-client.ts](../packages/widget/src/api-client.ts).
4. **Voice + Whisper** — `MediaRecorder` UI in composer, `/transcribe` server route (Whisper + LLM cleanup), optional `audio_url` on annotation.

Everything else in the spec is already implemented in SitePing or is minor polish (rebranding, copy, config).

## Revised phase order

Original spec phases (§7) assumed a greenfield build. Since most of Phase 0 and half of Phase 2 (comments, persistence, reviewers, selector triple) are already built, the work reorders:

| Phase | Work | Status |
|---|---|---|
| **P0** | Rebrand (package names, demo copy, CLI, readme). Swap SitePing's Prisma target for Supabase Postgres. Provision Supabase project + Storage bucket. Deploy once to Netlify as baseline. | — |
| **P1** | Project + webhook schema. `projects` table, `implementation_webhook_url`/`_secret`, `review_batches`, `/submit-review` batching, retry dispatch, callback endpoint. Extend demo to submit against a mock implementation agent. | — |
| **P2** | `text_change` intent. New annotation type in `core/types.ts`, contenteditable UI, widget mode switch, schema/validation, "proposed change" badge rendering. | — |
| **P3** | `image_swap` intent. New type, widget swap panel, server upload handler, Supabase Storage integration, URL mirroring, HEAD validation. | — |
| **P4** | Voice + Whisper. Composer mic button, `/transcribe` route, Whisper API call, LLM cleanup prompt, optional `audio_url` persistence. | — |
| **P5** | Dogfood on 2–3 active CCM projects once implementation agent is ready. Drift handling, screenshot capture (spec §8 open Q3), version pinning policy (open Q5). | — |

Webhook dispatch (P1) moves earlier than the original spec (Phase 3) because it defines the contract boundary with the implementation agent and unblocks parallel work on that side.

## Consequences

**Gained:**
- 780+ unit tests + 29 E2E tests inherited as baseline
- Framework-agnostic widget + Shadow DOM isolation + multi-strategy anchoring for free
- `SitepingStore` adapter pattern gives us a swap point if Prisma or Supabase ever becomes wrong
- Percentage-relative rects (responsive-safe) — free bonus not in our spec

**Accepted costs:**
- Bound to Next.js App Router for the admin/server surface (SitePing's reference implementation). Host sites remain any framework.
- Must maintain rebrand discipline — `@siteping/*` package names, `siteping-widget` element, `SitepingFeedback` table names will need renaming in a coordinated pass.
- Cherry-picking upstream improvements requires tracking. `upstream` remote is configured; policy is "review before merge," not "auto-sync."
- MIT attribution must remain in LICENSE and, per common practice, in README. We add a NOTICE section documenting the fork relationship.

**Rejected alternatives:**
- **Build from scratch** — rejected. ~70% overlap with SitePing would be wasted effort with no differentiation payoff.
- **GitHub fork (soft fork)** — rejected. Brands the repo as a SitePing derivative forever, complicates upstream-link semantics once we diverge.
- **Submodule SitePing** — rejected. We'll modify widget internals (new annotation types, composer UI) too deeply to keep upstream pristine.

## Open questions deferred

These remain unresolved and will be revisited during the relevant phase:

- **Rebrand scope** (P0): do we keep `@siteping/*` workspace names internally and only rebrand public-facing surfaces, or rename everything? Decision deferred until we see the churn cost.
- **Webhook schema versioning** (P1): spec §8.1 flagged but left policy open. Revisit before P1 ships.
- **Widget version pinning per project** (P5): spec §8.5. Evergreen bundle for now; revisit after the first breaking change.

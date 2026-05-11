# Changelog

All notable changes to ccm-feedback are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-05-11

First public release. Fork of [SitePing](https://github.com/NeosiaNexus/SitePing) (MIT) reshaped around two ideas: open-source by default, JSON-as-handoff to coding agents.

### Added

- **Single-script widget** — drop `<script src="…/w.js" data-project="…">` on any HTML page; floating action button mounts in an open Shadow DOM.
- **Three annotation kinds** — `target` (anchored to a DOM element), `pin` (viewport coord), `area` (drag rectangle).
- **DOM anchoring resolver** — four-strategy fallback (CSS selector via `@medv/finder`, XPath, text snippet with prefix/suffix + neighbor text, structural fingerprint). Survives class renames, minor text edits, small structural refactors. See `docs/anchoring.md`.
- **Local mode** — annotations persist in `localStorage`, namespaced by `data-project`. Zero backend required.
- **Cloud mode (optional)** — Supabase Postgres + Realtime sync via raw `fetch` and native `WebSocket`. No `@supabase/supabase-js` dependency. Activated by setting `data-supabase-url` + `data-supabase-key` on the script tag. Auto-disabled on `localhost` / `*.local`.
- **JSON export** — one click downloads `ccm-feedback-<project>-<date>.json` with every annotation and full DOM anchor. Schema documented in `docs/data-model.md`.
- **localStorage → cloud migration on init** — when cloud mode activates, existing local annotations migrate to the cloud automatically (one-time per browser).
- **Status + kind fields** — `todo` / `done` / `question` and `target` / `pin` / `area` (migrations `0002_status_pin_area.sql`, `0003_realtime.sql`).
- **i18n** — English (default) and French.
- **Agent-installable prompts** — `prompts/install-widget.md` is the single entry prompt; the orchestrator agent fetches `prompts/self-host-supabase.md` and `prompts/harden-rls.md` from GitHub itself. One paste, end-to-end install. Plain `scripts/apply-migrations.sh` available as a CLI alternative.
- **`prompts/apply-feedback.md`** — companion prompt that takes the exported JSON and instructs an agent how to interpret each field and apply the edits to the codebase. Closes the review-to-edit loop.
- **Landing page (`feedback.ccmdesign.ca`)** — page IS the playground; the FAB is live on the demo. Hero reframed around the agent loop ("Client pins. Agent edits."). New "01 — the loop" section walks the three-step flow with annotated JSON snippet.
- **Documentation** — `docs/self-hosting.md`, `docs/cloud-mode.md`, `docs/anchoring.md`, `docs/data-model.md`, `docs/architecture.md`, `llms.txt` (machine-readable index for AI tools).
- **Google Analytics** — landing page only, CCM Design property (`G-PWP8CD3WD7`).
- **Marketing collateral** — `marketing/product-hunt.md` with launch positioning, gallery list, first comment, and pre-launch checklist.

### Configuration

| Script tag attribute | Purpose | Default |
|---|---|---|
| `data-project` | Storage namespace + cloud filter | hostname-derived |
| `data-accent` | Hex color (`#RGB` / `#RRGGBB` / `#RRGGBBAA`) | `#0066ff` |
| `data-theme` | `light` / `dark` / `auto` | `light` |
| `data-debug` | Console-log lifecycle events | off |
| `data-supabase-url` | Supabase project URL (cloud mode) | — |
| `data-supabase-key` | Supabase **anon** key (browser-safe) | — |

### Known constraints

- Desktop-only by design (FAB hidden below 768px).
- The widget never reads environment variables at runtime — config comes from script-tag attributes or `window.CcmFeedback.init({ … })`.
- Service-role keys are **never** acceptable in cloud mode. Anon/publishable key only.

### Attribution

ccm-feedback is a fork of [SitePing](https://github.com/NeosiaNexus/SitePing) by NeosiaNexus, MIT licensed. Original copyright preserved in `LICENSE`. See `NOTICE` for full attribution.

[Unreleased]: https://github.com/ccmdesign/ccm-feedback-tool/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ccmdesign/ccm-feedback-tool/releases/tag/v0.1.0

<div align="center">

<h1>ccm-feedback</h1>

**Open-source feedback widget for the agent era. Client pins, agent edits, you ship.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/ccmdesign/ccm-feedback-tool?style=social)](https://github.com/ccmdesign/ccm-feedback-tool)
[![Demo](https://img.shields.io/badge/demo-live-success)](https://feedback.ccmdesign.ca)

</div>

Drop one `<script>` on any HTML page. A reviewer pins comments on real DOM elements. You export the lot as a clean JSON file and hand it to Claude, Cursor, or any coding agent — which has every selector, position, and comment it needs to ship the edits without you mediating "the third button on the second card." Works with no backend (localStorage) or with optional Supabase sync for multi-reviewer workflows.

Built and used by [CCM Design](https://ccm.design) for client website reviews.

---

## Install

Drop a single script tag in your HTML. **Always include `data-supabase-url` + `data-supabase-key`** — omit them and the widget silently drops into localStorage-only mode (comments never leave the reviewer's browser, nothing syncs, and nothing tells you it happened):

```html
<script
  src="https://ccm-feedback-582.netlify.app/w.js"
  data-project="my-project"
  data-supabase-url="https://qnkvkumtssihbjmocbtv.supabase.co"
  data-supabase-key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFua3ZrdW10c3NpaGJqbW9jYnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Nzc0OTcsImV4cCI6MjA5MjI1MzQ5N30._lmyjRjITwD9m-ov0QTzzRNmqpwtbYoXM_HLF2rzfSk"
  defer
></script>
```

That's it. The floating action button appears bottom-right on desktop. `data-supabase-url`/`data-supabase-key` above point at CCM's shared multi-tenant Supabase project — `data-project` is what keeps `my-project`'s annotations isolated from every other site on that shared backend, so **set it to a slug unique to this site** (never leave it as the literal string `my-project`). Want your own dedicated Supabase project instead of the shared one? See [docs/self-hosting.md](docs/self-hosting.md).

> Mobile (<768px) is hidden by design — this is a desktop review tool.

### Options (script tag attributes)

| Attribute             | Purpose                                              | Default     |
| --------------------- | ---------------------------------------------------- | ----------- |
| `data-project`        | **Required.** Namespace for storage + cloud filter. Must be unique per site. | —           |
| `data-supabase-url`   | **Required by default.** Supabase project URL — enables cloud mode. Omit both this and `data-supabase-key` only if you deliberately want localStorage-only mode. | —           |
| `data-supabase-key`   | **Required by default.** Supabase **anon** key. Browser-safe. Paired with `data-supabase-url` above. | —           |
| `data-accent`         | Hex color (`#RGB`, `#RRGGBB`, `#RRGGBBAA`).          | `#0066ff`   |
| `data-theme`          | `light`, `dark`, or `auto`.                          | `light`     |
| `data-debug`          | Console-log lifecycle events.                        | off         |

Or initialize manually:

```ts
window.CcmFeedback.init({
  projectName: "my-project", // unique per site
  accentColor: "#0066ff",
  theme: "auto",
  // Always set these two — omitting them silently drops to localStorage-only mode:
  supabaseUrl: "https://qnkvkumtssihbjmocbtv.supabase.co",
  supabaseKey: "YOUR_ANON_KEY", // see the Install snippet above for the shared CCM anon key
});
```

## Two modes

### 1. Cloud mode (Supabase) — the default install

Pass `data-supabase-url` + `data-supabase-key` (the Install snippet above already does). Annotations sync to a Supabase Postgres table (`ccm_widget_annotations`) over PostgREST, and updates from other reviewers stream in over Supabase Realtime. No `@supabase/supabase-js` dependency — the widget speaks raw HTTP and WebSocket. This is what every install should ship with.

### 2. Local mode (opt-out only)

Deliberately omit `data-supabase-*`. Annotations are saved to `localStorage` per project, scoped to the current browser, with no sync — a `review` step doesn't reach a second browser or device. Hit **Export** to download a JSON file instead. Only choose this on purpose (offline demo, no infra allowed); it is **not** the recommended path, and it's easy to fall into it by accident by forgetting the Supabase attributes.

To self-host the backend, see [docs/self-hosting.md](docs/self-hosting.md). Quick version: create a Supabase project, run `supabase/migrations/*.sql` in order, paste the URL + anon key into the script tag.

## How it works

1. Click the FAB → radial menu (target / pin / area / toggle / export / clear).
2. Click any element (target mode), drop a coord pin (pin mode), or drag a rectangle (area mode).
3. A textarea popover opens anchored to that element. `⌘/Ctrl + Enter` submits.
4. Pins persist (localStorage or Supabase) and re-render on page load.
5. Click an existing pin → popover with comment, status, delete.
6. **Hand off:** in cloud mode, **Copy feedback URL** → `<site>/feedback?project=<name>`; in local mode, **Export** → `ccm-feedback-<project>-<date>.json`. Same shape either way.
7. Agent applies the edits and marks each handled comment **`review`**; you verify in the widget and flip `review` → `done` (the agent never sets `done`).

## DOM anchoring

Each pin stores four resolution strategies so the anchor survives reasonable DOM changes:

- CSS selector via [`@medv/finder`](https://github.com/antonmedv/finder)
- XPath
- Text snippet + prefix/suffix + neighbor text
- Structural fingerprint (tag chain)

At render time the resolver walks the fallbacks and scores candidates — an anchor can be re-resolved even after class renames, minor text edits, or small structural refactors. Full writeup: [docs/anchoring.md](docs/anchoring.md).

## Data model

```ts
interface AnnotationRecord {
  id: string;
  projectName: string;
  message: string;
  authorName: string;
  url: string;
  path: string;
  viewport: string;       // e.g. "1280x800"
  userAgent: string;
  createdAt: string;      // ISO-8601
  status?: "todo" | "review" | "done" | "question";  // agent sets "review", human flips to "done"
  kind?: "target" | "pin" | "area";
  // DOM anchor
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId?: string;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
  // Position as fractions of the anchor bounding box (target kind)
  xPct: number; yPct: number; wPct: number; hPct: number;
  // Optional viewport coords (pin / area kinds)
  pinX?: number; pinY?: number;
  areaX?: number; areaY?: number; areaW?: number; areaH?: number;
  capturedElements?: CapturedElement[];
}
```

Full schema: [docs/data-model.md](docs/data-model.md).

## Develop

```bash
bun install
bun run dev            # esbuild watch → dist/w.js + public/w.js
bun run serve          # build + serve public/ on :5173
bun run check          # tsc --noEmit
bun run lint:fix       # biome
```

Architecture notes: [docs/architecture.md](docs/architecture.md).

## Deploy your own

`bun run build` produces `dist/w.js`. Drop it on any static host (Netlify, Cloudflare Pages, S3, your own CDN) and reference it from the script tag.

The existing public build lives at `https://ccm-feedback-582.netlify.app/w.js` and is fine for personal projects, but it's served as-is, no SLA. For production review workflows, host your own.

## Hand it to your agent

**One prompt. Zero further pasting.** ccm-feedback's DX posture is *anything a human would copy-paste from the README is also shippable as a prompt to an agent — and the user only ever pastes one prompt.*

Copy [`prompts/install-widget.md`](prompts/install-widget.md) (or the prompt block on the [demo page](https://ccm-feedback-582.netlify.app)) into your coding agent. The agent will:

1. Install the widget in your global layout.
2. Ask whether you also want cloud sync (Supabase) and/or production RLS hardening.
3. **Fetch the sub-prompts from GitHub itself** (`self-host-supabase.md`, `harden-rls.md`) and execute them end-to-end. You don't paste anything else.
4. Install the [`apply-ccm-feedback`](skills/apply-ccm-feedback/SKILL.md) skill so the loop closes.

Sub-prompts live in [`prompts/`](prompts/) — they exist as files so the orchestrator can `WebFetch` them, but most users will never read them directly.

### The review → edit → review loop

ccm-feedback is built for the agent era: review comes back to a coding agent as a **URL** (cloud) or **JSON file** (local), the agent applies each edit, and it marks each handled comment **`review`** — never `done`.

```
reviewer pins → Copy feedback URL (cloud) / Export JSON (local)
             → agent runs apply-ccm-feedback skill
             → agent applies edit, sets status = review   ◄── NEVER done
             → human verifies in the widget, flips review → done
```

The `review` status exists precisely so the agent doesn't auto-complete its own work — a human is always the gate between `review` and `done`. The [`apply-ccm-feedback` skill](skills/apply-ccm-feedback/SKILL.md) auto-triggers on a feedback URL or JSON; [`scripts/feedback.ts`](scripts/feedback.ts) (`bun run feedback set-status <id> review`) is the CLI it uses. The `/feedback?project=` share endpoint serves Supabase rows server-side with the **anon key only** — see [docs/cloud-mode.md](docs/cloud-mode.md).

Plain-script alternative for CLI-comfortable users: [`scripts/apply-migrations.sh`](scripts/apply-migrations.sh).

## Documentation

- [docs/self-hosting.md](docs/self-hosting.md) — bring your own Supabase
- [docs/cloud-mode.md](docs/cloud-mode.md) — how cloud sync works, RLS, realtime
- [docs/anchoring.md](docs/anchoring.md) — DOM anchor resolver internals
- [docs/data-model.md](docs/data-model.md) — full annotation schema
- [docs/architecture.md](docs/architecture.md) — code map
- [llms.txt](llms.txt) — machine-readable index for AI tools

## Contributing

Bug reports, fixes, and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: [SECURITY.md](SECURITY.md).

## License & attribution

MIT — see [LICENSE](LICENSE).

ccm-feedback is a fork of [SitePing](https://github.com/NeosiaNexus/SitePing) by NeosiaNexus, MIT licensed. Original copyright preserved in `LICENSE`. Attribution details: [NOTICE](NOTICE).

Maintained by [CCM Design](https://ccm.design).

<div align="center">

<h1>ccm-feedback</h1>

**One script tag. Pin comments on any element. Export JSON.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/ccmdesign/ccm-feedback-tool?style=social)](https://github.com/ccmdesign/ccm-feedback-tool)
[![Netlify](https://img.shields.io/badge/demo-live-success)](https://ccm-feedback-582.netlify.app)

</div>

A dead-simple feedback widget for reviewing web pages. Drop one `<script>` on any HTML page, click the floating button, pin comments on real elements, hand a JSON file to a developer. Works with no backend at all (localStorage). Optional Supabase backend turns it into a multi-reviewer, multi-device tool when you want it.

Built and used by [CCM Design](https://ccm.design) for client website reviews.

---

## Install

Drop a single script tag in your HTML:

```html
<script
  src="https://ccm-feedback-582.netlify.app/w.js"
  data-project="my-project"
  defer
></script>
```

That's it. The floating action button appears bottom-right on desktop. Annotations persist in `localStorage` under `ccm-feedback:my-project`.

> Mobile (<768px) is hidden by design — this is a desktop review tool.

### Options (script tag attributes)

| Attribute             | Purpose                                              | Default     |
| --------------------- | ---------------------------------------------------- | ----------- |
| `data-project`        | **Required.** Namespace for storage + cloud filter.  | —           |
| `data-accent`         | Hex color (`#RGB`, `#RRGGBB`, `#RRGGBBAA`).          | `#0066ff`   |
| `data-theme`          | `light`, `dark`, or `auto`.                          | `light`     |
| `data-debug`          | Console-log lifecycle events.                        | off         |
| `data-supabase-url`   | Supabase project URL. Enables cloud mode (with key). | —           |
| `data-supabase-key`   | Supabase **anon** key. Browser-safe.                 | —           |

Or initialize manually:

```ts
window.CcmFeedback.init({
  projectName: "my-project",
  accentColor: "#0066ff",
  theme: "auto",
  // Optional cloud mode:
  supabaseUrl: "https://YOURREF.supabase.co",
  supabaseKey: "YOUR_ANON_KEY",
});
```

## Two modes

### 1. Local mode (default — no infra)

Don't pass `data-supabase-*`. Annotations are saved to `localStorage` per project, scoped to the current browser. Hit **Export** to download a JSON file. This is the recommended starting point.

### 2. Cloud mode (Supabase)

Pass `data-supabase-url` + `data-supabase-key`. Annotations sync to a Supabase Postgres table (`ccm_widget_annotations`) over PostgREST, and updates from other reviewers stream in over Supabase Realtime. No `@supabase/supabase-js` dependency — the widget speaks raw HTTP and WebSocket.

To self-host the backend, see [docs/self-hosting.md](docs/self-hosting.md). Quick version: create a Supabase project, run `supabase/migrations/*.sql` in order, paste the URL + anon key into the script tag.

## How it works

1. Click the FAB → radial menu (target / pin / area / toggle / export / clear).
2. Click any element (target mode), drop a coord pin (pin mode), or drag a rectangle (area mode).
3. A textarea popover opens anchored to that element. `⌘/Ctrl + Enter` submits.
4. Pins persist (localStorage or Supabase) and re-render on page load.
5. Click an existing pin → popover with comment, status, delete.
6. **Export** → downloads `ccm-feedback-<project>-<date>.json` with every annotation + DOM anchor.

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
  status?: "todo" | "done" | "question";
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

Sub-prompts live in [`prompts/`](prompts/) — they exist as files so the orchestrator can `WebFetch` them, but most users will never read them directly.

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

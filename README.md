<div align="center">

<h1>CCM Feedback</h1>

**Client feedback, pinned to the pixel.**

A self-hosted feedback widget for ccmdesign. Clients draw rectangles, leave comments, and flag bugs directly on the live site. Supabase-backed. Deployed on Netlify.

![Demo](./demo.gif)

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

[Getting Started](#getting-started) &middot; [Configuration](#configuration) &middot; [API Reference](#api-reference) &middot; [CLI](#cli) &middot; [Architecture](#architecture)

</div>

---

## Why CCM Feedback?

Stop chasing client feedback across Slack threads, email chains, and Notion docs. CCM Feedback gives your clients a **contextual** way to leave feedback — anchored to the exact element they're looking at.

---

## Features

- **Rectangle annotations** — Clients draw directly on the page, with category + message
- **DOM-anchored persistence** — Annotations are tied to elements, not pixels. They survive layout changes
- **Shadow DOM isolation** — Widget CSS never leaks into your site, and your site CSS never breaks the widget
- **Radial menu** — Clean FAB with expandable actions (chat, annotate, toggle)
- **Feedback panel** — Searchable, filterable history with type chips and resolve/unresolve
- **Smart tooltips** — Hover a marker to preview, click to open the panel
- **Retry with backoff** — Failed submissions are queued in localStorage and retried automatically
- **Zero config auth** — Clients identify once (name + email), persisted locally
- **Full event system** — `onOpen`, `onClose`, `onFeedbackSent`, `onError`, `onAnnotationStart`, `onAnnotationEnd`
- **CLI scaffold** — `npx @ccm-feedback/cli init` sets up Prisma schema + API route
- **Monorepo** — Split into independent packages (`widget`, `adapter-prisma`, `adapter-memory`, `adapter-localstorage`, `cli`)
- **Dev-only by default** — Widget auto-hides in production unless `forceShow: true`
- **Lightweight** — ~23KB gzipped

---

## Getting Started

See [`docs/local-dev.md`](./docs/local-dev.md) for the full local runbook (memory store + Supabase paths).

### Quick start

```bash
bun install
bun run build
```

Run the demo locally (memory store, no database required):

```bash
cd apps/demo
bun run dev
```

To run against a Supabase Postgres:

1. Set `DATABASE_URL` + `DIRECT_URL` in `apps/demo/.env.local` (see `.env.example`)
2. `bunx prisma generate --schema=prisma/schema.prisma`
3. `bunx prisma db push --schema=prisma/schema.prisma`
4. `cd apps/demo && bun run dev`

---

## Configuration

```ts
initCcmFeedback({
  // Required (one of endpoint or store)
  endpoint: '/api/feedback',      // Your API route (HTTP mode)
  // OR
  store: new LocalStorageStore(), // Direct store (client-side mode, no server)
  projectName: 'my-project',      // Scopes feedbacks to this project

  // Optional
  position: 'bottom-right',       // 'bottom-right' | 'bottom-left'
  accentColor: '#0066ff',         // Widget accent color
  theme: 'light',                 // 'light' | 'dark' | 'auto'
  locale: 'en',                   // 'en' | 'fr' (default: 'en')
  forceShow: false,               // Show in production? Default: false
  debug: false,                   // Enable debug logging

  // Events
  onOpen: () => {},
  onClose: () => {},
  onFeedbackSent: (feedback) => {},
  onError: (error) => {},
  onAnnotationStart: () => {},
  onAnnotationEnd: () => {},
  onSkip: (reason) => {},
})
```

### Return value

```ts
const widget = initCcmFeedback({ ... })

widget.open()
widget.close()
widget.refresh()
widget.destroy()

// Event listeners (alternative to config callbacks)
const unsub = widget.on('feedback:sent', (feedback) => { ... })
unsub()
widget.off('feedback:sent', handler)
```

---

## API Reference

### Server adapter

```ts
// app/api/feedback/route.ts
import { createCcmFeedbackHandler } from '@ccm-feedback/adapter-prisma'
import { prisma } from '@/lib/prisma'

export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({ prisma })
```

| Method | Description | Status |
|--------|-------------|--------|
| `POST` | Create a feedback with annotations | `201` with full feedback object |
| `GET` | List feedbacks (filterable by type, status, search) | `200` with `{ feedbacks, total }` |
| `PATCH` | Resolve or unresolve a feedback | `200` with updated feedback |
| `DELETE` | Delete a feedback or all feedbacks for a project | `200` with `{ deleted: true }` |

### Prisma schema

Schema lives at the repo root: [`prisma/schema.prisma`](./prisma/schema.prisma). Models: `FeedbackItem` and `FeedbackAnnotation`.

---

## CLI

```bash
npx @ccm-feedback/cli init
```

Interactive setup that:

1. Detects your `prisma/schema.prisma` file
2. Merges the CCM Feedback models (idempotent — safe to run multiple times)
3. Generates the Next.js App Router API route at `app/api/feedback/route.ts`

---

## Architecture

- **Shadow DOM (closed)** — Widget styles are fully isolated from the host page
- **Overlay outside Shadow DOM** — The annotation overlay and markers live in the main DOM to avoid clipping from `overflow:hidden` containers
- **Multi-selector anchoring** — Each annotation stores a CSS selector ([`@medv/finder`](https://github.com/antonmedv/finder)), XPath, and text snippet
- **Percentage-relative rectangles** — Annotation positions are stored as fractions of the anchor element's bounding box, so they survive responsive layout changes
- **Event bus with error isolation** — User callbacks (`onError`, etc.) cannot crash internal widget logic

### Packages

| Package | Platform | Description |
|---------|----------|-------------|
| `@ccm-feedback/widget` | Browser | Widget: `initCcmFeedback()` |
| `@ccm-feedback/adapter-prisma` | Node.js | Server: `createCcmFeedbackHandler()` |
| `@ccm-feedback/adapter-memory` | Any | In-memory store (testing, demos, serverless) |
| `@ccm-feedback/adapter-localstorage` | Browser | Client-side localStorage store (demos, prototyping) |
| `@ccm-feedback/cli` | CLI | Setup: `init`, `sync`, `status`, `doctor` |

All adapters implement the `CcmFeedbackStore` interface — swap adapters without changing any other code.

---

## Testing

```bash
# Unit tests (Vitest)
bun run test:run

# E2E tests (Playwright)
bun run test:e2e

# Type check
bun run check
```

---

## Troubleshooting

### Widget doesn't appear

The widget is **dev-only by default**. It auto-hides when `NODE_ENV=production`.

- **Fix:** Pass `forceShow: true` in the config to show it in production.
- The widget also hides on viewports narrower than **768px** (mobile).

### localStorage keys changed after the rebrand

The CCM Feedback rebrand invalidates three previously-used localStorage keys:

- `siteping_identity` → `ccm_feedback_identity`
- `siteping_retry_queue` → `ccm_feedback_retry_queue`
- `siteping_feedbacks` → `ccm_feedback_items`

Existing users will be asked for name/email again on first interaction. Any in-flight retry-queue entries from the old key are abandoned. See [`docs/local-dev.md`](./docs/local-dev.md) for details.

---

## License

[MIT](./LICENSE)

## Acknowledgements

CCM Feedback is based on [SitePing](https://github.com/NeosiaNexus/SitePing) by [NeosiaNexus](https://github.com/NeosiaNexus), licensed under the [MIT License](./LICENSE). The original copyright notice is preserved in [`LICENSE`](./LICENSE) and attribution is documented in [`NOTICE`](./NOTICE).

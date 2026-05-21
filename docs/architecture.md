# Architecture

ccm-feedback is a single-package, browser-only widget. One TypeScript entry, esbuild bundles to one JS file, that file is served as a static asset and self-installs from a `<script>` tag.

There is no server-side runtime. Cloud mode talks directly to Supabase from the browser.

## Build

```
src/*.ts
  └─ esbuild (esbuild.config.mjs)
      └─ dist/w.js          ← minified, IIFE, ~30 KB
      └─ public/w.js        ← copy for the demo / Netlify deploy
```

Single bundle, no chunks, no separate CSS file. Styles are inlined as JS template strings (`src/styles/`) and injected into the shadow root via `adoptedStyleSheets` (with a `<style>` fallback).

## Boot sequence

```
<script src=".../w.js" data-project="..." defer>
  └─ window.CcmFeedback = { init }
  └─ if document.currentScript exists:
       └─ read data-* attrs
       └─ DOMContentLoaded (or now if already past)
       └─ initCcmFeedback(cfg)
            ├─ guard: viewport ≥ 768px
            ├─ guard: not already mounted
            ├─ pick store: CloudStore (if URL+key, not localhost) | Store (default)
            ├─ create <ccm-feedback-widget> host
            ├─ attachShadow({ mode: "open" })
            ├─ inject styles into shadow root
            ├─ mount Fab, Popup (in shadow)
            ├─ mount MarkerManager (overlay outside shadow, hit-tests page DOM)
            ├─ wire EventBus subscriptions
            └─ if cloud: CloudStore.init() then re-render
```

`mode: "open"` is intentional — host pages and test harnesses can introspect. CSS isolation is provided by the shadow root itself, not the closed mode.

## Module map

```
src/
├─ index.ts              ← entry, boot, script-tag wiring, sanitizeUrl
├─ types.ts              ← AnnotationRecord, CcmFeedbackConfig, kinds, statuses
├─ constants.ts          ← MOBILE_BREAKPOINT, Z_INDEX_MAX
├─ author.ts             ← ensureAuthor(): reviewer name in localStorage
├─ events.ts             ← EventBus<WidgetEvents>
├─ i18n.ts               ← createT() — en, fr
├─ icons.ts              ← inline SVG strings
│
├─ store.ts              ← AnnotationStore interface + Store (localStorage)
├─ cloud-store.ts        ← CloudStore (Supabase PostgREST)
├─ realtime.ts           ← RealtimeClient (raw WebSocket → supabase_realtime)
│
├─ fab.ts                ← floating button + radial menu
├─ popup.ts              ← textarea popover (status + message)
├─ markers.ts            ← MarkerManager: render pins, click + drag-relocate
├─ pin-mode.ts           ← target-element capture (hover outline, click)
├─ status-dropdown.ts    ← createStatusDropdown — shared combobox for popover + drawer
├─ capture-modes.ts      ← coord pin + drag-rect area capture
│
├─ dom-utils.ts          ← misc DOM helpers
├─ export-utils.ts       ← exportAsJson (build + download a JSON file)
│
├─ dom/
│   ├─ anchor.ts         ← generateAnchor, rectToPercentages, findAnchorElement
│   ├─ hover-outline.ts  ← createHoverOutline — shared element-hover affordance
│   ├─ resolver.ts       ← resolveAnchor (4-level), resolveAnnotation
│   ├─ fingerprint.ts    ← tag-chain signature + scoring
│   ├─ fuzzy.ts          ← fuzzyIncludes, similarity
│   ├─ text-context.ts   ← adjacentText, neighborText
│   └─ xpath.ts          ← XPath generation
│
└─ styles/
    ├─ base.ts           ← buildStyles(colors) → CSS string
    ├─ theme.ts          ← buildThemeColors(accent, theme)
    └─ animations.ts     ← keyframes
```

## Layering

- **No framework.** Plain DOM. No React, no Vue, no virtual DOM.
- **No SDK.** Cloud mode uses raw `fetch` + `WebSocket` against Supabase's documented HTTP and Realtime protocols.
- **No build-time config injection.** The bundle is environment-agnostic. All config comes from `data-*` attrs at runtime.
- **One global side effect:** `window.CcmFeedback`. The host element is named `<ccm-feedback-widget>`; localStorage keys are namespaced `ccm-feedback:*`.

## Shared UI affordances

- **Hover outline.** `src/dom/hover-outline.ts` exports `createHoverOutline(colors)` — a factory that returns `{ apply, clear, destroy }`. The marker-relocate drag overlay (PRO-67) reuses the same helper `PinMode` (CCM-291) uses for its hover affordance: solid 2-px outline + floating tag-name badge near the target's bottom-right corner, with the same snapshot-and-restore semantics for the host page's pre-existing inline outline. One implementation, byte-identical visuals across both surfaces.
- **Status dropdown.** `src/status-dropdown.ts` exports `createStatusDropdown(opts)` — a combobox + listbox factory shared by the marker popover (today) and the navigator drawer (PRO-68). The module owns DOM construction, ARIA wiring, keyboard nav, and dropdown-scoped outside-click; callers own the store write, the `feedback:updated` emit, and any marker recolor.

## Store contract

Both stores implement `AnnotationStore`:

```ts
interface AnnotationStore {
  list(): AnnotationRecord[];
  listForPath(path: string): AnnotationRecord[];
  save(input: SaveInput): AnnotationRecord;
  delete(id: string): boolean;
  clear(): void;
  updateStatus?(id: string, status: FeedbackStatus): boolean;
  updateAnchor?(id: string, input: UpdateAnchorInput): boolean; // PRO-67 drag-relocate
  listReplies(parentId: string): AnnotationRecord[];
  addReply(input: ReplyInput): AnnotationRecord;
}
```

Both are **synchronous from the caller's perspective**. `CloudStore` keeps an in-memory cache and fires writes against the network in the background — see [cloud-mode.md](cloud-mode.md#cache-and-sync-writes).

## Event bus

`src/events.ts` defines a typed pub/sub for cross-component communication:

| Event             | Emitted by         | Listened to by                                  |
| ----------------- | ------------------ | ----------------------------------------------- |
| `target:click`    | `Fab`              | `index.ts` → enables `PinMode`                  |
| `pin:click`       | `Fab`              | `index.ts` → enables `CoordPinMode`             |
| `area:click`      | `Fab`              | `index.ts` → enables `AreaMode`                 |
| `toggle:click`    | `Fab`              | `MarkerManager` → show/hide pins                |
| `export:click`    | `Fab`              | `index.ts` → `exportAsJson`                     |
| `clear:click`     | `Fab`              | `index.ts` → `store.clear()`                    |
| `feedback:saved`  | `index.ts`         | (debug logging hook)                            |

## What's intentionally outside the scope

- **Auth / user accounts** — `authorName` is just a localStorage string. Cloud mode uses the anon key for everyone.
- **Multi-page workflows** — pins scope to one path. There's no cross-page navigation, no global comment list, no inbox.
- **Comment threading / replies** — flat list only.
- **Real-time cursors / presence** — out of scope. Realtime only syncs CRUD events on annotations.
- **Server-side rendering of the widget** — it's a browser-only enhancement.

## Performance notes

- Smart-scan candidate cap: 300 elements per resolution attempt.
- Marker positions recompute on `resize` and `scroll` via passive listeners (see `markers.ts`).
- Cloud read on init: one `GET` per page load. Realtime subscription stays open for the page lifetime.
- LocalStorage writes block the main thread per `JSON.stringify` — fine at typical comment counts (< 1000), pathological at 10k+.

## Versioning

- Repository version comes from root `package.json` (`0.1.0-mvp` at time of writing). Tags are `vX.Y.Z`.
- No npm publish — the widget ships as a hosted JS file. To get a specific version pinned, copy `dist/w.js` from a tagged release into your own CDN.
- Schema changes are versioned by migration filename (`0001_*.sql`, `0002_*.sql`, …).

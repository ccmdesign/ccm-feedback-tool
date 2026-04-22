<div align="center">

<h1>CCM Feedback — MVP</h1>

**One script tag. Pin comments. Export JSON.**

A dead-simple feedback widget for reviewing web pages. No backend, no accounts, no multiplayer. Reviewer pins comments on any element, exports a JSON file, hands it to a developer.

</div>

---

## Install

Drop a single script tag in your HTML:

```html
<script src="https://ccm-feedback-582.netlify.app/w.js" data-project="my-project" defer></script>
```

That's it. The FAB appears bottom-right on desktop (hidden below 768px).

### Options

Configure via `data-*` attributes on the script tag:

| Attribute        | Purpose                                    | Default       |
| ---------------- | ------------------------------------------ | ------------- |
| `data-project`   | **Required.** `localStorage` namespace.    | —             |
| `data-accent`    | Hex color (`#0066ff`, `#RGB`, `#RRGGBBAA`) | `#0066ff`     |
| `data-theme`     | `light`, `dark`, or `auto`                 | `light`       |
| `data-debug`     | Console-log lifecycle events               | off           |

Or init manually:

```ts
window.CcmFeedback.init({
  projectName: "my-project",
  accentColor: "#0066ff",
  theme: "auto",
});
```

## How it works

1. Click the FAB → radial menu (pin / toggle / export).
2. **Pin** → crosshair mode. Hover any element; it gets a blue outline. Click to drop a pin.
3. **Textarea popover** opens anchored to that element. `⌘/Ctrl + Enter` to submit.
4. Pins persist in `localStorage['ccm-feedback:<project>']` and re-render on page load.
5. Click a pin → popover with the comment body + delete button.
6. **Export** → downloads `ccm-feedback-<project>-<date>.json` with every annotation + DOM anchor.

## DOM anchoring

Each pin stores four resolution strategies so the anchor survives reasonable DOM changes:

- CSS selector via `@medv/finder`
- XPath
- Text snippet + prefix/suffix + neighbor text
- Structural fingerprint (tag chain)

At render time the resolver walks the fallbacks and scores candidates — an anchor can be re-resolved even after class renames, minor text edits, or small structural refactors.

## Data model

```ts
interface AnnotationRecord {
  id: string;
  projectName: string;
  message: string;
  url: string;
  viewport: string;       // e.g. "1280x800"
  userAgent: string;
  createdAt: string;      // ISO-8601
  // Anchor
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  elementId: string | undefined;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
  // Position as fractions of the anchor element's bounding box
  xPct: number; yPct: number; wPct: number; hPct: number;
}
```

## Develop

```bash
bun install
bun run dev            # esbuild watch → dist/w.js + public/w.js
bun run serve          # build + serve public/ on :5173
bun run check          # tsc --noEmit
bun run lint:fix       # biome
```

## Deploy

Build → drop `dist/w.js` into the static hosting of your choice. The existing Netlify project serves it at `https://ccm-feedback-582.netlify.app/w.js`.

## Attribution

Forked from [SitePing](https://github.com/NeosiaNexus/SitePing) by NeosiaNexus (MIT). See `LICENSE` and `NOTICE`.

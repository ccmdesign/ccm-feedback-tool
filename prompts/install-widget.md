# Prompt — install ccm-feedback widget on my site

> Paste everything below this line into your coding agent. The agent will edit your repo to add the widget, then verify.

---

I want to add the **ccm-feedback** widget to my site so reviewers can pin comments on any element of any page. The widget is open source (MIT) — homepage: https://github.com/ccmdesign/ccm-feedback-tool.

## What to do

1. **Identify the global layout file** for this codebase — the one that wraps every page. Common names by framework:
   - Next.js (Pages Router): `pages/_app.tsx` or `pages/_document.tsx`
   - Next.js (App Router): `app/layout.tsx`
   - Astro: `src/layouts/*.astro` (the most-used one)
   - Nuxt: `app.vue` or `layouts/default.vue`
   - SvelteKit: `src/app.html` or `src/routes/+layout.svelte`
   - Remix: `app/root.tsx`
   - Hugo / Jekyll / 11ty: the base template (e.g. `_includes/base.njk`, `layouts/_default/baseof.html`)
   - Plain static HTML: every `index.html` (or a shared partial if one exists)
   - Rails: `app/views/layouts/application.html.erb`
   - Django: `templates/base.html`

   If unsure, search for `</body>` or `<head>` to find the file that renders site chrome on every route.

2. **Add this single script tag right before `</body>`** in that file:

   ```html
   <script src="https://ccm-feedback-582.netlify.app/w.js" defer></script>
   ```

   No build step needed. The widget self-installs from the CDN-hosted bundle. It auto-namespaces feedback by hostname, so production and staging stay isolated automatically.

3. **Optional attributes** — only add these if they're relevant:
   - `data-project="my-explicit-name"` — override the auto-derived hostname namespace.
   - `data-accent="#hex"` — match the site's brand color.
   - `data-theme="auto"` — if the site has a dark mode and you want the widget to follow.
   - `data-debug="true"` — log lifecycle events to the console (remove for prod).

4. **Verify by running the dev server** and checking that:
   - A floating circular button appears bottom-right on desktop viewports (≥768px wide).
   - Clicking it opens a radial menu (target / pin / area / toggle / export / clear).
   - Clicking "target" then any DOM element opens a textarea popover.
   - Submitting the popover (`⌘/Ctrl + Enter`) places a marker that persists across page reloads.

5. **Report back**:
   - Which file you edited (path).
   - Any framework-specific quirks you ran into (e.g. Next.js `<Script strategy="afterInteractive">` wrapper).
   - Confirm the widget shows up on a desktop preview.

## Things to watch for

- **Mobile** (<768px): the widget intentionally does not render. The button only appears on desktop. This is by design — it's a desktop review tool. Don't try to make it appear on mobile.
- **CSP**: if the site has a Content Security Policy, you'll need `script-src https://ccm-feedback-582.netlify.app`. The widget itself uses inline `<style>` tags inside its Shadow DOM, so `style-src 'unsafe-inline'` is required if CSP is strict.
- **SSR**: the widget is browser-only. It boots from `document.currentScript`, so a `<Script>` wrapper that injects it server-side may break the auto-detect. If that happens, switch to manual init:
  ```html
  <script src="https://ccm-feedback-582.netlify.app/w.js" defer></script>
  <script>
    window.addEventListener("load", () => {
      window.CcmFeedback.init({ projectName: location.hostname });
    });
  </script>
  ```
- **Don't break the existing build.** If lint/typecheck/build was passing before, it should still pass after.

## What this prompt does NOT do

- Set up cloud sync (Supabase). Use [self-host-supabase.md](self-host-supabase.md) for that.
- Customize widget UI. The widget is a fixed surface — accent color and theme are the only knobs.
- Bundle the widget into your build. It's CDN-hosted by design. If you need to vendor it (air-gapped envs), see https://github.com/ccmdesign/ccm-feedback-tool#deploy-your-own.

When you're done, tell me which file changed and confirm the FAB is visible.

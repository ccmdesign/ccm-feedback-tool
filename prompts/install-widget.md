# Prompt — install ccm-feedback (orchestrator)

> Paste everything below this line into your coding agent. The agent will install the widget, then ask whether you also want cloud sync and/or production RLS hardening, and execute those flows automatically. **You never need to paste a second prompt.**

---

I want to add the **ccm-feedback** widget to my site so reviewers can pin comments on any element of any page. ccm-feedback is open source (MIT) — homepage: https://github.com/ccmdesign/ccm-feedback-tool.

You will run this end-to-end. Don't make me paste another prompt at any point — if a follow-up step is needed, fetch the corresponding sub-prompt from GitHub yourself and execute it.

## Step 1 — Install the widget (always do this)

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

   No build step. The widget self-installs from the CDN. It auto-namespaces feedback by hostname so production and staging stay isolated automatically.

3. **Optional attributes** — only add if relevant:
   - `data-project="explicit-name"` — override the auto-derived hostname namespace.
   - `data-accent="#hex"` — match the site's brand color.
   - `data-theme="auto"` — follow the site's dark mode.
   - `data-debug="true"` — log lifecycle events to the console (remove for prod).

4. **Verify by running the dev server** and confirming:
   - A floating circular button appears bottom-right on desktop viewports (≥768px wide).
   - Clicking it opens a radial menu (target / pin / area / toggle / export / clear).
   - Clicking "target" then any DOM element opens a textarea popover.
   - Submitting (`⌘/Ctrl + Enter`) places a marker that persists across page reloads.

## Step 2 — Ask me about cloud sync and hardening

After install verifies green, ask me **one question with two parts**:

> "The widget is installed in localStorage mode (one reviewer per browser, no infra). Want me to also set up:
>
> (a) **Cloud sync** via Supabase, so multiple reviewers see each other's pins across devices?
>
> (b) If yes to (a) — **production RLS hardening**, so the public anon key can't be used to vandalize the table?"

If I say no to (a), stop here. Report what you did in Step 1.

## Step 3 — If I said yes to (a), fetch and execute the cloud-sync prompt

Don't ask me to paste it. Fetch directly:

```
https://raw.githubusercontent.com/ccmdesign/ccm-feedback-tool/main/prompts/self-host-supabase.md
```

Read it cold. It's self-contained. Execute it end-to-end against this same project. Skip its "Step 1" if my widget is already installed (it is — you just did it).

When that prompt completes, return here.

## Step 4 — If I said yes to (b), fetch and execute the hardening prompt

```
https://raw.githubusercontent.com/ccmdesign/ccm-feedback-tool/main/prompts/harden-rls.md
```

Same protocol — fetch, execute, return. The hardening prompt assumes cloud mode is already running, so only do this after Step 3 succeeded.

## Step 5 — Set up the review → edit → review loop

This is what makes ccm-feedback an *agent* tool, not just a comment widget. Install the apply skill so that, after review, the feedback comes back to a coding agent as a URL (or JSON file) and the loop closes:

1. **Install the `apply-ccm-feedback` skill.** Fetch it and save it where this agent loads skills (e.g. `.claude/skills/apply-ccm-feedback/SKILL.md`, or the equivalent for the agent in use):

   ```
   https://raw.githubusercontent.com/ccmdesign/ccm-feedback-tool/main/skills/apply-ccm-feedback/SKILL.md
   ```

2. **Explain the loop to me** in one short paragraph:
   - A reviewer pins comments. In **cloud mode** they click the FAB's **"Copy feedback URL"** item to get `<site>/feedback?project=<name>`; in **local mode** they use **Export JSON** (the Copy-URL item is disabled — there's no server-side data to serve).
   - They hand that URL (or the JSON file) to a coding agent. The `apply-ccm-feedback` skill auto-triggers, applies each edit, and sets every handled comment's status to **`review`**.
   - **The agent sets `review`, never `done`.** A human opens the widget, verifies each edit, and flips `review` → `done` themselves. That human gate is the whole point of the `review` status — the agent does not auto-complete its own work.

3. If cloud mode is active, note that the `/feedback` share endpoint is a Netlify function requiring `SUPABASE_URL` + `SUPABASE_ANON_KEY` env vars (anon key only — never the service-role key) set in the host's dashboard, and that the copied URL uses the reviewed site's own origin (so that site must deploy `netlify/functions/feedback`; the CCM-hosted demo already does).

## Step 6 — Final report

Tell me:

- Which file(s) you edited and what's now in them.
- Whether (a) cloud sync is active, with the project URL ref (last 4 chars are enough — don't paste full credentials back to me).
- Whether (b) RLS is hardened, and which `project_name` allowlist values you used.
- Any failed verifications and where they failed.

## Things to watch for across all steps

- **Mobile (<768px):** widget intentionally does not render. Don't try to make it appear there.
- **Service-role key:** if the cloud-sync sub-prompt asks me for a Supabase key, only the **anon / publishable** key is acceptable. The service-role key bypasses RLS and must never appear in the codebase. If I paste the wrong one, refuse and tell me to find the anon key.
- **Don't break the existing build.** If `lint`, `typecheck`, or `build` were passing before, they should still pass after.
- **CSP:** if the site has a Content Security Policy, you'll need `script-src https://ccm-feedback-582.netlify.app`. The widget uses inline `<style>` inside its Shadow DOM, so `style-src 'unsafe-inline'` is required if CSP is strict.
- **SSR:** the widget boots from `document.currentScript`. If a `<Script>` wrapper that injects it server-side breaks auto-detect, switch to manual init:

  ```html
  <script src="https://ccm-feedback-582.netlify.app/w.js" defer></script>
  <script>
    window.addEventListener("load", () => {
      window.CcmFeedback.init({ projectName: location.hostname });
    });
  </script>
  ```

Begin with Step 1.

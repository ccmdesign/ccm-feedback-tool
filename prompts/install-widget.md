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

2. **Add this script tag right before `</body>`** in that file — **always include the three attributes below.** This is not optional: omit `data-supabase-url` / `data-supabase-key` and the widget silently falls back to localStorage-only mode — comments never leave the reviewer's own browser, nothing syncs, and there is no error to tell you that happened.

   ```html
   <script
     src="https://ccm-feedback-582.netlify.app/w.js"
     data-project="<unique-slug-for-this-site>"
     data-supabase-url="https://qnkvkumtssihbjmocbtv.supabase.co"
     data-supabase-key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFua3ZrdW10c3NpaGJqbW9jYnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Nzc0OTcsImV4cCI6MjA5MjI1MzQ5N30._lmyjRjITwD9m-ov0QTzzRNmqpwtbYoXM_HLF2rzfSk"
     defer
   ></script>
   ```

   No build step. The widget self-installs from the CDN. `data-supabase-url` + `data-supabase-key` point at CCM's shared multi-tenant Supabase project — cloud sync is on from the first paste, no provisioning needed. `data-project` is what isolates this site's annotations from every other site on that same shared backend, so **set it to something unique** (hostname or repo slug is fine) — never leave it as the literal placeholder above, and never copy another project's value.

   If I explicitly ask for a dedicated Supabase project instead of the shared one (data isolation, my own RLS policy, etc.), skip this shared-key snippet and go straight to Step 3 to fetch and run `self-host-supabase.md`.

3. **Other optional attributes** — only add if relevant:
   - `data-accent="#hex"` — match the site's brand color.
   - `data-theme="auto"` — follow the site's dark mode.
   - `data-debug="true"` — log lifecycle events to the console (remove for prod).

4. **Verify by running the dev server** and confirming:
   - A floating circular button appears bottom-right on desktop viewports (≥768px wide).
   - Clicking it opens a radial menu (target / pin / area / toggle / export / clear).
   - Clicking "target" then any DOM element opens a textarea popover.
   - Submitting (`⌘/Ctrl + Enter`) places a marker that persists across page reloads.

## Step 2 — Ask me about hardening (and about opting out of the shared backend)

Cloud sync is already live after Step 1 — there is no "want cloud sync?" question anymore, the widget is never left in localStorage-only mode by default. After install verifies green, ask me **one question with two parts**:

> "The widget is installed with cloud sync on, using CCM's shared Supabase project (isolated by `data-project=<slug>`). Want me to also set up:
>
> (a) **A dedicated Supabase project** of your own instead of the shared one — full data isolation, your own RLS?
>
> (b) **Production RLS hardening** on whichever backend is in play (shared or dedicated), so the anon key can't be used to vandalize rows outside this project's namespace?"

If I say no to both, stop here. Report what you did in Step 1.

## Step 3 — If I said yes to (a), fetch and execute the cloud-sync prompt

Don't ask me to paste it. Fetch directly:

```
https://raw.githubusercontent.com/ccmdesign/ccm-feedback-tool/main/prompts/self-host-supabase.md
```

Read it cold. It's self-contained. Execute it end-to-end against this same project — it provisions a fresh Supabase project and replaces the shared `data-supabase-url` / `data-supabase-key` from Step 1 with the dedicated ones. Skip its "Step 1" framing about installing the widget (it's already installed with cloud sync on — you're only swapping which backend it points at).

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
- **SSR:** the widget boots from `document.currentScript`. If a `<Script>` wrapper that injects it server-side breaks auto-detect, switch to manual init — **still pass the Supabase params, or you're back to the silent localStorage fallback:**

  ```html
  <script src="https://ccm-feedback-582.netlify.app/w.js" defer></script>
  <script>
    window.addEventListener("load", () => {
      window.CcmFeedback.init({
        projectName: "<unique-slug-for-this-site>",
        supabaseUrl: "https://qnkvkumtssihbjmocbtv.supabase.co",
        supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFua3ZrdW10c3NpaGJqbW9jYnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Nzc0OTcsImV4cCI6MjA5MjI1MzQ5N30._lmyjRjITwD9m-ov0QTzzRNmqpwtbYoXM_HLF2rzfSk",
      });
    });
  </script>
  ```

Begin with Step 1.

# Prompt — self-host the ccm-feedback Supabase backend

> Paste everything below this line into your coding agent. The agent will provision (or wire up) a Supabase project, apply the migrations, update the script tag, and verify cloud sync end-to-end.

---

I want to enable **cloud mode** for the ccm-feedback widget so multiple reviewers can see each other's pins and comments persist across browsers. ccm-feedback is open source (MIT) — homepage: https://github.com/ccmdesign/ccm-feedback-tool.

The cloud backend is a single Supabase Postgres table. The widget speaks raw PostgREST + Realtime — no SDK dependency, no server I have to run.

## What to do

### 1. Confirm or provision a Supabase project

Ask me which of these applies, then act:

- **A. I already have a Supabase project.** Get from me: project URL (`https://YOURREF.supabase.co`) and the **anon / publishable** key (Project Settings → API → `anon` `public`). **Never ask for the service-role key — it must not appear anywhere in this codebase.**

- **B. I need to create one.** Open https://supabase.com/dashboard in my browser. Walk me through: sign in → New project → name it (suggest the same name as my site) → pick a region near my users → create. Wait for provisioning. Then ask me to paste the project URL + anon key.

- **C. I have the Supabase CLI installed and a local instance.** Use `supabase status` to discover the local URL + anon key. Useful for dev only — production needs a hosted project.

### 2. Apply the migrations

Three SQL files in `supabase/migrations/` need to run in order. Use the Supabase CLI if linked, otherwise paste-into-SQL-editor flow.

**CLI path (preferred if `supabase` is on PATH and the project is linked):**

```bash
supabase db push
```

**Manual path:**

For each of these files, in order, open the project's SQL editor in the Supabase dashboard, paste the file contents, and click **Run**:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_status_pin_area.sql
supabase/migrations/0003_realtime.sql
```

After all three run, verify that `public.ccm_widget_annotations` exists with these expected columns: `id`, `project_name`, `message`, `author_name`, `url`, `path`, `viewport`, `user_agent`, `css_selector`, `xpath`, `text_snippet`, `element_tag`, `element_id`, `text_prefix`, `text_suffix`, `fingerprint`, `neighbor_text`, `x_pct`, `y_pct`, `w_pct`, `h_pct`, `created_at`, `status`, `kind`, `pin_x`, `pin_y`, `area_x`, `area_y`, `area_w`, `area_h`, `captured_elements`.

### 3. Wire the widget script tag

If the widget isn't installed yet, follow [install-widget.md](install-widget.md) first. Then update the existing script tag with the cloud attributes:

```html
<script
  src="https://ccm-feedback-582.netlify.app/w.js"
  data-project="my-site"
  data-supabase-url="https://YOURREF.supabase.co"
  data-supabase-key="YOUR_ANON_KEY"
  defer
></script>
```

Notes:

- `data-supabase-key` MUST be the **anon** key, not the service-role key. The anon key is safe in the browser; the service-role key is not.
- If you already had `data-project="..."` set, keep that value. The cloud filter uses `project_name` to scope rows per site.
- **Do not commit the URL or key to a file the public can read** unless that's intentional. For most setups this is fine (it's already in HTML the browser sees), but if the repo is public and you'd rather not pin the project URL in source, read the values from environment variables at build time and inject them.

### 4. Verify end-to-end

The widget auto-disables cloud mode on `localhost`, `127.0.0.1`, and `*.local` so dev sessions never write to production. To verify cloud mode you must hit a deployed URL (preview deploy, staging, etc.).

Steps:

1. Deploy the change (Netlify preview, Vercel preview, etc. — whichever the project uses).
2. Open the preview URL. Drop a pin with a recognizable comment.
3. In a different browser (or incognito), open the same URL. The pin should appear within ~1 second.
4. Open the Supabase dashboard → Table Editor → `ccm_widget_annotations`. Confirm a row exists with your test message.
5. With `data-debug="true"` on the script tag, the browser console should log `[ccm-feedback] Cloud mode enabled { url: ... }`.

If any of those fail, check:

- 401 / 403 in the network panel → wrong anon key, or RLS is rejecting. Run `supabase/scripts/check-rls.sql` to diagnose.
- Pins save but don't sync to other browsers → migration `0003_realtime.sql` didn't run, or `replica identity full` isn't set.
- Widget shows up but no console "Cloud mode enabled" log → cloud mode is disabled (likely localhost detection, or one of the data-supabase-* attrs is missing/empty).

### 5. Production hardening — flag, don't apply

Migration `0001_init.sql` ships with **permissive RLS** (anon can read/insert/update/delete any row). That's fine for staging or internal team review. For a public production site, run the [harden-rls.md](harden-rls.md) prompt next.

**Don't apply hardening yet** unless I explicitly say to. End-to-end test cloud mode with permissive policies first; harden as a separate step.

### 6. Report back

- Project URL (last 4 chars of the ref is fine, full URL also OK).
- Which migration path you used (CLI / SQL editor).
- Which files you edited and what the script tag looks like now.
- Confirmation that cross-browser sync works.
- Whether RLS hardening is recommended next (yes if site is public-facing).

## Things to watch for

- **Service-role key.** If I ever paste the service-role key thinking it's the anon key, refuse to use it and tell me to find the anon key instead. Service-role bypasses RLS — putting it in HTML is a critical mistake.
- **Multi-tenant single project.** If my Supabase project hosts annotations for multiple sites, every site's anon key holder can read every other site's annotations under the permissive default RLS. This is acceptable for low-stakes review; if it's not acceptable, run [harden-rls.md](harden-rls.md) with a strict per-project allowlist.
- **Costs.** Free Supabase tier handles a small review workflow comfortably. The widget makes one GET on init plus an open WebSocket; writes are one POST/PATCH/DELETE per annotation. Mention to me if my expected reviewer count would exceed the free tier.

When you're done, tell me whether to proceed to RLS hardening.

# Self-hosting ccm-feedback

> **Hand this to an agent instead.** Paste [`prompts/install-widget.md`](../prompts/install-widget.md) (the orchestrator) into Claude Code / Cursor / Copilot — it installs the widget, asks if you want cloud sync, and fetches the cloud-setup sub-prompt from GitHub itself. You only paste once. This file is the longform reference for when you want to do it yourself.

ccm-feedback ships as a single static JS file (`dist/w.js`) and an optional Postgres schema (`supabase/migrations/*.sql`). You can host either or both yourself.

There are three things you might want to host:

1. **The widget script** — a static asset, drop it on any CDN.
2. **The backend** — a Supabase project (or any Postgres + PostgREST) for cloud mode.
3. **The demo / landing page** — `public/` is a static site.

You can mix and match — e.g. use the public Netlify-hosted `w.js` and your own Supabase, or host the script yourself and run in localStorage-only mode with no backend at all.

---

## 1. Host the widget script

```bash
git clone https://github.com/ccmdesign/ccm-feedback-tool
cd ccm-feedback-tool
bun install
bun run build
```

`dist/w.js` is what you serve. It's a single, minified, self-contained JS file (no separate CSS, no chunks). Drop it on:

- Netlify, Cloudflare Pages, Vercel — point at `public/` (build copies `w.js` there) or upload `dist/w.js` directly
- S3 + CloudFront, R2, GCS — upload `dist/w.js` and set `Content-Type: application/javascript; charset=utf-8`
- Your own CDN / nginx — serve as a static file with `Cache-Control: public, max-age=3600` (or longer with a hashed filename)

Reference it from your reviewed page:

```html
<script
  src="https://your-cdn.example.com/w.js"
  data-project="my-site"
  defer
></script>
```

That's a complete install — no backend needed. Annotations live in the reviewer's `localStorage`.

---

## 2. Host the backend (Supabase cloud mode)

Cloud mode lets multiple reviewers see each other's annotations and persists them across browsers.

### Step 1 — create a Supabase project

Sign in at [supabase.com](https://supabase.com), create a project, wait for it to provision. Note:

- **Project URL** — `https://YOURREF.supabase.co`
- **Anon (publishable) key** — Project Settings → API → `anon` `public`. Browser-safe.
- **Service-role key** — same page, `service_role`. **Never put this in the browser.** Used only by maintainer scripts.

### Step 2 — run the migrations

In order, against your project's SQL editor (or via `supabase db push` if you have the Supabase CLI linked):

```
supabase/migrations/0001_init.sql           -- creates ccm_widget_annotations + RLS
supabase/migrations/0002_status_pin_area.sql -- adds status, kind, pin/area, captured_elements
supabase/migrations/0003_realtime.sql       -- enables realtime publication
```

After these run you should see a single table `public.ccm_widget_annotations` with permissive anon RLS policies and realtime enabled.

### Step 3 — wire it into the script tag

```html
<script
  src="https://your-cdn.example.com/w.js"
  data-project="my-site"
  data-supabase-url="https://YOURREF.supabase.co"
  data-supabase-key="YOUR_ANON_KEY"
  defer
></script>
```

That's it. Open the page, drop a pin, refresh — the pin is still there. Open the page in a different browser, the pin shows up there too (within a second, via realtime).

> **Localhost note:** the widget auto-disables cloud mode when running on `localhost`, `127.0.0.1`, or `*.local` hostnames so dev work never writes to your prod DB. Test cloud mode against a deployed preview URL.

---

## 3. RLS policies — tighten before public exposure

`0001_init.sql` ships with **permissive** RLS (anon can read, insert, update, delete any row). That's fine when:

- The widget is on an internal review staging URL only your team accesses
- Each project has its own Supabase project (so blast radius = one project)

It's **not** fine when:

- The widget is embedded on a public production site that your customers visit
- A single Supabase project hosts annotations for many client sites

For public exposure you'll want at minimum:

```sql
-- Drop the permissive update/delete and require a signed JWT:
drop policy if exists "anon update" on public.ccm_widget_annotations;
drop policy if exists "anon delete" on public.ccm_widget_annotations;

-- Or scope writes to a project-name allowlist:
drop policy if exists "anon insert" on public.ccm_widget_annotations;
create policy "anon insert"
  on public.ccm_widget_annotations
  for insert
  to anon
  with check (project_name = any(array['my-site', 'client-foo']));
```

A more complete pattern (rate limiting, signed write tokens, per-author edit/delete) is out of scope for this README — if you implement one, a PR adding it as `0004_*.sql` plus a docs writeup is welcome.

### Quick path: copy the strict template

For a common production posture (read + insert allowed for an explicit project allowlist; update + delete forbidden for anon), copy and edit the template:

```bash
cp supabase/migrations-optional/0004_strict_rls.sql.example \
   supabase/migrations-optional/0004_strict_rls.sql
# edit the project_name allowlist inside the file, then apply:
supabase db push   # or paste into the SQL editor
```

### Verify your RLS posture

Run `supabase/scripts/check-rls.sql` in the SQL editor. It runs CRUD probes under the anon role and prints which operations succeed. Use this to confirm tightening worked before pointing the widget at the project.

| Probe outcome                              | What it means                                    |
| ------------------------------------------ | ------------------------------------------------ |
| All 4 ops succeed for anon                 | Permissive baseline. OK for staging, not prod.   |
| Read + insert succeed, update + delete fail| Strict template applied. Good for review-only.   |
| All 4 ops blocked                          | Allowlist doesn't include your `project_name`.   |

---

## 4. Host the demo page (optional)

`public/` is a static site (`index.html` + the built `w.js`). The repo's existing Netlify config (`netlify.toml`) builds and serves it. To host your own:

- Netlify / Cloudflare Pages: connect the repo, set build command `bun run build`, publish dir `public`
- Any static host: copy `public/` after running `bun run build`

The demo page intentionally embeds the widget itself, so visitors can try it on the page they're reading.

---

## 5. Backups and data export

Cloud-mode annotations live in your Supabase project. To back up:

- Supabase dashboard → Database → Backups (paid plans)
- `pg_dump` against the connection string from Project Settings → Database
- Use the widget's **Export** button to download a JSON snapshot per project

JSON exports are also the migration path between projects: export from one, write a small script that POSTs each row to another instance's `/rest/v1/ccm_widget_annotations`.

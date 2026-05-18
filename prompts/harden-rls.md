# Prompt — harden RLS on ccm-feedback Supabase backend

> Paste everything below this line into your coding agent. The agent will diagnose current RLS posture, generate a strict migration tailored to your project, apply it, and verify.

---

I'm running ccm-feedback in **cloud mode** on a Supabase Postgres backend, and I'm about to put it (or already have put it) on a public-facing site. I need to tighten the Row Level Security policies before random visitors can vandalize the table.

ccm-feedback is open source (MIT) — homepage: https://github.com/ccmdesign/ccm-feedback-tool.

## Background you need

The widget runs with the **anon (publishable) key** in the HTML. That key is visible in DevTools to anyone who loads the page. Without RLS, anon = full read/write/delete on `public.ccm_widget_annotations`. Without project-name scoping, one project's anon key can write rows under any other project's name.

The baseline migration `supabase/migrations/0001_init.sql` enables RLS but ships **permissive** policies (anon can do all four CRUD ops on any row). That's intentional — the widget works out of the box. Hardening is the operator's call.

This prompt does the hardening.

## What to do

### 1. Diagnose current state

Run `supabase/scripts/check-rls.sql` against the project's SQL editor (or via `supabase db query` if the CLI is linked). Read the output and report to me:

- Is RLS enabled? (Should say `rls_enabled = true`.)
- Which policies are currently active? (`policyname`, `cmd`, `roles`, `using_clause`, `with_check_clause`.)
- Under the anon role, which CRUD ops succeed?
  - All 4 succeed → permissive baseline. Proceed with hardening.
  - Some blocked → already partially hardened. Tell me what's blocked so I can decide whether further tightening is needed.
  - All 4 blocked → table is unreachable from the widget. Skip hardening; we have a different problem.

### 2. Collect the project_name allowlist

Ask me: **which `project_name` values should anon be allowed to write?**

- If there's only one site, that's one value (e.g. `"my-site-prod"`).
- If multiple sites share this Supabase project, list all of them.
- If staging and production should be separated by name, include both (e.g. `"my-site-prod"`, `"my-site-staging"`).

If I don't know what value the widget is currently sending, find it: search for `data-project="..."` in the codebase, or for the `projectName` value passed to `window.CcmFeedback.init({...})`. The widget's auto-derived value is `location.hostname` with non-alphanumerics replaced by hyphens (plus `-port` if the URL has a non-default port).

### 3. Generate the strict migration

Copy `supabase/migrations-optional/0005_strict_rls.sql.example` to `supabase/migrations-optional/0005_strict_rls.sql` (drop the `.example` suffix), then edit:

- Replace **both** occurrences of `array['my-site-prod', 'client-foo-staging']` with the actual allowlist I gave you in step 2.

Verify the file:

- Drops the four permissive policies from `0001`.
- Re-creates `anon read` and `anon insert` with a `project_name = any(...)` filter.
- Does NOT re-create `anon update` or `anon delete`. (Anon cannot mutate or delete in this posture.)
- The insert policy includes the length checks on `message` and `project_name`.

### 4. Apply the migration

Same path as the install prompt:

- **CLI:** `supabase db push`
- **Manual:** paste the file contents into the SQL editor and click **Run**.

If `supabase db push` complains about migration ordering or numbering (because we're putting the file in `migrations-optional/` rather than `migrations/`), the cleanest fix is to copy it once into `migrations/` for the push, then move it back to `migrations-optional/` if you want to keep that hint visible. Or paste manually — it's one SQL file.

### 5. Verify

Re-run `supabase/scripts/check-rls.sql`. Expected output now:

- `anon INSERT succeeded` for a project name **in** the allowlist.
- `anon INSERT blocked by RLS` (or affected zero rows) for a project name **not** in the allowlist. To test this, temporarily edit the probe in the script to use `'this-name-is-not-allowed'`, run, observe block, restore.
- `anon UPDATE affected 0 row(s)` — anon update is now forbidden.
- `anon DELETE affected 0 row(s)` — anon delete is now forbidden.

Also: open the deployed site, drop a pin (should still work), refresh (should still appear), then try to delete it via the widget UI — the delete should appear to work locally (the widget's in-memory cache evicts) but the row stays in Postgres. That's a known consequence of this hardening pattern. If I want delete to actually delete, I need to either:
- Keep `anon delete` (and accept that anyone can delete anything via the anon key), or
- Add an `author_token` column and gate deletes on a match (a weaker UX guard, since the token is in localStorage and visible).

Tell me which I want and we can iterate.

### 6. Run the end-to-end smoke test

1. Drop a new pin on a deployed URL with a project_name in the allowlist. Should succeed.
2. Try to drop a pin with a project_name NOT in the allowlist (e.g. by manually setting `data-project="adversary"` in DevTools). The insert should fail with a 403 in the network panel.
3. Reload the page. The legit pin should still be there (read still works for allowlisted projects).

### 7. Report back

- Diagnostic output before hardening.
- The allowlist you used.
- Diagnostic output after hardening.
- Any unexpected behavior in the smoke test.
- Whether to revisit the delete UX (keep anon delete vs. token gate vs. server-side endpoint).

## Things to watch for

- **Don't break the demo / dev environments.** If staging uses a different `project_name` than production, both must be in the allowlist or staging will start 403'ing.
- **Don't commit the service-role key.** If you ever need elevated privileges (e.g. backfilling existing rows), use the Supabase dashboard's SQL editor under the dashboard's auth context — never paste the service-role key into the codebase.
- **Migration files are idempotent-by-design** (`drop policy if exists ...`). Running this migration twice should not error.

When you're done, confirm that the public anon key now writes only to allowlisted projects and cannot mutate or delete.

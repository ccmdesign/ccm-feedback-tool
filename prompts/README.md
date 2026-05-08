# Agent prompts

**One entrypoint. The agent fetches the rest.**

[`install-widget.md`](install-widget.md) is the orchestrator — paste it into Claude Code, Cursor, or any coding agent and it runs the entire flow:

1. Install the widget in your global layout (any common framework).
2. Ask whether you also want cloud sync (Supabase) and/or production RLS hardening.
3. If yes, **fetch the relevant sub-prompts from GitHub itself** and execute them. You don't paste anything else.
4. Report what changed.

This file is the routing index. Users never copy from this README — they copy [`install-widget.md`](install-widget.md) (or the prompt block on the homepage at https://ccm-feedback-582.netlify.app, which is the same content).

## Sub-prompts (the agent fetches these — you don't)

| File | Fetched when… | What the agent does |
|------|---------------|---------------------|
| [self-host-supabase.md](self-host-supabase.md) | Operator says yes to cloud sync | Provisions Supabase project (or uses existing), runs migrations 0001+0002+0003, wires `data-supabase-*` attrs, validates cross-browser sync end-to-end. Refuses service-role key. |
| [harden-rls.md](harden-rls.md) | Operator says yes to hardening | Runs `supabase/scripts/check-rls.sql` diagnostic, collects `project_name` allowlist, generates `0004_strict_rls.sql`, applies it, re-verifies. |

Raw GitHub URLs the orchestrator uses:

- `https://raw.githubusercontent.com/ccmdesign/ccm-feedback-tool/main/prompts/self-host-supabase.md`
- `https://raw.githubusercontent.com/ccmdesign/ccm-feedback-tool/main/prompts/harden-rls.md`

## Plain-script alternative

If you'd rather not involve an agent at all and you have `psql` on your PATH:

```bash
scripts/apply-migrations.sh "postgresql://postgres:<password>@db.YOURREF.supabase.co:5432/postgres"
```

That applies all `supabase/migrations/*.sql` to a Supabase project. RLS hardening is still your call after — see `supabase/migrations-optional/0004_strict_rls.sql.example`.

## Why prompts as files

ccm-feedback's design posture: **anything a human would copy-paste from the README is also shippable as a prompt to an agent.** Agents can read SQL, run `supabase` CLI, edit HTML files, `WebFetch` follow-up prompts, and validate end-to-end. Don't make the human do the rote part — and don't make them paste five prompts in a row.

If you find yourself documenting a series of manual steps, that's a candidate for either folding into the orchestrator or shipping as a sub-prompt the orchestrator can fetch. PRs welcome.

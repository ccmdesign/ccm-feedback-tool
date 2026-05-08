# Agent prompts

Self-contained prompts you paste into a coding agent (Claude Code, Cursor, Copilot, etc.) to do real work for you. The agent reads the prompt cold — no extra context required.

Pick one based on what you're trying to accomplish:

| Prompt                                        | Use when…                                                     | Agent does                                                                 |
| --------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [install-widget.md](install-widget.md)        | You want the widget on your site, no backend.                 | Adds the script tag to your global layout. localStorage mode.              |
| [self-host-supabase.md](self-host-supabase.md)| You want multi-reviewer cloud sync on your own infra.         | Provisions Supabase, runs migrations, wires the script tag, verifies.      |
| [harden-rls.md](harden-rls.md)                | Your widget is running cloud mode and you're going to prod.   | Runs RLS diagnostic, generates a strict policy migration, applies it.      |

## Why prompts as files

ccm-feedback's design posture: **anything a human would copy-paste from the README is also shippable as a prompt to an agent.** Agents can read SQL, run `supabase` CLI, edit HTML files, validate end-to-end. Don't make the human do the rote part.

If you find yourself documenting a series of manual steps, that's a candidate for a new prompt in this directory. PRs welcome.

## Plain-script alternative

If you'd rather run a bash script than hand work to an agent, see [scripts/](../scripts/). Currently:

- [scripts/apply-migrations.sh](../scripts/apply-migrations.sh) — apply all `supabase/migrations/` files to a Supabase project URL.

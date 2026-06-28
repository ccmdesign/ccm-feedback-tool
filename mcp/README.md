# ccm-feedback-mcp

A thin [Model Context Protocol](https://modelcontextprotocol.io) **stdio** server
that lets AI agents read, reply to, edit, and close
[ccm-feedback](../README.md) comments live — no copy-paste round-trip.

It wraps the **existing** Supabase PostgREST API over the
`ccm_widget_annotations` table. There is no new backend: the widget already does
POST/PATCH/DELETE against the same endpoint (see `src/cloud-store.ts`), the anon
RLS policy already grants full CRUD, and Supabase Realtime already broadcasts
writes — so a reply or status change an agent makes through this server shows up
in a reviewer's open widget without a refresh.

The server speaks raw PostgREST over `fetch` with the anon-key header pair
(`apikey` + `Authorization: Bearer <anon>`). It does **not** depend on
`@supabase/supabase-js`.

> **Cloud-mode projects only.** See [Caveats](#caveats).

## Install

```bash
cd mcp
npm install
npm run build      # compiles src/ → dist/
```

This installs the server's own dependencies and is independent of the widget's
root `package.json` / lockfile.

## Configuration

The server reads three values from the environment, each overridable by a
`--key value` CLI argument:

| Env var | CLI flag | Required | Meaning |
| --- | --- | --- | --- |
| `SUPABASE_URL` | `--supabase-url` | yes | Your Supabase project URL, e.g. `https://abc.supabase.co` |
| `SUPABASE_ANON_KEY` | `--supabase-key` | yes | The **anon / publishable** key — never the service-role key |
| `CCM_FEEDBACK_PROJECT` | `--project` | no | Default project name when a tool call omits `project` |

If `SUPABASE_URL` or the anon key is missing, the server prints a message to
stderr and exits non-zero.

## Wiring it into an agent

Most MCP clients take a command + args + env block. Example (Claude Desktop /
generic MCP client config):

```json
{
  "mcpServers": {
    "ccm-feedback": {
      "command": "node",
      "args": ["/absolute/path/to/ccm-feedback/mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://YOUR-PROJECT.supabase.co",
        "SUPABASE_ANON_KEY": "YOUR-ANON-KEY",
        "CCM_FEEDBACK_PROJECT": "your-project-name"
      }
    }
  }
}
```

After `npm install -g` (or `npm link`) the `bin` entry also works:
`ccm-feedback-mcp --supabase-url … --supabase-key … --project …`.

## Tools

| Tool | Arguments | What it does |
| --- | --- | --- |
| `list_comments` | `project?` | All comments and replies for the project, newest first. |
| `get_pending` | `project?` | Top-level comments still awaiting action (`status=todo`, no parent) — the agent's triage queue. |
| `update_comment` | `id`, `message?`, `status?` | Edit a comment. At least one of `message`/`status` is required. Valid statuses: `todo`, `review`, `done`, `question`. |
| `reply` | `id`, `message` | Post a reply to a comment. The reply inherits the parent's `project`, `url`, and `path`. |
| `close` | `id` | Mark a comment handled by setting its status to `review`. |

`project` defaults to `CCM_FEEDBACK_PROJECT` when omitted.

### Why `close` sets `review`, not `done`

`review` means "handled by an agent, pending human verification." A human
verifies the change in the widget and flips `review` → `done`. **`done` is a
human-only transition** — agents must never set it. (`update_comment` will accept
a `done` value because the field is generic, but the dedicated `close` tool
deliberately sets `review`; mirror that posture in agent prompts.)

### Live updates

Because Supabase Realtime already broadcasts table writes to open widgets, a
`reply` or `close` performed through this server appears in a reviewer's browser
immediately, with no extra client code.

## Self-check

A runnable, assert-based self-check exercises the row-mapping and
payload/query-building logic with a **mocked** `fetch` — no live Supabase
required:

```bash
npm test
```

## Caveats

These are known limitations, documented rather than solved here.

1. **Cloud-mode only.** This server talks to a Supabase project over PostgREST.
   ccm-feedback projects running in the default **localStorage** mode have no
   server an MCP can reach, so they are out of scope. A local-HTTP bridge that
   exposes a localStorage project to an MCP is a possible separate follow-up.

2. **The anon key lives in the agent's config, and RLS is permissive.** The anon
   policy on `ccm_widget_annotations` grants full CRUD across **all**
   `project_name` values, so whoever holds the anon key can read and edit any
   project's rows — not just the one in `CCM_FEEDBACK_PROJECT`. This is the same
   exposure the widget already has (it ships the anon key to the browser). Flag
   it before any multi-tenant use and tighten RLS (signed JWTs, per-project
   secrets) if isolation is required. **Never** configure this server with the
   Supabase **service-role** key — the anon key is sufficient and the
   service-role key would bypass RLS entirely.

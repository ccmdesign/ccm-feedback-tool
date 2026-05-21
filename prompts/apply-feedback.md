# Prompt — apply ccm-feedback to the codebase

> This prompt is now a thin pointer. The canonical, always-current logic lives
> in the installable skill **`skills/apply-ccm-feedback/SKILL.md`** so there is
> exactly one copy of the apply steps (no drift between a prompt and a skill).

## If your agent supports skills (Claude Code, etc.)

You usually don't need to paste anything. Hand the agent a ccm-feedback share
URL (`https://<site>/feedback?project=<name>`) or attach an exported
`ccm-feedback-<project>-<date>.json` file and say *"apply this feedback."* The
`apply-ccm-feedback` skill auto-triggers on a ccm-feedback URL or JSON payload.

To install the skill, point the agent at:

```
https://raw.githubusercontent.com/ccmdesign/ccm-feedback-tool/main/skills/apply-ccm-feedback/SKILL.md
```

(The orchestrator prompt [`install-widget.md`](install-widget.md) does this for
you as part of the one-prompt setup.)

## If your agent has no skill system

Paste the full body of
[`skills/apply-ccm-feedback/SKILL.md`](../skills/apply-ccm-feedback/SKILL.md)
(everything below its YAML frontmatter) into the agent, then attach the
exported JSON file or give it the share URL. The steps are written to run
standalone.

## The one rule that must survive any copy

The agent applies each edit and sets the handled comment's status to
**`review`** — **never `done`**. `done` is a human-only transition: a reviewer
opens the widget, verifies the edit, and flips `review` → `done` themselves.
The `review` status exists so the agent can't auto-complete its own work. See
the skill for the full loop, the `bun run feedback set-status <id> review`
command, and the PostgREST fallback.

## The other rule: replies are not standalone work items

Rows with `parentId` (camelCase) / `parent_id` (raw PostgREST) set are
**replies** — fold them into the parent's thread as conversation context,
treat the latest human reply as the current directive, and **never**
source-map or set-status a reply row directly. The skill's "Replies
(`parentId`)" section covers the four rules in full (partition / fold /
`question` re-openable / re-apply → review).

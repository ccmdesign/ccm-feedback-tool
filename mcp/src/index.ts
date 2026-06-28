#!/usr/bin/env node
/**
 * ccm-feedback-mcp — a stdio MCP server that lets AI agents read, reply to,
 * edit, and close ccm-feedback comments via Supabase PostgREST.
 *
 * No new backend: this wraps the existing PostgREST API over
 * `ccm_widget_annotations`, speaking raw `fetch` with the anon-key header pair
 * (mirroring `src/cloud-store.ts`). Cloud-mode projects only.
 *
 * Config (env, overridable by argv `--key value`):
 *   SUPABASE_URL            required — the Supabase project URL
 *   SUPABASE_ANON_KEY       required — the anon / publishable key (never the service-role key)
 *   CCM_FEEDBACK_PROJECT    optional — default project name when a tool omits `project`
 *
 * stdout is the JSON-RPC channel — all diagnostics go to stderr.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildReplyPayload, buildUpdatePayload, PostgrestClient } from "./postgrest.js";
import { FEEDBACK_STATUSES } from "./types.js";

const AGENT_AUTHOR = "Agent";

interface Config {
  url: string;
  apiKey: string;
  defaultProject: string | undefined;
}

/** Read a `--key value` pair from argv, if present. */
function argv(key: string): string | undefined {
  const idx = process.argv.indexOf(`--${key}`);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return undefined;
}

function loadConfig(): Config {
  const url = argv("supabase-url") ?? process.env.SUPABASE_URL;
  const apiKey = argv("supabase-key") ?? process.env.SUPABASE_ANON_KEY;
  const defaultProject = argv("project") ?? process.env.CCM_FEEDBACK_PROJECT;

  if (!url || !apiKey) {
    process.stderr.write(
      "[ccm-feedback-mcp] Missing required config. Set SUPABASE_URL and SUPABASE_ANON_KEY " +
        "(env or --supabase-url / --supabase-key). Use the anon key, never the service-role key.\n",
    );
    process.exit(1);
  }

  return { url, apiKey, defaultProject: defaultProject ?? undefined };
}

/** Resolve the effective project: explicit arg wins, else the configured default. */
function resolveProject(arg: string | undefined, config: Config): string {
  const project = arg ?? config.defaultProject;
  if (!project) {
    throw new Error("No project specified. Pass `project` to the tool or set CCM_FEEDBACK_PROJECT / --project.");
  }
  return project;
}

/** Wrap a JSON-serializable result in the MCP text-content envelope. */
function jsonResult(value: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  return { content: [{ type: "text", text: message }], isError: true };
}

function main(): void {
  const config = loadConfig();
  const client = new PostgrestClient({ url: config.url, apiKey: config.apiKey });

  const server = new McpServer({ name: "ccm-feedback-mcp", version: "0.1.0" });

  server.registerTool(
    "list_comments",
    {
      description:
        "List all comments (and replies) for a ccm-feedback project, newest first. " +
        "Omit `project` to use the server's configured default.",
      inputSchema: { project: z.string().optional() },
    },
    async ({ project }) => {
      try {
        const records = await client.list(resolveProject(project, config), false);
        return jsonResult({ count: records.length, comments: records });
      } catch (err) {
        return errorResult(`list_comments failed: ${(err as Error).message}`);
      }
    },
  );

  server.registerTool(
    "get_pending",
    {
      description:
        "List top-level comments awaiting action (status=todo, no parent), newest first. " +
        "These are the comments an agent should triage. Omit `project` for the default.",
      inputSchema: { project: z.string().optional() },
    },
    async ({ project }) => {
      try {
        const records = await client.list(resolveProject(project, config), true);
        return jsonResult({ count: records.length, pending: records });
      } catch (err) {
        return errorResult(`get_pending failed: ${(err as Error).message}`);
      }
    },
  );

  server.registerTool(
    "update_comment",
    {
      description:
        "Edit a comment by id. Supply `message` and/or `status`. " +
        "Valid statuses: todo, review, done, question. " +
        "Note: `done` is a human-only transition — agents should use `close` (sets review) instead.",
      inputSchema: {
        id: z.string(),
        message: z.string().optional(),
        status: z.enum(FEEDBACK_STATUSES).optional(),
      },
    },
    async ({ id, message, status }) => {
      try {
        if (message === undefined && status === undefined) {
          return errorResult("update_comment requires at least one of `message` or `status`.");
        }
        const payload = buildUpdatePayload({
          ...(message !== undefined ? { message } : {}),
          ...(status !== undefined ? { status } : {}),
        });
        const updated = await client.update(id, payload);
        if (updated.length === 0) {
          return errorResult(`update_comment: no comment found with id ${id}.`);
        }
        return jsonResult({ updated });
      } catch (err) {
        return errorResult(`update_comment failed: ${(err as Error).message}`);
      }
    },
  );

  server.registerTool(
    "reply",
    {
      description:
        "Post a reply to a comment. The reply inherits the parent's project, url, and path. " +
        "Use this to respond to a reviewer in-thread.",
      inputSchema: { id: z.string(), message: z.string() },
    },
    async ({ id, message }) => {
      try {
        const parent = await client.getParentFields(id);
        if (!parent) {
          return errorResult(`reply: no comment found with id ${id}.`);
        }
        const payload = buildReplyPayload(id, parent, message, AGENT_AUTHOR);
        const inserted = await client.insertReply(payload);
        return jsonResult({ reply: inserted[0] ?? null });
      } catch (err) {
        return errorResult(`reply failed: ${(err as Error).message}`);
      }
    },
  );

  server.registerTool(
    "close",
    {
      description:
        "Mark a comment as handled by flipping its status to `review` (pending human verification). " +
        "Agents never set `done` — that is a human-only transition in the widget.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      try {
        const updated = await client.update(id, buildUpdatePayload({ status: "review" }));
        if (updated.length === 0) {
          return errorResult(`close: no comment found with id ${id}.`);
        }
        return jsonResult({ closed: updated });
      } catch (err) {
        return errorResult(`close failed: ${(err as Error).message}`);
      }
    },
  );

  const transport = new StdioServerTransport();
  server.connect(transport).catch((err: unknown) => {
    process.stderr.write(`[ccm-feedback-mcp] fatal: ${(err as Error).message}\n`);
    process.exit(1);
  });
}

main();

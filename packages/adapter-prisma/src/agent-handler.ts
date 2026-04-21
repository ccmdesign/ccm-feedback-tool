/**
 * CCM-290 — agent HTTP handlers for `/api/v1/agent/feedback[...]`.
 *
 * Authentication is a plaintext `?token=…` query parameter that is
 * constant-time compared against each `Project.agentToken` via
 * `ProjectStore.findByAgentToken`. This is a deliberate separation from the
 * widget-facing `createCcmFeedbackHandler`:
 *
 * - Widget handler is session-trusted and uses Bearer auth when configured.
 * - Agent handler is token-only, never accepts Bearer, never issues DELETE.
 *
 * Keeping the two factories independent preserves each side's threat model.
 */

import { type CcmFeedbackStore, isStoreNotFound, type ReplyResponse } from "@ccm-feedback/core";
import type { ProjectStore } from "./project-store.js";
import { agentPatchSchema, formatValidationErrors, getQuerySchema, replyCreateSchema } from "./validation.js";

export interface AgentFeedbackHandlerOptions {
  store: CcmFeedbackStore;
  projectStore: ProjectStore;
  /** Optional CORS allowlist mirrors `createCcmFeedbackHandler`. */
  allowedOrigins?: string[] | undefined;
}

export interface AgentFeedbackHandler {
  OPTIONS: (request: Request) => Response;
  /** GET /api/v1/agent/feedback — list feedbacks for a project. */
  listFeedback: (request: Request) => Promise<Response>;
  /** GET /api/v1/agent/feedback/:id — fetch a single feedback. */
  getFeedback: (request: Request, params: { id: string }) => Promise<Response>;
  /** PATCH /api/v1/agent/feedback/:id — update status (and echo optional author). */
  patchFeedback: (request: Request, params: { id: string }) => Promise<Response>;
  /** POST /api/v1/agent/feedback/:id/replies — append a reply tagged source:"agent". */
  addReply: (request: Request, params: { id: string }) => Promise<Response>;
}

// ---------------------------------------------------------------------------
// CORS helpers — mirror createCcmFeedbackHandler
// ---------------------------------------------------------------------------

function buildCorsHeaders(request: Request, allowedOrigins: string[] | undefined): Record<string, string> {
  if (!allowedOrigins) return {};
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  if (!allowedOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(response: Response, corsHeaders: Record<string, string>): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build the four agent HTTP handlers. Each resolves the project from the
 * `?token=…` query parameter via `ProjectStore.findByAgentToken`; unknown or
 * missing tokens receive `401 Unauthorized`. Cross-project access returns
 * `404 Feedback not found` to avoid leaking existence.
 */
export function createCcmAgentFeedbackHandler(opts: AgentFeedbackHandlerOptions): AgentFeedbackHandler {
  const { store, projectStore, allowedOrigins } = opts;

  async function resolveProject(request: Request): Promise<{ id: string; name: string } | null> {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) return null;
    return projectStore.findByAgentToken(token);
  }

  function unauthorized(corsHeaders: Record<string, string>): Response {
    return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }), corsHeaders);
  }

  function notFound(corsHeaders: Record<string, string>): Response {
    return withCors(Response.json({ error: "Feedback not found" }, { status: 404 }), corsHeaders);
  }

  return {
    OPTIONS: (request: Request): Response => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      return new Response(null, { status: 204, headers: corsHeaders });
    },

    listFeedback: async (request: Request): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const project = await resolveProject(request);
      if (!project) return unauthorized(corsHeaders);

      const url = new URL(request.url);
      const rawQuery: Record<string, unknown> = { projectName: project.name };
      for (const key of ["page", "limit", "type", "status", "search"]) {
        const val = url.searchParams.get(key);
        if (val !== null) rawQuery[key] = val;
      }

      const parsed = getQuerySchema.safeParse(rawQuery);
      if (!parsed.success) {
        return withCors(Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }), corsHeaders);
      }

      try {
        const result = await store.getFeedbacks(parsed.data);
        return withCors(Response.json(result), corsHeaders);
      } catch (error) {
        console.error("[ccm-feedback] agent list failed:", error);
        return withCors(Response.json({ error: "Internal server error" }, { status: 500 }), corsHeaders);
      }
    },

    getFeedback: async (request: Request, params: { id: string }): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const project = await resolveProject(request);
      if (!project) return unauthorized(corsHeaders);

      try {
        const { feedbacks } = await store.getFeedbacks({ projectName: project.name, limit: 100, page: 1 });
        const match = feedbacks.find((f) => f.id === params.id);
        if (!match) return notFound(corsHeaders);
        return withCors(Response.json(match), corsHeaders);
      } catch (error) {
        console.error("[ccm-feedback] agent get failed:", error);
        return withCors(Response.json({ error: "Internal server error" }, { status: 500 }), corsHeaders);
      }
    },

    patchFeedback: async (request: Request, params: { id: string }): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const project = await resolveProject(request);
      if (!project) return unauthorized(corsHeaders);

      const body = await request.json().catch(() => null);
      if (!body) return withCors(Response.json({ error: "Invalid JSON" }, { status: 400 }), corsHeaders);

      const parsed = agentPatchSchema.safeParse(body);
      if (!parsed.success) {
        return withCors(Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }), corsHeaders);
      }

      try {
        // Cross-project isolation: refuse to patch a feedback that doesn't
        // belong to the token's project. Scan the authenticated project's
        // list and ensure the target id is in it.
        const { feedbacks } = await store.getFeedbacks({ projectName: project.name, limit: 100, page: 1 });
        const owns = feedbacks.some((f) => f.id === params.id);
        if (!owns) return notFound(corsHeaders);

        const updated = await store.updateFeedback(params.id, {
          status: parsed.data.status,
          resolvedAt: parsed.data.status === "resolved" ? new Date() : null,
        });

        // CCM-290 — `author` is intentionally response-echo only; not persisted
        // to the feedback row. Agents track "who resolved this" via the next
        // reply's author field if they post one.
        const responseBody: Record<string, unknown> = { ...updated };
        if (parsed.data.author) responseBody.author = parsed.data.author;
        return withCors(Response.json(responseBody), corsHeaders);
      } catch (error) {
        if (isStoreNotFound(error)) return notFound(corsHeaders);
        console.error("[ccm-feedback] agent patch failed:", error);
        return withCors(Response.json({ error: "Internal server error" }, { status: 500 }), corsHeaders);
      }
    },

    addReply: async (request: Request, params: { id: string }): Promise<Response> => {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const project = await resolveProject(request);
      if (!project) return unauthorized(corsHeaders);

      const body = await request.json().catch(() => null);
      if (!body) return withCors(Response.json({ error: "Invalid JSON" }, { status: 400 }), corsHeaders);

      const parsed = replyCreateSchema.safeParse(body);
      if (!parsed.success) {
        return withCors(Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 }), corsHeaders);
      }

      try {
        // Cross-project isolation — same pattern as patchFeedback.
        const { feedbacks } = await store.getFeedbacks({ projectName: project.name, limit: 100, page: 1 });
        const owns = feedbacks.some((f) => f.id === params.id);
        if (!owns) return notFound(corsHeaders);

        const reply = await store.addReply({
          feedbackId: params.id,
          source: "agent",
          author: parsed.data.author,
          ...(parsed.data.authorEmail ? { authorEmail: parsed.data.authorEmail } : {}),
          body: parsed.data.body,
        });

        const serialized: ReplyResponse = {
          id: reply.id,
          feedbackId: reply.feedbackId,
          source: reply.source,
          author: reply.author,
          authorEmail: reply.authorEmail,
          body: reply.body,
          createdAt: reply.createdAt.toISOString(),
        };
        return withCors(Response.json(serialized, { status: 201 }), corsHeaders);
      } catch (error) {
        if (isStoreNotFound(error)) return notFound(corsHeaders);
        console.error("[ccm-feedback] agent addReply failed:", error);
        return withCors(Response.json({ error: "Internal server error" }, { status: 500 }), corsHeaders);
      }
    },
  };
}

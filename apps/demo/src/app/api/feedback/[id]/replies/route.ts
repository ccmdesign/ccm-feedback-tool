/**
 * CCM-290 — widget-side reply route: `/api/feedback/:id/replies`.
 *
 * Session-trusted: the widget submits author + optional authorEmail + body.
 * Replies go in with `source:"user"`. No token auth (parallels the existing
 * widget feedback POST endpoint).
 *
 * Rate limiting is an edge-layer concern; keep the handler minimal.
 */

import { formatValidationErrors, replyCreateSchema, StoreNotFoundError } from "@ccm-feedback/adapter-prisma";
import type { ReplyResponse } from "@ccm-feedback/core";
import { resolveStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  const store = await resolveStore();
  try {
    const rows = await store.listReplies(id);
    const serialized: ReplyResponse[] = rows.map((r) => ({
      id: r.id,
      feedbackId: r.feedbackId,
      source: r.source,
      author: r.author,
      authorEmail: r.authorEmail,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    }));
    return Response.json(serialized);
  } catch (error) {
    if (error instanceof StoreNotFoundError) {
      return Response.json({ error: "Feedback not found" }, { status: 404 });
    }
    console.error("[ccm-feedback] listReplies failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = replyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 });
  }

  const store = await resolveStore();
  try {
    const reply = await store.addReply({
      feedbackId: id,
      source: "user",
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
    return Response.json(serialized, { status: 201 });
  } catch (error) {
    if (error instanceof StoreNotFoundError) {
      return Response.json({ error: "Feedback not found" }, { status: 404 });
    }
    console.error("[ccm-feedback] addReply failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

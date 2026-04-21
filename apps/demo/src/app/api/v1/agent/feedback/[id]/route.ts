/**
 * CCM-290 — `/api/v1/agent/feedback/:id`
 *
 * GET: fetch a single feedback (404 when not in the token's project).
 * PATCH: update status; optional `author` is response-echo only.
 */

import { createCcmAgentFeedbackHandler } from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";
import { resolveStore } from "@/lib/store";
import { readAgentAllowedOrigins } from "../allowed-origins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getHandler() {
  const [store, { projectStore }] = await Promise.all([resolveStore(), resolveProjectStores()]);
  const allowedOrigins = readAgentAllowedOrigins();
  return createCcmAgentFeedbackHandler({
    store,
    projectStore,
    ...(allowedOrigins ? { allowedOrigins } : {}),
  });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const [handler, params] = await Promise.all([getHandler(), context.params]);
  return handler.getFeedback(request, params);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const [handler, params] = await Promise.all([getHandler(), context.params]);
  return handler.patchFeedback(request, params);
}

export async function OPTIONS(request: Request): Promise<Response> {
  const handler = await getHandler();
  return handler.OPTIONS(request);
}

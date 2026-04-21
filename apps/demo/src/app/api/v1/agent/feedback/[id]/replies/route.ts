/**
 * CCM-290 — `/api/v1/agent/feedback/:id/replies`
 *
 * POST: append a reply tagged `source:"agent"`.
 */

import { createCcmAgentFeedbackHandler } from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";
import { resolveStore } from "@/lib/store";
import { readAgentAllowedOrigins } from "../../allowed-origins";

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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const [handler, params] = await Promise.all([getHandler(), context.params]);
  return handler.addReply(request, params);
}

export async function OPTIONS(request: Request): Promise<Response> {
  const handler = await getHandler();
  return handler.OPTIONS(request);
}

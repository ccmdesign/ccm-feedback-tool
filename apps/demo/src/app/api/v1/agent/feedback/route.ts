/**
 * CCM-290 — `/api/v1/agent/feedback`
 *
 * Lists feedbacks for the project identified by `?token=…`. Delegates to
 * `createCcmAgentFeedbackHandler`; Memory-store deployments are not
 * supported because agent tokens live on `Project` (Prisma-only).
 *
 * The handler is built lazily on the first request so memory-only deploys
 * (no `DATABASE_URL`) fail with a clear 500 rather than crashing at
 * module-load time.
 *
 * Contract: server-to-server by default. Set `CCM_AGENT_ALLOWED_ORIGINS`
 * (comma-separated) to expose the agent API to browser-origin callers (for
 * example a debug playground). When unset the handler emits no CORS
 * headers and cross-origin browser requests are blocked by the browser.
 */

import { createCcmAgentFeedbackHandler } from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";
import { resolveStore } from "@/lib/store";
import { readAgentAllowedOrigins } from "./allowed-origins";

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

export async function GET(request: Request): Promise<Response> {
  const handler = await getHandler();
  return handler.listFeedback(request);
}

export async function OPTIONS(request: Request): Promise<Response> {
  const handler = await getHandler();
  return handler.OPTIONS(request);
}

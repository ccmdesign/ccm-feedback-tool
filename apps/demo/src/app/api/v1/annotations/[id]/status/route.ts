import { createAnnotationStatusHandler } from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { reviewBatchStore } = await resolveProjectStores();
  const handler = createAnnotationStatusHandler({
    reviewBatchStore,
    ...(process.env.CCM_CALLBACK_BEARER_TOKEN
      ? { callbackBearerToken: process.env.CCM_CALLBACK_BEARER_TOKEN }
      : {}),
  });
  const { id } = await context.params;
  return handler(request, { id });
}

import { createReviewsHandler } from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const { projectStore, reviewBatchStore } = await resolveProjectStores();
  const handler = createReviewsHandler({ projectStore, reviewBatchStore });
  return handler(request);
}

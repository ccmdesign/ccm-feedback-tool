import { createAssetSignUploadHandler } from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";
import { getSignedUploadStorageClient, getStorageOrigin } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const { projectStore } = await resolveProjectStores();
  const storageClient = getSignedUploadStorageClient();
  const storageOrigin = getStorageOrigin();
  const handler = createAssetSignUploadHandler({ projectStore, storageClient, storageOrigin });
  return handler(request);
}

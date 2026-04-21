import { createAssetMirrorHandler } from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";
import { getAssetStorageClient, getStorageOrigin } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Netlify / Next can cold-start a 10 MB stream past the default 10s;
// bump to 30s so the mirror round-trip isn't clipped.
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const { projectStore } = await resolveProjectStores();
  const storageClient = getAssetStorageClient();
  const storageOrigin = getStorageOrigin();
  const handler = createAssetMirrorHandler({ projectStore, storageClient, storageOrigin });
  return handler(request);
}

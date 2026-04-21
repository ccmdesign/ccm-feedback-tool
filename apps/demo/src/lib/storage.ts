import type { AssetStorageClient, SignedUploadStorageClient } from "@ccm-feedback/adapter-prisma";
import { resolveCcmStorageOrigin } from "@ccm-feedback/adapter-prisma";
import { createSupabaseAdminClient } from "./supabase/admin";

/** Bucket name for reviewer-uploaded assets. Provisioned in CCM-277. */
export const ASSETS_BUCKET = "assets";

/**
 * Return the canonical CCM-hosted storage origin — defaults to
 * `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/` but can be
 * overridden via `CCM_STORAGE_ORIGIN` for custom CDN front-ends.
 */
export function getStorageOrigin(): string {
  return resolveCcmStorageOrigin();
}

/** Build an `AssetStorageClient` backed by the Supabase service-role admin client. */
export function getAssetStorageClient(): AssetStorageClient {
  const admin = createSupabaseAdminClient();
  const bucket = admin.storage.from(ASSETS_BUCKET);
  return {
    async upload(path, body, options) {
      const { data, error } = await bucket.upload(path, body as Blob | ArrayBuffer, {
        contentType: options.contentType,
        upsert: options.upsert ?? false,
      });
      if (error) return { data: null, error: { message: error.message } };
      return { data: data ? { path: data.path } : null, error: null };
    },
    getPublicUrl(path) {
      return bucket.getPublicUrl(path);
    },
  };
}

/** Build a `SignedUploadStorageClient` for the sign-upload route. */
export function getSignedUploadStorageClient(): SignedUploadStorageClient {
  const admin = createSupabaseAdminClient();
  const bucket = admin.storage.from(ASSETS_BUCKET);
  return {
    async createSignedUploadUrl(path) {
      const { data, error } = await bucket.createSignedUploadUrl(path);
      if (error) return { data: null, error: { message: error.message } };
      if (!data) return { data: null, error: { message: "no-data" } };
      return {
        data: { signedUrl: data.signedUrl, token: data.token, path: data.path },
        error: null,
      };
    },
    getPublicUrl(path) {
      return bucket.getPublicUrl(path);
    },
  };
}

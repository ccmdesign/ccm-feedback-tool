/**
 * Factory for `POST /api/v1/assets/sign-upload` — returns a short-lived
 * Supabase Storage signed upload URL so the widget can PUT a file body
 * directly to storage, bypassing the Netlify 6 MB function body cap.
 *
 * The handler itself only exchanges a tiny JSON request for a signed URL;
 * the asset bytes never cross this route.
 */

import type { AllowedImageMime } from "@ccm-feedback/core";
import { extensionForMime } from "./asset-mirror.js";
import type { ProjectStore } from "./project-store.js";
import { signUploadRequestSchema } from "./validation/asset.js";
import { formatValidationErrors } from "./validation.js";

/** Minimal storage client shape used by the sign-upload handler. */
export interface SignedUploadStorageClient {
  createSignedUploadUrl(path: string): Promise<{
    data: { signedUrl: string; token: string; path: string } | null;
    error: { message: string } | null;
  }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

export interface AssetSignUploadHandlerOptions {
  projectStore: Pick<ProjectStore, "getProject">;
  storageClient: SignedUploadStorageClient;
  /** CCM-hosted public URL prefix. Used as fallback when `getPublicUrl` is unavailable. */
  storageOrigin: string;
  /** UUID generator — defaults to crypto.randomUUID. */
  uuid?: () => string;
  /** Declared TTL for the returned signed URL (seconds). Informational only. */
  expiresInSeconds?: number;
}

function uuidOf(opts: AssetSignUploadHandlerOptions): () => string {
  if (opts.uuid) return opts.uuid;
  if (typeof globalThis.crypto?.randomUUID === "function") return () => globalThis.crypto.randomUUID();
  return () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function errorResponse(status: number, message: string, extra?: Record<string, unknown>): Response {
  return Response.json({ error: message, ...(extra ?? {}) }, { status });
}

export function createAssetSignUploadHandler(opts: AssetSignUploadHandlerOptions) {
  const uuid = uuidOf(opts);
  const storageOrigin = opts.storageOrigin.endsWith("/") ? opts.storageOrigin : `${opts.storageOrigin}/`;
  const expiresInSeconds = opts.expiresInSeconds ?? 300;

  return async (request: Request): Promise<Response> => {
    const body = await request.json().catch(() => null);
    if (!body) return errorResponse(400, "Invalid JSON");

    const parsed = signUploadRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 });
    }
    const { projectId, contentType } = parsed.data;

    const project = await opts.projectStore.getProject(projectId);
    if (!project) return errorResponse(404, "Project not found");

    const ext = extensionForMime(contentType as AllowedImageMime);
    const storagePath = `${projectId}/${uuid()}.${ext}`;

    const { data, error } = await opts.storageClient.createSignedUploadUrl(storagePath);
    if (error || !data) {
      return errorResponse(502, "storage-sign-failed", { detail: error?.message ?? null });
    }

    let publicUrl: string;
    try {
      publicUrl = opts.storageClient.getPublicUrl(data.path).data.publicUrl;
    } catch {
      publicUrl = `${storageOrigin}${data.path}`;
    }

    return Response.json(
      {
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path,
        proposedAssetUrl: publicUrl,
        contentType,
        expiresInSeconds,
      },
      { status: 200 },
    );
  };
}

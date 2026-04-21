/**
 * Factory for `POST /api/v1/assets/mirror` — mirrors an external image URL
 * into the CCM `assets` Supabase Storage bucket so outbound webhook payloads
 * always carry a CCM-hosted `proposed_asset_url`.
 *
 * The handler body is the tiny `{ projectId, url }` JSON — the asset bytes
 * never cross the handler as a request body, so the 6 MB Netlify function
 * body cap does not apply. The asset stream flows Netlify → Supabase.
 */

import { ALLOWED_IMAGE_MIMES, MAX_ASSET_SIZE_BYTES } from "@ccm-feedback/core";
import { extensionForMime, isAllowedImageMime, isSafeSvg, normalizeContentType, sniffImage } from "./asset-mirror.js";
import type { ProjectStore } from "./project-store.js";
import { assetMirrorRequestSchema } from "./validation/asset.js";
import { formatValidationErrors } from "./validation.js";

/** Minimal shape the handler needs from the Supabase storage client. */
export interface AssetStorageClient {
  upload(
    path: string,
    body: ArrayBuffer | Uint8Array | Blob,
    options: { contentType: string; upsert?: boolean },
  ): Promise<{ data: { path: string } | null; error: { message: string } | null }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

export interface AssetMirrorHandlerOptions {
  projectStore: Pick<ProjectStore, "getProject">;
  storageClient: AssetStorageClient;
  /** CCM-hosted public URL prefix. Must end with a trailing slash. */
  storageOrigin: string;
  /** Mockable fetch — defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** UUID generator — defaults to crypto.randomUUID for tests. */
  uuid?: () => string;
  /** HEAD / GET timeout in ms. Defaults to 8_000. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8_000;

function idGenerator(opts: AssetMirrorHandlerOptions): () => string {
  if (opts.uuid) return opts.uuid;
  if (typeof globalThis.crypto?.randomUUID === "function") return () => globalThis.crypto.randomUUID();
  // Fallback for older Node — collision-resistant enough for storage paths.
  return () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function errorResponse(status: number, message: string, extra?: Record<string, unknown>): Response {
  return Response.json({ error: message, ...(extra ?? {}) }, { status });
}

/**
 * Return the CCM-hosted `assets/...` public URL for a given path. The
 * storage client's `getPublicUrl` is the canonical source when available;
 * otherwise fall back to concatenating `storageOrigin` + path.
 */
function buildPublicUrl(storage: AssetStorageClient, storageOrigin: string, path: string): string {
  try {
    const { data } = storage.getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  } catch {
    // fall through to manual construction
  }
  return `${storageOrigin}${path}`;
}

export function createAssetMirrorHandler(opts: AssetMirrorHandlerOptions) {
  const fetchFn = opts.fetch ?? globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const uuid = idGenerator(opts);
  const storageOrigin = opts.storageOrigin.endsWith("/") ? opts.storageOrigin : `${opts.storageOrigin}/`;

  return async (request: Request): Promise<Response> => {
    const body = await request.json().catch(() => null);
    if (!body) return errorResponse(400, "Invalid JSON");

    const parsed = assetMirrorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ errors: formatValidationErrors(parsed.error) }, { status: 400 });
    }
    const { projectId, url } = parsed.data;

    const project = await opts.projectStore.getProject(projectId);
    if (!project) return errorResponse(404, "Project not found");

    // Idempotent short-circuit: already hosted on the CCM origin — return unchanged.
    if (url.startsWith(storageOrigin)) {
      return Response.json({ proposedAssetUrl: url, assetMeta: null, alreadyMirrored: true }, { status: 200 });
    }

    // HEAD validates content-type + declared size before streaming.
    const headController = new AbortController();
    const headTimer = setTimeout(() => headController.abort(), timeoutMs);
    let headResponse: Response;
    try {
      headResponse = await fetchFn(url, { method: "HEAD", signal: headController.signal });
    } catch (error) {
      clearTimeout(headTimer);
      const reason = error instanceof Error && error.name === "AbortError" ? "head-timeout" : "head-failed";
      return errorResponse(reason === "head-timeout" ? 504 : 502, reason);
    }
    clearTimeout(headTimer);
    if (!headResponse.ok) return errorResponse(502, `head-non-ok-${headResponse.status}`);

    const headContentType = normalizeContentType(headResponse.headers.get("content-type"));
    if (!isAllowedImageMime(headContentType)) {
      return errorResponse(400, "content-type-not-allowed", { allowed: ALLOWED_IMAGE_MIMES });
    }
    const declaredLengthRaw = headResponse.headers.get("content-length");
    const declaredLength = declaredLengthRaw ? Number.parseInt(declaredLengthRaw, 10) : NaN;
    if (!Number.isNaN(declaredLength) && declaredLength > MAX_ASSET_SIZE_BYTES) {
      return errorResponse(400, "source-too-large", { max: MAX_ASSET_SIZE_BYTES });
    }

    // GET and buffer. Enforcing 10 MB here prevents a lying HEAD from sneaking through.
    const getController = new AbortController();
    const getTimer = setTimeout(() => getController.abort(), timeoutMs);
    let getResponse: Response;
    try {
      getResponse = await fetchFn(url, { method: "GET", signal: getController.signal });
    } catch (error) {
      clearTimeout(getTimer);
      const reason = error instanceof Error && error.name === "AbortError" ? "get-timeout" : "get-failed";
      return errorResponse(reason === "get-timeout" ? 504 : 502, reason);
    }
    clearTimeout(getTimer);
    if (!getResponse.ok) return errorResponse(502, `get-non-ok-${getResponse.status}`);

    const arrayBuffer = await getResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_ASSET_SIZE_BYTES) {
      return errorResponse(400, "source-too-large", { max: MAX_ASSET_SIZE_BYTES });
    }
    const bytes = new Uint8Array(arrayBuffer);

    const sniffed = sniffImage(bytes);
    if (!sniffed) return errorResponse(400, "unreadable-image");

    // Cross-check sniffed MIME with the HEAD content-type — if they disagree, trust
    // the bytes (HEAD can be spoofed).
    const mime = sniffed.mime;
    if (mime === "image/svg+xml") {
      const asText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      if (!isSafeSvg(asText)) return errorResponse(400, "unsafe-svg");
    }

    const ext = extensionForMime(mime);
    const storagePath = `${projectId}/${uuid()}.${ext}`;
    const { error: storageError } = await opts.storageClient.upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (storageError) {
      return errorResponse(502, "storage-upload-failed", { detail: storageError.message });
    }

    const publicUrl = buildPublicUrl(opts.storageClient, storageOrigin, storagePath);
    return Response.json(
      {
        proposedAssetUrl: publicUrl,
        assetMeta: {
          width: sniffed.width,
          height: sniffed.height,
          sizeBytes: bytes.byteLength,
          mime,
        },
      },
      { status: 200 },
    );
  };
}

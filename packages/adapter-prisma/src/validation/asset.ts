/**
 * Zod schemas for the CCM-282 asset endpoints:
 *  - `POST /api/v1/assets/mirror` — accepts `{ projectId, url }` and server-streams
 *    the external URL into Supabase Storage.
 *  - `POST /api/v1/assets/sign-upload` — accepts `{ projectId, filename, contentType, sizeBytes }`
 *    and returns a short-lived Supabase Storage signed upload URL for direct
 *    client PUT.
 */

import { MAX_ASSET_SIZE_BYTES, UPLOAD_ALLOWED_IMAGE_MIMES } from "@ccm-feedback/core";
import * as zod from "zod";

const z: typeof zod.z = ("z" in zod ? zod.z : zod) as typeof zod.z;

/** Strip any characters that could enable path traversal or unexpected storage-path tokens. */
const filenameShape = z
  .string()
  .min(1)
  .max(255)
  .refine((value) => !value.includes("/") && !value.includes("\\"), {
    message: "filename must not contain path separators",
  })
  .refine((value) => !value.includes(".."), {
    message: "filename must not contain '..'",
  });

export const assetMirrorRequestSchema = z.object({
  projectId: z.string().min(1).max(200),
  url: z.string().url().max(2000),
});

export type AssetMirrorRequest = zod.z.infer<typeof assetMirrorRequestSchema>;

/**
 * Sign-upload content-type allowlist — deliberately narrower than
 * `ALLOWED_IMAGE_MIMES` (CCM-282 P1). SVG is forced through the mirror path,
 * which runs `isSafeSvg()` on the bytes before upload. The signed-upload path
 * hands the client a direct-PUT URL to Supabase Storage, bypassing every
 * server-side check — accepting SVG here would be a stored-XSS bypass.
 */
export const signUploadRequestSchema = z.object({
  projectId: z.string().min(1).max(200),
  filename: filenameShape,
  contentType: z.enum(UPLOAD_ALLOWED_IMAGE_MIMES),
  sizeBytes: z.number().int().positive().max(MAX_ASSET_SIZE_BYTES),
});

export type SignUploadRequest = zod.z.infer<typeof signUploadRequestSchema>;

---
priority: p1
status: ready
origin: ce-code-review autofix (CCM-282)
run_id: 20260420-204032-85e065a3
---

# CCM-282 — Signed-upload path bypasses server-side SVG sanitizer

## Severity: P1 (security — stored XSS via signed-upload SVG)

## Files

- `packages/adapter-prisma/src/asset-sign-upload-handler.ts`
- `packages/adapter-prisma/src/validation/asset.ts` (`signUploadRequestSchema`)
- `packages/widget/src/image-swap-mode.ts` (client PUT)

## Problem

The mirror endpoint (`/api/v1/assets/mirror`) runs `isSafeSvg()` — a regex
reject for `<script>` / `on*=` — on SVG bytes BEFORE uploading to Supabase
Storage. Good.

The sign-upload endpoint (`/api/v1/assets/sign-upload`) does NOT. The server
issues a signed upload URL any time `contentType === "image/svg+xml"` and the
`sizeBytes` claim is ≤ 10 MB — and the widget PUTs the raw file body directly
to Supabase, bypassing every server-side check.

Attack path:

1. Attacker calls `POST /api/v1/assets/sign-upload` with
   `{ projectId: <valid>, filename: "x.svg", contentType: "image/svg+xml",
      sizeBytes: 1000 }`.
2. Server returns `{ signedUrl, token, path, proposedAssetUrl }`.
3. Attacker PUTs an SVG body containing
   `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(document.cookie)">`
   to `signedUrl`.
4. Supabase accepts the body (it does NOT scan SVG contents).
5. `proposedAssetUrl` is now a public URL to a hostile SVG served with
   `Content-Type: image/svg+xml` by Supabase.

Whether this is a browser-level XSS depends on where the SVG is rendered:

- The admin panel renders proposed images via `<img src="..." />` — browsers
  do NOT execute scripts in SVGs loaded through `<img>`. So the admin UI is
  not immediately exploitable. ✓
- HOWEVER: any downstream consumer that uses `<object>`, `<iframe>`, or a
  direct `window.location` navigation to the SVG URL — or a later PR that
  swaps the panel to a `<picture>` / inline preview — becomes immediately
  exploitable. The contract "CCM-hosted asset URLs are safe to embed anywhere"
  is violated.
- A malicious SVG uploaded via signed upload can also contain `<foreignObject>`
  with HTML/CSS that is honoured by admin previews that use CSS masks,
  background-images, or inline `<use>` references.

The mirror endpoint treats SVG safety as a server-layer invariant. The signed
upload path quietly breaks that invariant. The plan's Risks table explicitly
calls out SVG sanitization as a regex-first-pass with DOMPurify as follow-up
— the gap it doesn't mention is that the regex guard is only enforced on one
of the two ingress paths.

## Evidence

```ts
// packages/adapter-prisma/src/asset-sign-upload-handler.ts  (no SVG guard)
const { projectId, contentType } = parsed.data;
const project = await opts.projectStore.getProject(projectId);
if (!project) return errorResponse(404, "Project not found");

const ext = extensionForMime(contentType as AllowedImageMime);
const storagePath = `${projectId}/${uuid()}.${ext}`;

const { data, error } = await opts.storageClient.createSignedUploadUrl(storagePath);
// ... no post-upload validation hook
```

Compare with `asset-mirror-handler.ts` line 143-146 where the SVG branch does
run `isSafeSvg()` before calling `.upload()`.

## Recommended fix

Three options, increasing by effort:

### Option A (smallest, lowest-risk — recommended for this PR)

**Reject SVGs on the sign-upload path entirely** in `signUploadRequestSchema`
until the DOMPurify follow-up lands. File-upload SVG is a rare case (users
pasting SVG URLs still works via the mirror path, which sanitizes). Clients
can still paste SVG URLs and get them sanitized via mirror.

```ts
// validation/asset.ts
export const signUploadRequestSchema = z.object({
  projectId: z.string().min(1).max(200),
  filename: filenameShape,
  contentType: z
    .enum(ALLOWED_IMAGE_MIMES)
    .refine((mime) => mime !== "image/svg+xml", {
      message: "SVG upload via signed URL is disabled pending server-side sanitization. Paste a URL instead.",
    }),
  sizeBytes: z.number().int().positive().max(MAX_ASSET_SIZE_BYTES),
});
```

Widget i18n: update `imageSwap.errorMime` copy and the `accept` attribute on
`<input type="file">` to drop `image/svg+xml`.

### Option B (full parity — follow-up)

Add a **post-upload re-validation** endpoint: after the client completes the
PUT, it calls `POST /api/v1/assets/verify` with the path. The server
downloads the object, runs `isSafeSvg()` (and `image-size` sniff for image
MIME spoof detection), and either confirms or deletes the object. The widget
uses the `proposedAssetUrl` only after verification returns 200.

### Option C (fully secure — ticket for the DOMPurify follow-up)

Replace `isSafeSvg()` with a server-side DOMPurify pass that rewrites SVG
bytes to strip dangerous nodes/attributes, then compare re-serialized bytes
against the uploaded body. Requires swapping the sign-upload path to a
write-through proxy (losing the 6 MB Netlify bypass benefit for SVGs only —
acceptable since SVGs are small).

## Acceptance

- Option A tests: `sign-upload` rejects `image/svg+xml` with 400 and a clear
  error code; existing non-SVG mimes still succeed.
- Widget: `<input type="file" accept="...">` no longer lists `image/svg+xml`
  when direct upload is the transport; file-picker rejects SVG with the new
  i18n string.
- Both MIME lists stay in sync with `ALLOWED_IMAGE_MIMES` except the SVG
  carve-out, which lives in a single `UPLOAD_ALLOWED_IMAGE_MIMES` constant
  (so the mirror path keeps accepting SVG).

## Not fixed in autofix because

This is an intentional surface cut that removes user-facing functionality
(file-upload of SVGs). Needs product sign-off on whether Option A (reject
SVG uploads) ships now vs. waiting for Option B/C. The alternative is
accepting the residual risk until DOMPurify is wired.

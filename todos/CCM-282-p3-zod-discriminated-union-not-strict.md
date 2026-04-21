---
priority: p3
status: ready
origin: ce-code-review autofix (CCM-282)
run_id: 20260420-204032-85e065a3
---

# CCM-282 — Annotation discriminated-union accepts stray fields from other variants

## Severity: P3 (validation strictness — low-impact)

## File

- `packages/adapter-prisma/src/validation.ts` (lines 66-128)

## Problem

The `discriminatedAnnotationSchema` branches (`rectangleAnnotationSchema`,
`textChangeAnnotationSchema`, `imageSwapAnnotationSchema`) are plain
`z.object(...)` without `.strict()`. Zod defaults to stripping unknown keys,
which means:

- A client sends `{ type: "rectangle", proposedText: "malicious", ...rect }`
  — the rectangle branch silently drops `proposedText` and succeeds.
- A client sends `{ type: "text_change", assetMeta: { ... }, originalText, proposedText, ...rect }`
  — the text_change branch silently drops `assetMeta` and succeeds.

This is NOT a security issue — stripped fields don't reach the database. But:

- It hides client bugs: a widget bug that mislabels `type` still succeeds
  server-side, making the bug harder to detect.
- It allows inconsistent payloads to round-trip (same logical edit encoded
  two different ways).
- It weakens the `_AssertAnnotationType` contract — the runtime shape no
  longer matches the TS type one-to-one.

## Recommended fix

Add `.strict()` to each branch:

```ts
const rectangleAnnotationSchema = z.object({
  type: z.literal("rectangle"),
  ...annotationMetricsShape,
}).strict();

const textChangeAnnotationSchema = z.object({
  type: z.literal("text_change"),
  originalText: z.string().min(1).max(5000),
  proposedText: z.string().min(1).max(5000),
  ...annotationMetricsShape,
}).strict();

const imageSwapAnnotationSchema = z.object({
  type: z.literal("image_swap"),
  originalAssetUrl: z.string().url().max(2000),
  proposedAssetUrl: z.string().url().max(2000),
  proposedAssetSource: z.enum(["link", "upload"]),
  proposedAltText: z.string().max(500).optional(),
  assetMeta: assetMetaSchema,
  ...annotationMetricsShape,
}).strict();
```

Note: `.strict()` interacts with `preprocess` + `discriminatedUnion` — verify
the existing test suite still passes. The `assetMetaSchema` nested object can
keep stripping (no cross-variant confusion risk there).

## Acceptance

- Unit test: submitting a rectangle payload with stray `proposedText` fails
  with a clear Zod error mentioning the unexpected key.
- Existing `validation.test.ts` cases remain green.
- Verify the widget never accidentally sends stray fields (audit
  `launcher.ts` / `image-swap-mode.ts` payload assembly for clean shape).

## Not fixed in autofix because

`.strict()` changes reject behaviour — any legitimate client sending an
extra field as an extensibility hook (e.g. `annotationVersion`) will now
fail. Low probability, but the audit is still pre-merge human work.

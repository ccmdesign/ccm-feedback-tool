# @ccm-feedback/core

**Internal package** -- shared types and schema definitions for all `@ccm-feedback/*` packages.

Part of the [@ccm-feedback](https://github.com/ccmdesign/ccm-feedback-tool) monorepo.

## Internal Package

This package is `private: true` and is **never published to npm**. It exports raw TypeScript (no build step) and is bundled directly into consumers via `noExternal: ["@ccm-feedback/core"]` in their tsup config.

This makes `@ccm-feedback/core` the **single source of truth** for:

- All shared TypeScript types
- The Prisma model definitions used by the CLI to generate schemas
- Store error classes and type guards
- Shared adapter helpers
- Conformance test suite for adapter authors

## Main Exports

### Types

| Type | Description |
|------|-------------|
| `CcmFeedbackConfig` | Widget initialization options (endpoint, projectName, position, accentColor, events) |
| `CcmFeedbackInstance` | Return value of `initCcmFeedback()` — contains `destroy()` |
| `FeedbackType` | `'question' \| 'change' \| 'bug' \| 'other'` |
| `FeedbackStatus` | `'open' \| 'resolved'` |
| `FeedbackPayload` | Shape of the POST request body sent by the widget |
| `FeedbackResponse` | Shape of feedback objects returned by the API |
| `AnnotationPayload` | Annotation data sent with a feedback (anchor + rect + viewport) |
| `AnnotationResponse` | Annotation as returned by the API |
| `AnchorData` | Multi-selector anchoring data (CSS selector, XPath, text snippet, fingerprint) |
| `RectData` | Percentage-relative rectangle within the anchor element |
| `FieldDef` | Schema field definition used by `CCM_FEEDBACK_MODELS` |

### Adapter Pattern

| Export | Description |
|--------|-------------|
| `CcmFeedbackStore` | Abstract store interface — 6 methods that every adapter implements |
| `StoreNotFoundError` | Error class for missing records (update/delete) |
| `StoreDuplicateError` | Error class for duplicate `clientId` |
| `isStoreNotFound(err)` | Type guard — detects `StoreNotFoundError` and Prisma P2025 |
| `isStoreDuplicate(err)` | Type guard — detects `StoreDuplicateError` and Prisma P2002 |
| `flattenAnnotation(payload)` | Convert nested `AnnotationPayload` to flat `AnnotationCreateInput` |

### Testing (`@ccm-feedback/core/testing`)

| Export | Description |
|--------|-------------|
| `testCcmFeedbackStore(factory)` | Conformance test suite — runs 22 tests against any `CcmFeedbackStore` implementation |

### Schema

| Export | Description |
|--------|-------------|
| `CCM_FEEDBACK_MODELS` | TypeScript representation of the Prisma models (`FeedbackItem`, `FeedbackAnnotation`). Used by the CLI to generate and sync the actual `.prisma` schema. |

## How It's Consumed

```ts
// In tsup.config.ts of widget, adapter-prisma, or cli:
export default defineConfig({
  noExternal: ["@ccm-feedback/core"],
  // ...
})
```

This inlines the raw TS exports at build time -- no separate build step needed for core.

## License

[MIT](https://github.com/ccmdesign/ccm-feedback-tool/blob/main/LICENSE)

Based on [SitePing](https://github.com/NeosiaNexus/SitePing) by NeosiaNexus — MIT licensed.

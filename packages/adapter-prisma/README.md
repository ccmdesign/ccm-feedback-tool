[![npm version](https://img.shields.io/npm/v/@ccm-feedback/adapter-prisma)](https://www.npmjs.com/package/@ccm-feedback/adapter-prisma)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @ccm-feedback/adapter-prisma

Server-side Prisma adapter for [CCM Feedback](https://github.com/ccmdesign/ccm-feedback-tool) — handles API request validation and database persistence.

Part of the [@ccm-feedback](https://github.com/ccmdesign/ccm-feedback-tool) monorepo.

## Install

```bash
npm install @ccm-feedback/adapter-prisma
```

**Peer dependency:** `@prisma/client` ^5.0.0 || ^6.0.0

## Quick Start

```ts
// app/api/feedback/route.ts (Next.js App Router)
import { createCcmFeedbackHandler } from '@ccm-feedback/adapter-prisma'
import { prisma } from '@/lib/prisma'

export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({ prisma })
```

## API Endpoints

| Method | Description | Status |
|--------|-------------|--------|
| `POST` | Create feedback with annotations | `201` |
| `GET` | List feedbacks (filterable by type, status, search) | `200` |
| `PATCH` | Resolve or unresolve a feedback | `200` |
| `DELETE` | Delete a feedback or all feedbacks for a project | `200` |

### Query Parameters (GET)

| Param | Type | Description |
|-------|------|-------------|
| `projectName` | `string` | **Required.** Filter by project |
| `type` | `string` | `question` \| `change` \| `bug` \| `other` |
| `status` | `string` | `open` \| `resolved` |
| `search` | `string` | Full-text search on message content |
| `page` | `number` | Pagination (default: 1) |
| `limit` | `number` | Items per page (default: 50, max: 100) |

## Validation Constraints

All incoming requests are validated with Zod before hitting the database.

### POST — Create feedback (`feedbackCreateSchema`)

| Field | Constraint |
|-------|-----------|
| `projectName` | Non-empty string |
| `type` | `"question"` \| `"change"` \| `"bug"` \| `"other"` |
| `message` | 1 to **5000** characters |
| `url` | Valid URL format |
| `viewport` | Non-empty string |
| `userAgent` | Non-empty string |
| `authorName` | 1 to **200** characters |
| `authorEmail` | Valid email format, max **200** characters |
| `clientId` | Non-empty string (client-generated UUID for deduplication) |
| `annotations` | Array of annotation objects (see below) |

**Annotation fields:** `cssSelector`, `xpath`, `elementTag` must be non-empty. `wPct`, `hPct` must be positive. `viewportW`, `viewportH` must be positive integers. `devicePixelRatio` must be positive (defaults to `1`).

### PATCH — Resolve/unresolve (`feedbackPatchSchema`)

| Field | Constraint |
|-------|-----------|
| `id` | Non-empty string |
| `status` | `"open"` \| `"resolved"` |

### DELETE — Remove feedback (`feedbackDeleteSchema`)

Either provide `{ id }` to delete a single feedback, or `{ projectName, deleteAll: true }` to delete all feedbacks for a project.

## Prisma Schema

Use the CLI to set up models automatically:

```bash
npx @ccm-feedback/cli init
npx prisma db push
```

## Authentication

By default, all endpoints are publicly accessible. To protect read/update/delete operations, pass an `apiKey`:

```ts
export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({
  prisma,
  apiKey: process.env.CCM_FEEDBACK_API_KEY,
  allowedOrigins: ["https://your-site.com"],
})
```

When `apiKey` is set:

- **POST** and **OPTIONS** remain public (the browser widget needs to submit feedback and perform CORS preflight without authentication).
- **GET**, **PATCH**, and **DELETE** require a `Bearer <apiKey>` token in the `Authorization` header.

## Framework Compatibility

The handler uses the **Web Standard `Request`/`Response` API** and works natively with:

- **Next.js App Router** (route handlers)
- **Bun** (`Bun.serve`)
- **Deno** (`Deno.serve`)
- **Hono** (lightweight Web Standard framework)

For **Express** or **Fastify**, you need an adapter to convert between `(req, res)` and `Request`/`Response`. If you're starting a new project and want something lightweight, [Hono](https://hono.dev) is a good Web Standard alternative.

## Edge Runtime

The adapter uses `node:crypto` (`timingSafeEqual`) for timing-safe API key comparison. This requires the **Node.js runtime** and is not available in pure edge/V8 environments.

- **Cloudflare Workers**: enable the [`nodejs_compat`](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) compatibility flag.
- **Vercel Edge Runtime**: use the Node.js runtime (`export const runtime = "nodejs"`) instead of the edge runtime.

## DELETE Request Body

DELETE operations send their payload in the **request body** (JSON), not as URL query parameters. This follows the REST convention for structured delete requests (single item by `id`, or bulk delete by `projectName`).

> **Note:** Some CDNs and reverse proxies strip the body from DELETE requests. If you experience issues, verify that your infrastructure forwards DELETE bodies correctly.

## Privacy and Data Collection

The widget collects and stores the following data per feedback submission:

| Data | Purpose |
|------|---------|
| Author name and email | Identify the feedback author |
| Feedback message | The feedback content itself |
| Page URL | Where the feedback was submitted (sensitive query params like `token`, `key`, `password` are stripped) |
| Viewport size | Reproduce layout context |
| User agent | Browser/device identification |
| CSS selector, XPath, text snippet | Anchor annotations to specific DOM elements |
| Annotation coordinates (% relative) | Position annotations on the page |

**Not collected:** screenshots, full DOM snapshots, cookies, localStorage, or any data beyond what is listed above.

## Related Packages

| Package | Description |
|---------|-------------|
| [`@ccm-feedback/widget`](https://www.npmjs.com/package/@ccm-feedback/widget) | Browser feedback widget |
| [`@ccm-feedback/adapter-memory`](https://www.npmjs.com/package/@ccm-feedback/adapter-memory) | In-memory adapter (testing, demos) |
| [`@ccm-feedback/adapter-localstorage`](https://www.npmjs.com/package/@ccm-feedback/adapter-localstorage) | Client-side localStorage adapter |
| [`@ccm-feedback/cli`](https://www.npmjs.com/package/@ccm-feedback/cli) | CLI for project setup |

## License

[MIT](https://github.com/ccmdesign/ccm-feedback-tool/blob/main/LICENSE)

Based on [SitePing](https://github.com/NeosiaNexus/SitePing) by NeosiaNexus — MIT licensed.

[![npm version](https://img.shields.io/npm/v/@ccm-feedback/adapter-memory)](https://www.npmjs.com/package/@ccm-feedback/adapter-memory)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @ccm-feedback/adapter-memory

In-memory adapter for [CCM Feedback](https://github.com/ccmdesign/ccm-feedback-tool) — zero dependencies, works everywhere.

Part of the [@ccm-feedback](https://github.com/ccmdesign/ccm-feedback-tool) monorepo.

## Install

```bash
npm install @ccm-feedback/adapter-memory
```

## Usage

### With the HTTP handler (server-side)

```ts
import { createCcmFeedbackHandler } from '@ccm-feedback/adapter-prisma'
import { MemoryStore } from '@ccm-feedback/adapter-memory'

const store = new MemoryStore()

export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({ store })
```

### With the widget directly (client-side, no server)

```ts
import { initCcmFeedback } from '@ccm-feedback/widget'
import { MemoryStore } from '@ccm-feedback/adapter-memory'

const store = new MemoryStore()

initCcmFeedback({
  store,
  projectName: 'my-project',
})
```

## API

### `new MemoryStore()`

Creates a new in-memory store. Data lives in a plain array — lost on process restart.

### `store.clear()`

Remove all data and reset the ID counter.

## Use Cases

- **Testing** — fast, isolated store for unit and integration tests
- **Demos** — lightweight store that needs no database or localStorage
- **Prototyping** — get started without any infrastructure
- **Reference implementation** — simplest possible adapter for contributors

## Creating Your Own Adapter

`MemoryStore` is the simplest reference implementation of the `CcmFeedbackStore` interface. To create a new adapter (e.g. Drizzle, Supabase):

1. Implement the `CcmFeedbackStore` interface (6 methods)
2. Throw `StoreNotFoundError` on missing records in `updateFeedback` / `deleteFeedback`
3. Validate with the conformance test suite:

```ts
import { testCcmFeedbackStore } from '@ccm-feedback/core/testing'
import { MyStore } from '../src/index.js'

testCcmFeedbackStore(() => new MyStore())
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@ccm-feedback/widget`](https://www.npmjs.com/package/@ccm-feedback/widget) | Browser feedback widget |
| [`@ccm-feedback/adapter-prisma`](https://www.npmjs.com/package/@ccm-feedback/adapter-prisma) | Server-side Prisma adapter |
| [`@ccm-feedback/adapter-localstorage`](https://www.npmjs.com/package/@ccm-feedback/adapter-localstorage) | Client-side localStorage adapter |
| [`@ccm-feedback/cli`](https://www.npmjs.com/package/@ccm-feedback/cli) | CLI for project setup |

## License

[MIT](https://github.com/ccmdesign/ccm-feedback-tool/blob/main/LICENSE)

Based on [SitePing](https://github.com/NeosiaNexus/SitePing) by NeosiaNexus — MIT licensed.

[![npm version](https://img.shields.io/npm/v/@ccm-feedback/adapter-localstorage)](https://www.npmjs.com/package/@ccm-feedback/adapter-localstorage)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @ccm-feedback/adapter-localstorage

Client-side localStorage adapter for [CCM Feedback](https://github.com/ccmdesign/ccm-feedback-tool) — feedback persistence without a server.

Part of the [@ccm-feedback](https://github.com/ccmdesign/ccm-feedback-tool) monorepo.

## Install

```bash
npm install @ccm-feedback/adapter-localstorage
```

## Usage

Pass the store directly to the widget — no server needed:

```ts
import { initCcmFeedback } from '@ccm-feedback/widget'
import { LocalStorageStore } from '@ccm-feedback/adapter-localstorage'

const store = new LocalStorageStore()

initCcmFeedback({
  store,
  projectName: 'my-project',
})
```

Feedback persists across page reloads via `localStorage`. Data is scoped to the current origin.

## API

### `new LocalStorageStore(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | `'ccm_feedback_items'` | localStorage key for data persistence |

### `store.clear()`

Remove all data from localStorage for this store key.

## Use Cases

- **Demo pages** — static pages with feedback persistence, zero server
- **Prototyping** — test the widget without setting up a database
- **Offline-first** — feedback stored locally, synced later

## Edge Cases

- **localStorage full** — writes are silently dropped (best-effort persistence)
- **Corrupted data** — returns empty array, does not throw
- **Multiple stores** — use different `key` values for isolation

## Related Packages

| Package | Description |
|---------|-------------|
| [`@ccm-feedback/widget`](https://www.npmjs.com/package/@ccm-feedback/widget) | Browser feedback widget |
| [`@ccm-feedback/adapter-prisma`](https://www.npmjs.com/package/@ccm-feedback/adapter-prisma) | Server-side Prisma adapter |
| [`@ccm-feedback/adapter-memory`](https://www.npmjs.com/package/@ccm-feedback/adapter-memory) | In-memory adapter (testing, demos) |
| [`@ccm-feedback/cli`](https://www.npmjs.com/package/@ccm-feedback/cli) | CLI for project setup |

## License

[MIT](https://github.com/ccmdesign/ccm-feedback-tool/blob/main/LICENSE)

Based on [SitePing](https://github.com/NeosiaNexus/SitePing) by NeosiaNexus — MIT licensed.

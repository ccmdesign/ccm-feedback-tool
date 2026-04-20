[![npm version](https://img.shields.io/npm/v/@ccm-feedback/cli)](https://www.npmjs.com/package/@ccm-feedback/cli)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @ccm-feedback/cli

CLI tool to set up [CCM Feedback](https://github.com/ccmdesign/ccm-feedback-tool) in your project — scaffolds Prisma schema and API routes.

Part of the [@ccm-feedback](https://github.com/ccmdesign/ccm-feedback-tool) monorepo.

## Usage

```bash
npx @ccm-feedback/cli init
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Interactive setup: Prisma schema + API route generation |
| `sync` | Non-interactive Prisma schema sync (CI-friendly) |
| `status` | Diagnostic check of your CCM Feedback integration |
| `doctor` | Test API endpoint connectivity |

### `init`

Walks you through setting up CCM Feedback:
1. Detects your `prisma/schema.prisma`
2. Merges `FeedbackItem` and `FeedbackAnnotation` models (idempotent)
3. Generates the Next.js App Router API route

```bash
npx @ccm-feedback/cli init
npx prisma db push
```

### `sync`

Non-interactive schema sync, useful for CI:

```bash
npx @ccm-feedback/cli sync --schema prisma/schema.prisma
```

### `status`

Checks your integration:

```bash
npx @ccm-feedback/cli status
```

### `doctor`

Tests API connectivity:

```bash
npx @ccm-feedback/cli doctor --url http://localhost:3000
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@ccm-feedback/widget`](https://www.npmjs.com/package/@ccm-feedback/widget) | Browser feedback widget |
| [`@ccm-feedback/adapter-prisma`](https://www.npmjs.com/package/@ccm-feedback/adapter-prisma) | Server-side Prisma adapter |
| [`@ccm-feedback/adapter-memory`](https://www.npmjs.com/package/@ccm-feedback/adapter-memory) | In-memory adapter (testing, demos) |
| [`@ccm-feedback/adapter-localstorage`](https://www.npmjs.com/package/@ccm-feedback/adapter-localstorage) | Client-side localStorage adapter |

## License

[MIT](https://github.com/ccmdesign/ccm-feedback-tool/blob/main/LICENSE)

Based on [SitePing](https://github.com/NeosiaNexus/SitePing) by NeosiaNexus — MIT licensed.

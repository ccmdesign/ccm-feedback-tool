# Contributing to ccm-feedback

Thanks for taking the time. This is a small, single-purpose project — bug reports, fixes, and focused PRs are very welcome. Big new features should usually start as an issue first so we can talk about scope before you spend time.

## Project shape

- Single TypeScript package, browser-only widget. No monorepo.
- `src/` → `dist/w.js` via esbuild. That bundle is the entire deliverable.
- Optional Supabase backend (`supabase/migrations/`); the widget runtime never reads env vars.
- See [docs/architecture.md](docs/architecture.md) for a code map.

## Getting set up

Requirements:

- [Bun](https://bun.sh) 1.3+ (used for install + scripts)
- Modern browser for testing

```bash
git clone https://github.com/ccmdesign/ccm-feedback-tool
cd ccm-feedback-tool
bun install
bun run dev          # esbuild watch → dist/w.js + public/w.js
bun run serve        # build + serve public/ on http://localhost:5173
```

Open `http://localhost:5173` and the demo page loads with the widget mounted on itself. Edit `src/`, the watcher rebuilds, refresh the page.

> Cloud mode is auto-disabled on `localhost`. To test cloud sync end-to-end you'll need a deployed preview URL pointing at your own Supabase project.

## Verification before opening a PR

```bash
bun run check        # tsc --noEmit, must pass
bun run lint         # biome, must pass
bun run build        # produces dist/w.js
```

Then **manually verify in a browser**: this project has no automated test suite. Smoke-test the path you changed — drop a pin, refresh, check it persists, click it, edit it, delete it, export the JSON. Both light and dark themes if you touched any styling.

## Branch and commit conventions

- Work on a feature branch off `dev`. PRs target `dev`. Never `main` directly.
- [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`
  - `feat(widget):`, `fix(cloud):`, `docs(readme):`, `refactor(dom):`, `chore:`
- Keep commits focused. Small, reviewable diffs > big "everything changed" commits.

## Pull requests

- One concern per PR. Bug fix + refactor + new feature = three PRs.
- Describe what changed and why. Link the issue if there is one.
- Include before/after screenshots or a short clip for any UI change.
- Note any schema implications — if you touched `cloud-store.ts`, do migrations need updating?
- Don't bump the version or modify changelog files; maintainers handle release tagging.

## Style

- TypeScript strict + `exactOptionalPropertyTypes`. Don't widen types to silence the compiler — fix the underlying issue.
- Biome handles formatting. `bun run lint:fix` before committing.
- No new dependencies without discussion. The whole point of the widget is "small, no SDKs". `@medv/finder` is the only runtime dep and we'd like to keep it that way.
- Comments: explain *why*, not *what*. Don't narrate code that's already obvious.
- i18n: any new user-facing string goes in `src/i18n.ts` for both `en` and `fr`.

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). The most valuable info is:

- The widget version (commit SHA or build date)
- Browser + OS
- Whether it's local or cloud mode
- Console output with `data-debug="true"` set on the script tag
- Minimal repro (a single static HTML page that triggers the issue)

## Reporting security issues

**Don't open public issues for security problems.** See [SECURITY.md](SECURITY.md).

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind. Disagreement is fine; cruelty is not.

## License

By contributing, you agree your contributions are licensed under the MIT License (same as the project — see [LICENSE](LICENSE)).

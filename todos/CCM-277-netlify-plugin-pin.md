---
title: "Pin `@netlify/plugin-nextjs` version in `netlify.toml`"
priority: p2
status: ready
source: ce-code-review (CCM-277)
---

## Problem

`netlify.toml` declares:

```toml
[[plugins]]
package = "@netlify/plugin-nextjs"
```

No version is pinned. Netlify auto-installs the latest version on each build, which means a plugin breaking change (or a Next 15/16 compatibility shift) can silently break the deploy without any repo-side signal.

The CCM-277 implementation report explicitly flagged this as a deviation from the plan, which said "The `@netlify/plugin-nextjs` plugin is **pinned** in `[[plugins]]`."

## Fix

Pin to the current working version. Options:

```toml
[[plugins]]
package = "@netlify/plugin-nextjs"

[plugins.inputs]
# The inputs block is only needed if plugin options are customized — usually not.
```

Netlify's plugin manifest supports pinning via `package = "@netlify/plugin-nextjs@<version>"` in some configurations, but the canonical way is to let the build API pick up the version from the site's UI settings. If Netlify UI pinning is preferred, document the pin there and note in `docs/local-dev.md` that the plugin version is pinned out-of-tree.

If in-repo pinning is preferred, add a root-level `package.json` devDependency on the plugin and reference it by path, or use the `pin_version` input if present (check current plugin docs).

## Why P2 and not P1

The plugin is stable and Next 15 support has been in the plugin for a while. The risk is on future major versions — for now the unpinned plugin works. Still worth closing before production launch.

## Verification

- After applying the pin, bump the plugin version intentionally in a throwaway branch and confirm the deploy picks up the new version on next build.
- Consult Netlify docs to confirm the canonical pin syntax for the version of the plugin currently in use.

## Related files

- `netlify.toml` (repo root)

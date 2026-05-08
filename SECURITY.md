# Security policy

## Reporting a vulnerability

If you've found a security issue in ccm-feedback, **do not open a public GitHub issue**. Instead, email:

> **dev@ccmdesign.ca**

Include:

- A description of the vulnerability and its impact
- Steps to reproduce (a minimal repro is ideal)
- The widget version (commit SHA or `dist/w.js` build date)
- Whether the issue is in local mode, cloud mode, or both
- Your name / handle if you'd like to be credited in the fix

We'll acknowledge receipt within **5 business days** and aim to publish a fix within **30 days** for confirmed issues, faster for actively exploited ones. We'll keep you in the loop on progress and disclosure timing.

## Supported versions

ccm-feedback is pre-1.0. Only the `main` branch is supported. We don't backport fixes to tagged releases — upgrade to the latest `dist/w.js` to get security fixes.

## Threat model

Things that **are** in scope:

- XSS / DOM injection through annotation content, script-tag attributes, or imported data
- Bypasses of the URL sanitization in `src/index.ts > sanitizeUrl()` (which strips `token`, `key`, `secret`, etc. from query params)
- Issues that let one project's annotations leak into another via the cloud store
- Authentication / RLS bypasses against the documented permissive-by-default Supabase schema
- Realtime channel hijacking
- Build-supply-chain issues (a compromised dependency reaching `dist/w.js`)

Things that **are not** in scope:

- The reviewer-supplied anon key being visible in HTML — that's by design, see [docs/cloud-mode.md](docs/cloud-mode.md#auth-model). Real protection comes from RLS, not key secrecy.
- A self-hoster choosing to ship the **service-role key** in `data-supabase-key`. That's "don't do that"; we won't engineer around it.
- Permissive RLS in `0001_init.sql`. The migration ships permissively on purpose for low-stakes review use; tightening it for public production is the operator's responsibility (see [docs/self-hosting.md](docs/self-hosting.md#3-rls-policies--tighten-before-public-exposure)).
- DoS by spamming a public Supabase project. That's a deployment configuration issue, not a widget bug.
- Issues in upstream Supabase itself. Report those to Supabase.

## What we'll do

- Confirm or close the report
- Fix in `main` and ship a new `dist/w.js`
- Publish a [GitHub Security Advisory](https://github.com/ccmdesign/ccm-feedback-tool/security/advisories) once a fix is available
- Credit you, unless you'd rather stay anonymous

## What we won't do

- Pay a bounty. This is a small open-source project, not a bug bounty program.
- Sign NDAs for vulnerability reports.
- Promise specific timelines without seeing the report first.

Thanks for helping keep ccm-feedback users safe.

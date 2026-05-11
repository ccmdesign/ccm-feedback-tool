# Product Hunt — ccm-feedback

Launch artifact. Source of truth for tagline, description, gallery, first comment, and pre-launch checklist.

- **Site:** https://feedback.ccmdesign.ca
- **Repo:** https://github.com/ccmdesign/ccm-feedback-tool
- **Maker:** [CCM Design](https://ccm.design) (Claudio Mendonça)
- **License:** MIT
- **Status:** pre-launch — fill in launch date when scheduled

---

## Positioning

Two benefits lead everything:

1. **Open source (MIT)** — fork it, self-host it, no SaaS, no seats, no vendor lock.
2. **Built for agents** — JSON export is the handoff. Paste to Claude/Cursor → agent has CSS selector, XPath, comment, position. Agent ships the edits.

Not a Marker.io clone. The product is the **review-to-edit loop closing itself.**

Old workflow: client gives vague feedback → designer translates → dev guesses which element.
New workflow: client pins on the actual DOM → JSON export → agent has full context → ships edit.

---

## Name + Tagline (final)

- **Name:** `Client review for the agent era`
- **Tagline (60 char max):** `Pin feedback. Export JSON. Let Claude do the edits.`

### Alternates considered (not used)

- `Open-source feedback widget. JSON → your AI agent.`
- `Client review tool built for the agent era.`

---

## Description (260 char max)

> Open-source feedback widget for client website reviews. Drop one `<script>`, client pins comments on real elements, you export JSON, paste to Claude/Cursor — agent has full context (selector, screenshot coords, comment) to ship edits. MIT. By CCM Design.

---

## Topics (PH categories)

**Developer Tools · Open Source · AI · Design Tools · Productivity**

(AI promoted because the agent loop is the hook.)

---

## Gallery (5–8 assets, in this order)

1. **Hero GIF** — split screen: left = client pins on page, right = Cursor/Claude reading JSON, editing component file. End frame = diff applied. ≤8 sec, looped.
2. **Screenshot** — JSON file open beside agent prompt. Annotate which fields the agent uses (`cssSelector`, `message`, `xPct/yPct`, `fingerprint`).
3. **Screenshot** — radial FAB menu open (target / pin / area / toggle / export / clear).
4. **Screenshot** — page with 3–4 colored pins, hover state showing one comment popover.
5. **Screenshot** — script tag install snippet, syntax highlighted, accent `#0066ff`.
6. **Screenshot** — agent install prompt being pasted into Cursor/Claude.
7. **Screenshot** — GitHub repo (open-source proof: stars, MIT badge, contributors).
8. **Optional** — cloud mode realtime: two browser windows, pin appears in second window live.

---

## First comment (maker comment — pin to top)

> Hi PH 👋 — Claudio @ [CCM Design](https://ccm.design). Built this for our own client work.
>
> Two things that matter:
>
> **1. Open source (MIT).** Fork it, self-host it, your data lives in your Supabase or just localStorage. No seats, no SaaS, no vendor lock. Repo: github.com/ccmdesign/ccm-feedback-tool.
>
> **2. Built for agents.** Real shift here. Old workflow: client leaves vague feedback → designer translates → dev guesses which element. New workflow: client pins comments on the actual DOM → you export JSON → paste to Claude/Cursor → agent already knows the CSS selector, XPath, element tag, and comment text. It can find and edit the right component without you mediating.
>
> The JSON is the handoff. The agent is the dev. You are the loop closer.
>
> Demo: https://feedback.ccmdesign.ca — page IS the playground, FAB lives bottom-right.
>
> Tear it apart.

---

## Feature bullets (use in description, first comment, or gallery captions)

- One `<script>` tag install
- Pin on element / coord / drag-area
- Survives DOM changes — 4-strategy anchor (CSS / XPath / text / fingerprint)
- Export JSON, hand to dev or agent — no lock-in
- Optional Supabase cloud mode (your DB, your data, your RLS)
- No `@supabase/supabase-js` dep — raw fetch + WebSocket
- Agent-installable (one prompt → done, agent fetches sub-prompts itself)
- MIT, fork-friendly, ~no runtime deps
- Desktop-only by design (reviews happen on desktop)

---

## OG image / social card

- **Size:** 1200×630
- **Big text:** `Client pins. Agent edits.`
- **Sub:** `Open-source feedback widget for the agent era.`
- **URL footer:** `feedback.ccmdesign.ca`
- **Visual:** FAB bottom-right corner with hand-drawn marker arrow (matches landing page style); accent `#0066ff` dot for brand mark
- **Type:** Fraunces serif for headline, JetBrains Mono for URL footer

---

## Hunter / amplification

- Lined-up hunter with audience overlap (designers, indie devs, AI tool builders) — warm one, not cold submit
- Launch Tue–Thu, 12:01 AM PST
- Maker available for Q&A all day
- Pre-warm Twitter / Bluesky / LinkedIn the night before
- Slack + Discord communities ready to direct (don't spam — share where invited)

---

## Pre-launch checklist

### Site (`feedback.ccmdesign.ca`)

- [x] New "01 — the loop" section live (client pins → JSON → agent ships)
- [x] Hero reframed: "Client pins. Agent edits."
- [x] Title + meta description lead with open-source + agent
- [ ] OG image generated and wired in `<meta property="og:image">`
- [ ] Twitter card meta added
- [ ] Demo URL load-tested (Netlify free tier — warm cache before launch)
- [ ] Confirm widget JS path on canonical domain (currently `ccm-feedback-582.netlify.app/w.js`)

### Repo

- [ ] README hero line updated to match new positioning
- [ ] `CHANGELOG.md` v0.1.0 entry written
- [ ] `package.json` version bump `0.1.0-mvp` → `0.1.0`
- [ ] Pinned issues + `good-first-issue` labels for PH traffic
- [ ] `prompts/apply-feedback.md` — the missing prompt that takes the exported JSON and instructs an agent how to interpret each field + apply edits. **This is the artifact that closes the loop in the repo.**

### Assets

- [ ] Hero GIF recorded (≤8 sec, split-screen)
- [ ] All 7 gallery screenshots captured at 2x density
- [ ] Logo tile clean on white, 240×240

### Day-of

- [ ] PH submission published 12:01 AM PST
- [ ] Maker first comment posted within 30 min
- [ ] Cross-post to Twitter / Bluesky / LinkedIn
- [ ] Add badge + link to README + site
- [ ] Reply to every comment within 1 hour

---

## Risks to pre-empt in copy / FAQ

- **"Why not Marker.io / Pastel / BugHerd?"** → "We love Marker. This is for the case where you don't want a SaaS — open source, MIT, JSON-first, agent-native."
- **"Mobile?"** → "Desktop-only by design. Reviews happen on desktop."
- **"Security / RLS?"** → link `docs/cloud-mode.md` + `prompts/harden-rls.md`. Anon key only, never service-role.
- **"How does the agent know which component file maps to this selector?"** → agent greps codebase for selector / class / text snippet. Works because JSON has 4 anchor strategies. Show example in demo / first comment.
- **"What if DOM changed since review?"** → 4-strategy resolver survives class renames, text edits, structural moves. Link `docs/anchoring.md`.
- **"Fork of SitePing?"** → credit upfront, link upstream. PH community rewards honesty.

---

## Links block (for PH submission form)

- **Website:** https://feedback.ccmdesign.ca
- **GitHub:** https://github.com/ccmdesign/ccm-feedback-tool
- **Self-host docs:** https://github.com/ccmdesign/ccm-feedback-tool/blob/main/docs/self-hosting.md
- **Maker:** https://ccm.design
- **License:** MIT

---

## Post-launch follow-ups (don't do day-of)

- Write up "what we learned launching on PH" blog post for ccm.design
- Add PH badge to GitHub README + site footer
- Pull PH comment themes into GitHub issues
- Ping anyone who said "I'd love a Figma version" / "could this work for X?" — those are real signals

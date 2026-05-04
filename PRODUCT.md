# PRODUCT.md — CCM Feedback

## Register
brand

## Product Purpose
CCM Feedback is a single-script-tag feedback widget for visual website reviews. A reviewer drops a `<script>` on any page, clicks a floating action button, pins comments on any element, and exports a JSON file to hand off to a developer. No accounts, no backend required.

The one-pager is a **demo page**: visitors land, immediately see the FAB live on the page itself, and try the tool in 10 seconds. The page IS the playground.

## Users
- **Designers and PMs** doing async website reviews who want to point at things instead of writing "the third button on the second card"
- **Developers** receiving the JSON output and acting on it
- **Agents (Claude / Cursor / Copilot)** that install the widget into a project on behalf of the developer — hence the "give this to your agent" section

## Brand voice
- Built by **CCM Design** — a design studio that values craft and directness
- Tone: confident, plainspoken, slightly dry. No SaaS-speak, no exclamation points, no "powerful" or "seamless"
- Demo posture: "here it is, try it, you'll get it in five seconds"

## Strategic principles
1. **Page = playground.** The demo page must run the widget itself. The proof is that you can pin a comment on the headline you're reading.
2. **Show the FAB, don't explain it.** Hand-drawn arrow points reviewer to the bottom-right corner. No "click the button below" copy.
3. **Agent-native.** Developers don't install widgets by hand anymore — they paste a prompt to their coding agent. Make that prompt the centerpiece, copyable in one click.
4. **CCM Design attribution.** Page closes with a clear "built by CCM Design — streamlining website reviews" line and a link to ccm.design.

## Anti-references
- Generic SaaS landing pages with hero illustration + "trusted by" logo strip + 3-feature card grid
- Gradient hero text
- "Powered by AI" badges
- Card-of-cards layouts
- Dark dashboard mockups in the hero (we are not a dashboard)

## Constraints
- Existing brand accent: `#0066ff` (configurable on the widget, but this is the demo's chosen accent)
- Widget script lives at `https://ccm-feedback-582.netlify.app/w.js`
- Page must work without JS for the static content; the widget enhancement is JS-dependent
- Mobile (<768px): widget is hidden by design; the page itself must still read well

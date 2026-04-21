/**
 * CCM-290 — shared CORS allowlist reader for the three agent routes.
 *
 * The agent API is server-to-server by default (no CORS headers at all).
 * Setting `CCM_AGENT_ALLOWED_ORIGINS` (comma-separated) opts the handler into
 * strict origin-reflection mode; unknown origins still get no headers.
 *
 * Kept separate from the widget-facing `CCM_FEEDBACK_ALLOWED_ORIGINS` because
 * the threat models differ: widget routes expect many browser origins, agent
 * routes typically expect zero (curl / server-to-server).
 */
export function readAgentAllowedOrigins(): string[] | undefined {
  const raw = process.env.CCM_AGENT_ALLOWED_ORIGINS;
  if (!raw) return undefined;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

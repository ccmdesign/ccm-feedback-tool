/**
 * Admin email allowlist.
 *
 * Values are lowercased, trimmed. Default hard-coded list is a single email;
 * `CCM_ADMIN_ALLOWLIST` env var (comma-separated) overrides it.
 */

const DEFAULT_ALLOWLIST = ["dev@ccmdesign.ca"];

export function parseAllowlist(env: string | undefined | null): string[] {
  if (!env) return DEFAULT_ALLOWLIST;
  const tokens = env
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return tokens.length > 0 ? tokens : DEFAULT_ALLOWLIST;
}

export function isAllowedAdminEmail(email: string | null | undefined, envOverride?: string): boolean {
  if (!email) return false;
  const list = parseAllowlist(envOverride ?? process.env.CCM_ADMIN_ALLOWLIST);
  return list.includes(email.trim().toLowerCase());
}

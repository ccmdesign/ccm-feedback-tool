import { NextResponse } from "next/server";
import { isAllowedAdminEmail } from "@/lib/supabase/allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth/magic-link callback: exchanges the one-time code for a session
 * cookie, then redirects.
 *
 * Applies the allowlist here (not just in middleware) so a non-allowlisted
 * email never gets a session cookie written to their browser.
 */
/**
 * Restrict `?next=` to same-origin admin paths so a phishing link cannot
 * bounce a just-authenticated admin to an attacker-controlled URL.
 * Rejects protocol-relative (`//evil.com`), absolute, and non-admin paths.
 */
function sanitizeNext(next: string | null): string {
  if (!next) return "/admin/projects";
  if (!next.startsWith("/")) return "/admin/projects";
  if (next.startsWith("//")) return "/admin/projects";
  if (!next.startsWith("/admin/")) return "/admin/projects";
  return next;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/admin/login?error=missing_code", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/admin/login?error=exchange_failed", request.url));
  }
  if (!isAllowedAdminEmail(data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=not_allowed", request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}

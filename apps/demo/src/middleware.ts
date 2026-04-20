import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isAllowedAdminEmail } from "./lib/supabase/allowlist";

/**
 * Admin auth guard — protects `/admin/*` and `/api/v1/admin/*`.
 *
 * Defense-in-depth: route handlers also re-check the allowlist so a
 * misconfigured matcher can never expose project secrets.
 */
export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Bypass for the login page and auth callback — both must be reachable while
  // signed out.
  if (pathname === "/admin/login" || pathname.startsWith("/admin/auth/") || pathname.startsWith("/admin/_next")) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          for (const { name, value, options } of values) {
            response.cookies.set({ name, value, ...options });
          }
        },
      },
    },
  );

  // Test bypass — only accepted when CCM_E2E_ADMIN_BYPASS=1.
  if (process.env.CCM_E2E_ADMIN_BYPASS === "1" && request.headers.get("x-ccm-e2e-bypass") === "1") {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedAdminEmail(user.email)) {
    const redirectUrl = new URL("/admin/login", request.url);
    if (user && !isAllowedAdminEmail(user.email)) {
      redirectUrl.searchParams.set("error", "not_allowed");
    }
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/v1/admin/:path*"],
};

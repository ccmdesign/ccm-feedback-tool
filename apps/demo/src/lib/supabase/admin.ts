import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client placeholder. Not used in this PR — included so future
 * features that need to bypass RLS (bulk admin operations, webhook
 * invocations, etc.) have a canonical entry point.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRole) {
    throw new Error(
      "[ccm-feedback] createSupabaseAdminClient requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

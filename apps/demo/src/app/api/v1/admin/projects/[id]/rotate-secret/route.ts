import { forgetSigningSecret, registerSigningSecret, StoreNotFoundError } from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";
import { isAllowedAdminEmail } from "@/lib/supabase/allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  // Test bypass — must match middleware: requires BOTH env var AND header.
  // Env var alone is not enough (defense against accidental prod leak).
  const bypassed = process.env.CCM_E2E_ADMIN_BYPASS === "1" && request.headers.get("x-ccm-e2e-bypass") === "1";
  if (!bypassed) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAllowedAdminEmail(user.email)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const { id } = await context.params;
  const { projectStore } = await resolveProjectStores();
  try {
    forgetSigningSecret(id);
    const { secret } = await projectStore.rotateProjectSecret(id);
    registerSigningSecret(id, secret);
    return Response.json({ secret });
  } catch (error) {
    if (error instanceof StoreNotFoundError) return Response.json({ error: "Not found" }, { status: 404 });
    throw error;
  }
}

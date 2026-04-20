import {
  forgetSigningSecret,
  registerSigningSecret,
  StoreNotFoundError,
} from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedAdminEmail } from "@/lib/supabase/allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  if (process.env.CCM_E2E_ADMIN_BYPASS !== "1") {
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

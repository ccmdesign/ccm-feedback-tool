import {
  forgetSigningSecret,
  projectUpdateSchema,
  StoreNotFoundError,
} from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedAdminEmail } from "@/lib/supabase/allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<Response | null> {
  if (process.env.CCM_E2E_ADMIN_BYPASS === "1") return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedAdminEmail(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const gate = await requireAdmin();
  if (gate) return gate;
  const { id } = await context.params;
  const { projectStore } = await resolveProjectStores();
  const project = await projectStore.getProject(id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const gate = await requireAdmin();
  if (gate) return gate;
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ errors: parsed.error.issues }, { status: 400 });
  const { projectStore } = await resolveProjectStores();
  try {
    const patch: {
      name?: string;
      stagingUrl?: string;
      implementationWebhookUrl?: string | null;
    } = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.stagingUrl !== undefined) patch.stagingUrl = parsed.data.stagingUrl;
    if (parsed.data.implementationWebhookUrl !== undefined) patch.implementationWebhookUrl = parsed.data.implementationWebhookUrl;
    await projectStore.updateProject(id, patch);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof StoreNotFoundError) return Response.json({ error: "Not found" }, { status: 404 });
    throw error;
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const gate = await requireAdmin();
  if (gate) return gate;
  const { id } = await context.params;
  const { projectStore } = await resolveProjectStores();
  try {
    await projectStore.deleteProject(id);
    forgetSigningSecret(id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof StoreNotFoundError) return Response.json({ error: "Not found" }, { status: 404 });
    throw error;
  }
}

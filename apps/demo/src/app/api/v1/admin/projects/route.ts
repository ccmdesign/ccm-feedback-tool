import { projectCreateSchema, registerSigningSecret } from "@ccm-feedback/adapter-prisma";
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

export async function GET(): Promise<Response> {
  const gate = await requireAdmin();
  if (gate) return gate;
  const { projectStore } = await resolveProjectStores();
  const projects = await projectStore.listProjects();
  return Response.json({ projects });
}

export async function POST(request: Request): Promise<Response> {
  const gate = await requireAdmin();
  if (gate) return gate;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });
  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ errors: parsed.error.issues }, { status: 400 });
  const { projectStore } = await resolveProjectStores();
  const created = await projectStore.createProject({
    name: parsed.data.name,
    stagingUrl: parsed.data.stagingUrl,
    implementationWebhookUrl: parsed.data.implementationWebhookUrl ?? null,
  });
  registerSigningSecret(created.id, created.secret);
  return Response.json({
    project: {
      id: created.id,
      name: created.name,
      stagingUrl: created.stagingUrl,
      implementationWebhookUrl: created.implementationWebhookUrl,
      createdAt: created.createdAt,
    },
    secret: created.secret,
  }, { status: 201 });
}

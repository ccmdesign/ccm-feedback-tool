import Link from "next/link";
import { resolveProjectStores } from "@/lib/ccm-stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProjectsIndexPage() {
  let projects: Awaited<ReturnType<Awaited<ReturnType<typeof resolveProjectStores>>["projectStore"]["listProjects"]>> = [];
  let error: string | null = null;
  try {
    const { projectStore } = await resolveProjectStores();
    projects = await projectStore.listProjects();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22 }}>Projects</h1>
        <Link
          href="/admin/projects/new"
          style={{
            padding: "0.5rem 0.75rem",
            background: "#0066ff",
            color: "#fff",
            borderRadius: 4,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          New project
        </Link>
      </div>
      {error && (
        <p style={{ color: "#b00020", background: "#fff4f4", padding: "0.75rem", borderRadius: 6, fontSize: 14 }}>
          {error}
        </p>
      )}
      {!error && projects.length === 0 && (
        <p style={{ color: "#666", fontSize: 14 }}>No projects yet. Create one to get started.</p>
      )}
      <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
        {projects.map((p) => (
          <li
            key={p.id}
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Link href={`/admin/projects/${p.id}`} style={{ fontWeight: 600 }}>
              {p.name}
            </Link>
            <span style={{ fontSize: 12, color: p.hasSecret ? "#009900" : "#999" }}>
              {p.hasSecret ? "secret: set" : "secret: missing"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

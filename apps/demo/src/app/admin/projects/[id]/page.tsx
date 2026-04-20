"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  stagingUrl: string;
  implementationWebhookUrl: string | null;
  hasSecret: boolean;
  createdAt: string;
};

export default function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [stagingUrl, setStagingUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "rotating" | "deleting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const resolved = (await Promise.resolve(params)) as { id: string };
      setId(resolved.id);
      const res = await fetch(`/api/v1/admin/projects/${resolved.id}`);
      if (!res.ok) {
        setError("Project not found");
        return;
      }
      const body = await res.json();
      setProject(body.project);
      setName(body.project.name);
      setStagingUrl(body.project.stagingUrl);
      setWebhookUrl(body.project.implementationWebhookUrl ?? "");
    })();
  }, [params]);

  if (!project) {
    return <p style={{ color: "#666" }}>{error ?? "Loading…"}</p>;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setStatus("saving");
    setError(null);
    const res = await fetch(`/api/v1/admin/projects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, stagingUrl, implementationWebhookUrl: webhookUrl || null }),
    });
    if (!res.ok) {
      const body = await res.json();
      setStatus("error");
      setError(body.error ?? "Save failed");
      return;
    }
    setStatus("idle");
  }

  async function rotate() {
    if (!id) return;
    setStatus("rotating");
    setError(null);
    const res = await fetch(`/api/v1/admin/projects/${id}/rotate-secret`, { method: "POST" });
    if (!res.ok) {
      setStatus("error");
      setError("Rotate failed");
      return;
    }
    const body = await res.json();
    setNewSecret(body.secret);
    setStatus("idle");
  }

  async function remove() {
    if (!id || !project) return;
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    setStatus("deleting");
    const res = await fetch(`/api/v1/admin/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/projects");
    } else {
      setStatus("error");
      setError("Delete failed");
    }
  }

  return (
    <section>
      <Link href="/admin/projects" style={{ fontSize: 13 }}>
        ← All projects
      </Link>
      <h1 style={{ fontSize: 22, marginTop: "0.5rem" }}>{project.name}</h1>
      <p style={{ fontSize: 12, color: "#666" }}>Project id: {project.id}</p>

      {newSecret && (
        <div style={{ margin: "1rem 0", padding: "0.75rem", background: "#fffbe6", borderRadius: 6 }}>
          <p style={{ fontSize: 14, margin: 0 }}>New webhook secret — save it now, it will not be shown again.</p>
          <pre
            style={{
              padding: "0.75rem",
              background: "#111",
              color: "#0f0",
              borderRadius: 6,
              overflow: "auto",
              fontSize: 13,
            }}
          >
            {newSecret}
          </pre>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(newSecret)}
            style={{
              padding: "0.35rem 0.75rem",
              background: "#0066ff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
            }}
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => setNewSecret(null)}
            style={{
              marginLeft: "0.5rem",
              padding: "0.35rem 0.75rem",
              background: "#fff",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 480 }}>
        <label style={{ fontSize: 14 }}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>
        <label style={{ fontSize: 14 }}>
          Staging URL
          <input
            value={stagingUrl}
            onChange={(e) => setStagingUrl(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>
        <label style={{ fontSize: 14 }}>
          Implementation webhook URL
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>
        {error && <p style={{ color: "#b00020", fontSize: 14 }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="submit"
            disabled={status === "saving"}
            style={{ padding: "0.5rem 0.75rem", background: "#0066ff", color: "#fff", border: "none", borderRadius: 4 }}
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={rotate}
            disabled={status === "rotating"}
            style={{
              padding: "0.5rem 0.75rem",
              background: "#fff",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          >
            {status === "rotating" ? "Rotating…" : "Rotate secret"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={status === "deleting"}
            style={{
              padding: "0.5rem 0.75rem",
              background: "#fff",
              color: "#b00020",
              border: "1px solid #b00020",
              borderRadius: 4,
            }}
          >
            {status === "deleting" ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>
    </section>
  );
}

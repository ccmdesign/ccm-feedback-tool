"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [stagingUrl, setStagingUrl] = useState("");
  const [implementationWebhookUrl, setImplementationWebhookUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          stagingUrl,
          implementationWebhookUrl: implementationWebhookUrl || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(body.error ?? body.errors?.[0]?.message ?? "Create failed");
        return;
      }
      setSecret(body.secret);
      setProjectId(body.project.id);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (status === "success" && secret && projectId) {
    return (
      <section>
        <h1 style={{ fontSize: 22 }}>Project created</h1>
        <p style={{ background: "#fffbe6", padding: "0.75rem", borderRadius: 6, fontSize: 14 }}>
          Save this webhook secret — it will not be shown again.
        </p>
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
          {secret}
        </pre>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(secret)}
          style={{
            padding: "0.5rem 0.75rem",
            background: "#0066ff",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Copy secret
        </button>
        <div style={{ marginTop: "1rem" }}>
          <Link href={`/admin/projects/${projectId}`}>Continue to project settings →</Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1 style={{ fontSize: 22 }}>New project</h1>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 480 }}>
        <label style={{ fontSize: 14 }}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>
        <label style={{ fontSize: 14 }}>
          Staging URL
          <input
            value={stagingUrl}
            onChange={(e) => setStagingUrl(e.target.value)}
            placeholder="https://staging.example.com"
            style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>
        <label style={{ fontSize: 14 }}>
          Implementation webhook URL
          <input
            value={implementationWebhookUrl}
            onChange={(e) => setImplementationWebhookUrl(e.target.value)}
            placeholder="https://agent.example.com/webhook"
            style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>
        {error && <p style={{ color: "#b00020", fontSize: 14 }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="submit"
            disabled={status === "submitting"}
            style={{
              padding: "0.5rem 0.75rem",
              background: "#0066ff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: status === "submitting" ? "wait" : "pointer",
            }}
          >
            {status === "submitting" ? "Creating…" : "Create project"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/projects")}
            style={{
              padding: "0.5rem 0.75rem",
              background: "#fff",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

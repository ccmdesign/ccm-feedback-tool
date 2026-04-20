"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AdminLoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const resolved = await Promise.resolve(searchParams);
      setInitialError(resolved?.error);
    })();
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/admin/auth/callback` },
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("sent");
      setMessage("Check your inbox for the magic link.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1.5rem", maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: "1rem" }}>Sign in to CCM Feedback admin</h1>
      {initialError === "not_allowed" && (
        <p style={{ background: "#fff4f4", padding: "0.75rem", borderRadius: 6, fontSize: 14 }}>
          Your email is not on the admin allowlist. Contact an existing admin to be added.
        </p>
      )}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label htmlFor="email" style={{ fontSize: 14 }}>
          Email
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              display: "block",
              marginTop: "0.25rem",
              width: "100%",
              padding: "0.5rem",
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
        </label>
        <button
          type="submit"
          disabled={status === "sending"}
          style={{
            padding: "0.5rem 1rem",
            background: "#0066ff",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: status === "sending" ? "wait" : "pointer",
          }}
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>
        {message && <p style={{ fontSize: 14, color: status === "error" ? "#b00020" : "#006600" }}>{message}</p>}
      </form>
    </div>
  );
}

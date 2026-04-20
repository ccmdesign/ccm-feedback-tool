import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Admin — CCM Feedback",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#fafafa" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #e5e5e5",
          background: "#fff",
        }}
      >
        <strong style={{ fontSize: 16 }}>CCM Feedback · admin</strong>
        <nav style={{ display: "flex", gap: "1rem", fontSize: 14 }}>
          <Link href="/admin/projects">Projects</Link>
          <form action="/admin/auth/signout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                background: "none",
                border: "none",
                color: "#0066ff",
                cursor: "pointer",
                font: "inherit",
                padding: 0,
              }}
            >
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main style={{ padding: "2rem 1.5rem", maxWidth: 960, margin: "0 auto" }}>{children}</main>
    </div>
  );
}

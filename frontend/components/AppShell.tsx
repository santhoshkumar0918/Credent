"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "var(--vc-bg)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #7C3AED, #38BDF8)",
            margin: "0 auto 1rem", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.2rem", fontWeight: 700, color: "#fff",
            fontFamily: "var(--font-heading)",
          }}>V</div>
          <div className="skeleton" style={{ width: 120, height: 8, borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content fade-in">{children}</main>
    </div>
  );
}

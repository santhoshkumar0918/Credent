"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

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
          <img src="/logo.jpeg" alt="Credent" width={40} height={40}
            style={{ borderRadius: 12, margin: "0 auto 1rem", display: "block" }} />
          <div className="skeleton" style={{ width: 120, height: 8, borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content fade-in">{children}</main>
      <MobileNav />
    </div>
  );
}

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
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #0E6B3E, #054F2E)",
            margin: "0 auto 1rem", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.2rem", fontWeight: 500, color: "#FFFDF7",
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
      <MobileNav />
    </div>
  );
}

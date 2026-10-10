"use client";

import { useEffect, useState } from "react";
import { fetchSystemHealth } from "@/lib/api-client";

interface HealthData {
  status: string;
  chain: string;
  latestBlock: string;
  indexerLagBlocks: number;
  services: Record<string, { status: "online" | "offline"; latencyMs: number }>;
}

export function SystemHealthBadge() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await fetchSystemHealth();
        setHealth(data);
        setUnknown(false);
      } catch {
        // Honest unknown: the API is unreachable, so any "healthy"
        // payload would be fabricated. Show that instead.
        setHealth(null);
        setUnknown(true);
      } finally {
        setLoading(false);
      }
    }

    loadHealth();
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>
        <span className="live-dot" />
        <span>Checking system health…</span>
      </div>
    );
  }

  if (unknown || !health) {
    return (
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.6rem",
          padding: "0.35rem 0.75rem", borderRadius: "999px",
          background: "var(--vc-surface-2)", border: "1px solid var(--vc-border-strong)",
          fontSize: "0.75rem", fontFamily: "var(--font-mono)",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--vc-text-muted)" }} />
        <span style={{ color: "var(--vc-text-secondary)", fontWeight: 600 }}>API unreachable — status unknown</span>
      </div>
    );
  }

  const allOnline = Object.values(health.services).every((s) => s.status === "online");

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.35rem 0.75rem",
        borderRadius: "999px",
        background: allOnline ? "var(--vc-success-dim)" : "var(--vc-warning-dim)",
        border: "1px solid var(--vc-border-strong)",
        fontSize: "0.75rem",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: allOnline ? "var(--vc-success)" : "var(--vc-warning)",
        }}
      />
      <span style={{ color: allOnline ? "var(--vc-success)" : "var(--vc-warning)", fontWeight: 600 }}>
        {allOnline ? "All Systems Operational" : "Degraded Service"}
      </span>
      <span style={{ color: "var(--vc-text-muted)" }}>• Block #{health.latestBlock}</span>
    </div>
  );
}

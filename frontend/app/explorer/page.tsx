"use client";

import { MOCK_ATTESTERS } from "@/lib/mock-data";
import { useState } from "react";

const ATTESTER_TYPE_LABEL: Record<string, string> = {
  PLATFORM: "Platform",
  INSTITUTION: "Institution",
  INDIVIDUAL: "Individual",
  LENDER: "Lender",
};

function ReputationBar({ score }: { score: number }) {
  const color =
    score >= 90 ? "var(--vc-success)"
    : score >= 70 ? "var(--vc-warning)"
    : "var(--vc-danger)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div className="progress-track" style={{ flex: 1, height: 4 }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 999, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color, minWidth: 28 }}>{score}</span>
    </div>
  );
}

export default function ExplorerPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const types = ["ALL", "PLATFORM", "INSTITUTION", "INDIVIDUAL"];

  const filtered = MOCK_ATTESTERS.filter((a) => {
    const matchType = filter === "ALL" || a.type === filter;
    const matchSearch =
      search === "" ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.address.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div className="live-dot" />
          <h1 style={{ fontSize: "1.6rem" }}>Public attester explorer</h1>
        </div>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          World-readable — no login required. Every attester's stake, reputation and dispute history.
        </p>
      </div>

      <div className="page-body">
        {/* Stats summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Active attesters", value: MOCK_ATTESTERS.filter((a) => a.active).length },
            { label: "Total attestations", value: MOCK_ATTESTERS.reduce((s, a) => s + a.attestations, 0).toLocaleString() },
            { label: "Challenges lost", value: MOCK_ATTESTERS.reduce((s, a) => s + a.challengesLost, 0) },
            { label: "Total bonded", value: `${MOCK_ATTESTERS.length * 50} MON` },
          ].map((s) => (
            <div key={s.label} className="card stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter + search */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <input
            className="input-field"
            placeholder="Search by name or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 260 }}
            id="explorer-search"
          />
          <div className="tabs" style={{ margin: 0, borderBottom: "none", gap: "0.25rem" }}>
            {types.map((t) => (
              <button
                key={t}
                className={`tab-item${filter === t ? " active" : ""}`}
                onClick={() => setFilter(t)}
                id={`filter-${t}`}
                style={{ borderBottom: "none", padding: "0.45rem 0.85rem", borderRadius: "var(--radius-sm)" }}
              >
                {t === "ALL" ? "All" : ATTESTER_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="vc-table">
              <thead>
                <tr>
                  <th>Attester</th>
                  <th>Type</th>
                  <th>Bond</th>
                  <th>Reputation</th>
                  <th>Tier mix</th>
                  <th>Attestations</th>
                  <th>Challenges lost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.address}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--vc-text-primary)" }}>
                        {a.name}
                      </div>
                      <code className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)" }}>
                        {a.address}
                      </code>
                    </td>
                    <td>
                      <span className="badge badge-tier1" style={{ fontSize: "0.7rem" }}>
                        {ATTESTER_TYPE_LABEL[a.type]}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "var(--vc-text-primary)" }}>{a.bond}</strong>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <ReputationBar score={a.reputation} />
                    </td>
                    <td>
                      <span className={`badge badge-tier${a.tier}`}>Tier {a.tier}</span>
                    </td>
                    <td>
                      <strong>{a.attestations.toLocaleString()}</strong>
                    </td>
                    <td>
                      <span style={{
                        color: a.challengesLost > 0 ? "var(--vc-danger)" : "var(--vc-success)",
                        fontWeight: 700,
                      }}>
                        {a.challengesLost}
                      </span>
                    </td>
                    <td>
                      {a.active ? (
                        <span className="badge badge-active">Active</span>
                      ) : (
                        <span className="badge badge-slashed">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

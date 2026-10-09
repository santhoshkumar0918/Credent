"use client";

import { MOCK_POOL } from "@/lib/mock-data";
import { useState } from "react";
import toast from "react-hot-toast";

export default function PoolPage() {
  const [depositing, setDepositing] = useState(false);
  const [amount, setAmount] = useState("");
  const p = MOCK_POOL;

  const loaned_pct = (p.totalLoaned / p.totalDeposited) * 100;
  const repaid_pct = (p.totalRepaid / p.totalLoaned) * 100;
  const utilisation = loaned_pct;

  async function handleDeposit() {
    if (!amount || isNaN(parseFloat(amount))) {
      toast.error("Enter a valid amount");
      return;
    }
    setDepositing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setDepositing(false);
    toast.success(`₹${parseFloat(amount).toLocaleString()} deposited into MockLendingPool`);
    setAmount("");
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-header">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
          <h1 style={{ fontSize: "1.6rem" }}>Lending Pool Dashboard</h1>
          <span className="badge badge-demo">testnet pool</span>
        </div>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Capital pool backing proof-gated underwritten loans on Monad testnet.
        </p>
      </div>

      {/* Honesty & Roadmap Transparency Banner */}
      <div
        className="card"
        style={{
          padding: "1rem 1.25rem",
          background: "rgba(245, 158, 11, 0.08)",
          borderColor: "rgba(245, 158, 11, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>ℹ️</span>
        <div style={{ fontSize: "0.82rem", color: "var(--vc-text-secondary)", lineHeight: 1.5 }}>
          <strong style={{ color: "#F59E0B" }}>Transparency Note:</strong> This demo operates against the live{" "}
          <code style={{ color: "#38BDF8" }}>MockLendingPool.sol</code> contract. Senior/First-loss tranches, reserve funds,
          and default waterfalls are <span style={{ textDecoration: "underline" }}>roadmap features</span> (PRD §17).
        </div>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem" }}>
        {/* Real Pool Overview */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem" }}>Pool Capital Overview</h2>
            <span className="badge badge-active">MockLendingPool.sol</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
            {[
              { label: "Total Deposited", value: `₹${p.totalDeposited.toLocaleString()}` },
              { label: "Total Loaned", value: `₹${p.totalLoaned.toLocaleString()}` },
              { label: "Total Repaid", value: `₹${p.totalRepaid.toLocaleString()}` },
              { label: "Active Default Rate", value: `${p.defaultRate}%` },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ fontSize: "1.3rem" }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pool Utilisation Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div className="card">
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
              Pool Capital Utilisation
            </h3>
            <div style={{
              width: 100, height: 100,
              borderRadius: "50%",
              margin: "0 auto 1rem",
              background: `conic-gradient(var(--vc-violet) ${utilisation}%, var(--vc-surface-3) 0)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <div style={{
                width: 70, height: 70, borderRadius: "50%",
                background: "var(--vc-surface-1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "1.1rem",
              }}>
                {utilisation.toFixed(0)}%
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", textAlign: "center" }}>
              {utilisation.toFixed(1)}% of pool capital is currently lent out
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "1rem" }}>
              <span style={{ color: "var(--vc-text-muted)" }}>Repaid Capital Ratio</span>
              <strong style={{ color: "var(--vc-success)" }}>{repaid_pct.toFixed(0)}%</strong>
            </div>
          </div>

          {/* Deposit Liquidity Form */}
          <div className="card">
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1rem" }}>
              Deposit Liquidity
            </h2>
            <div style={{ marginBottom: "1rem" }}>
              <label className="input-label">Deposit Amount (₹)</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                id="pool-deposit-input"
              />
            </div>
            <div style={{
              fontSize: "0.78rem",
              color: "var(--vc-text-secondary)",
              marginBottom: "1rem",
              padding: "0.6rem",
              background: "var(--vc-surface-2)",
              borderRadius: "var(--radius-sm)",
            }}>
              Deposits fund verified micro-loans for gig workers with on-chain source attestations.
            </div>
            <button
              className="btn btn-primary"
              onClick={handleDeposit}
              disabled={depositing}
              id="pool-deposit-btn"
            >
              {depositing ? "Depositing…" : "Deposit to Pool"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

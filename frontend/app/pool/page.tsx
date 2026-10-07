"use client";

import { MOCK_POOL } from "@/lib/mock-data";
import { useState } from "react";
import toast from "react-hot-toast";

function TrancheBar({
  label, amount, total, color, apy,
}: { label: string; amount: number; total: number; color: string; apy: number }) {
  const pct = (amount / total) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <span style={{ fontSize: "0.82rem", color: "var(--vc-text-secondary)" }}>{label}</span>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>
            ₹{amount.toLocaleString()}
          </span>
          <span style={{ fontSize: "0.78rem", color, fontWeight: 600 }}>
            {apy}% APY
          </span>
        </div>
      </div>
      <div className="progress-track" style={{ height: 8 }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 999,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

export default function PoolPage() {
  const [depositing, setDepositing] = useState(false);
  const [tranche, setTranche] = useState<"senior" | "first-loss">("senior");
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
    await new Promise((r) => setTimeout(r, 1600));
    setDepositing(false);
    toast.success(`₹${parseFloat(amount).toLocaleString()} deposited into ${tranche} tranche`);
    setAmount("");
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>Pool dashboard</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Senior and first-loss tranches — whose money is being lent and how it's protected.
        </p>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem" }}>
        {/* Tranche overview */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem" }}>Tranche balances</h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span className="badge badge-demo">demo stablecoin</span>
              <span className="badge badge-demo">testnet only</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
            <TrancheBar
              label="Senior tranche (safer, lower yield)"
              amount={p.seniorTranche}
              total={p.totalDeposited}
              color="var(--vc-info)"
              apy={p.apy.senior}
            />
            <TrancheBar
              label="First-loss tranche (absorbs early defaults, higher yield)"
              amount={p.firstLossTranche}
              total={p.totalDeposited}
              color="var(--vc-violet-light)"
              apy={p.apy.firstLoss}
            />
          </div>
          <div className="divider" style={{ marginBottom: "1.25rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem" }}>
            {[
              { label: "Total deposited", value: `₹${p.totalDeposited.toLocaleString()}` },
              { label: "Total loaned", value: `₹${p.totalLoaned.toLocaleString()}` },
              { label: "Total repaid", value: `₹${p.totalRepaid.toLocaleString()}` },
              { label: "Reserve fund", value: `₹${p.reserveFund.toLocaleString()}` },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ fontSize: "1.3rem" }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Default rate vs breakeven */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div className="card">
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
              Default rate vs breakeven
            </h3>
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--vc-text-muted)", marginBottom: "0.4rem" }}>
                <span>Current default rate</span>
                <strong style={{ color: "var(--vc-success)" }}>{p.defaultRate}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill progress-fill-success"
                  style={{ width: `${(p.defaultRate / p.breakevenDefault) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--vc-text-muted)", marginBottom: "0.4rem" }}>
                <span>Breakeven (at 20% rate)</span>
                <strong style={{ color: "var(--vc-warning)" }}>{p.breakevenDefault}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill progress-fill-warning" style={{ width: "100%" }} />
              </div>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginTop: "0.75rem", lineHeight: 1.5 }}>
              Pool breaks even when default rate &lt; {p.breakevenDefault}% (r / (1+r) at 20% interest).
              Current default rate is well below breakeven.
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
              Pool utilisation
            </h3>
            <div style={{
              width: 100, height: 100,
              borderRadius: "50%",
              margin: "0 auto 1rem",
              background: `conic-gradient(var(--vc-violet) ${utilisation}%, var(--vc-surface-3) 0)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
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
              {utilisation.toFixed(1)}% of deposited capital is currently lent out
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--vc-text-muted)" }}>Repaid so far</span>
                <strong style={{ color: "var(--vc-success)" }}>{repaid_pct.toFixed(0)}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Deposit form */}
        <div className="card" style={{ maxWidth: 480 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1.25rem" }}>
            Deposit liquidity
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button
              className={`btn ${tranche === "senior" ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => setTranche("senior")}
              id="tranche-senior-btn"
            >
              Senior ({p.apy.senior}% APY)
            </button>
            <button
              className={`btn ${tranche === "first-loss" ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => setTranche("first-loss")}
              id="tranche-firstloss-btn"
            >
              First-loss ({p.apy.firstLoss}% APY)
            </button>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="input-label">Amount (₹)</label>
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
            {tranche === "senior"
              ? "Senior tranche: safer. Losses hit the reserve fund and first-loss tranche first."
              : "First-loss tranche: absorbs early defaults. Higher yield, higher risk."}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleDeposit}
            disabled={depositing}
            id="pool-deposit-btn"
          >
            {depositing ? "Depositing…" : "Deposit"}
          </button>
          <span className="badge badge-demo" style={{ marginLeft: "0.75rem" }}>demo stablecoin</span>
        </div>

        {/* Loss waterfall */}
        <div className="card" style={{ background: "transparent" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
            Loss waterfall
          </h2>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {[
              { label: "1st — Reserve fund", desc: `₹${p.reserveFund.toLocaleString()} absorbs first`, color: "var(--vc-success)" },
              { label: "2nd — First-loss tranche", desc: "Risk-seeking capital next", color: "var(--vc-warning)" },
              { label: "3rd — Senior tranche", desc: "Only if defaults are extreme", color: "var(--vc-danger)" },
            ].map((item, i) => (
              <div key={i} style={{
                flex: "1 1 180px",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${item.color}44`,
                background: `${item.color}0A`,
              }}>
                <div style={{ fontWeight: 700, color: item.color, fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

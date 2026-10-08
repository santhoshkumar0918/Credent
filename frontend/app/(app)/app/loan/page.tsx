"use client";

import { MOCK_LOAN } from "@/lib/mock-data";
import { useState } from "react";
import toast from "react-hot-toast";

function LimitBar({ current, next }: { current: number; next: number }) {
  const pct = (current / next) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--vc-text-muted)", marginBottom: "0.5rem" }}>
        <span>Current limit</span>
        <span>Next tier</span>
      </div>
      <div className="progress-track" style={{ height: 10 }}>
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--vc-violet), var(--vc-info))",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 700, marginTop: "0.4rem" }}>
        <span style={{ color: "var(--vc-violet-light)" }}>₹{current.toLocaleString()}</span>
        <span style={{ color: "var(--vc-text-muted)" }}>₹{next.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function LoanPage() {
  const [showRequest, setShowRequest] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requesting, setRequesting] = useState(false);
  const loan = MOCK_LOAN;

  const cyclesLeft = loan.cyclesForNextTier - loan.cyclesCompleted;

  async function handleRequest() {
    const amt = parseFloat(requestAmount);
    if (isNaN(amt) || amt <= 0 || amt > loan.currentLimit) {
      toast.error(`Amount must be between ₹1 and ₹${loan.currentLimit}`);
      return;
    }
    setRequesting(true);
    await new Promise((r) => setTimeout(r, 1800));
    setRequesting(false);
    setShowRequest(false);
    toast.success(`Loan of ₹${amt.toLocaleString()} originated — repayment auto-deducted from payouts`);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>My Loan</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Your credit ladder grows with every clean repayment cycle.
        </p>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem", maxWidth: 680 }}>
        {/* Limit card */}
        <div className="card gradient-border" style={{ padding: "1.75rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            Credit ladder
          </div>
          <LimitBar current={loan.currentLimit} next={loan.nextLimit} />
          <p style={{ fontSize: "0.82rem", color: "var(--vc-text-secondary)", marginTop: "0.75rem" }}>
            Complete <strong style={{ color: "var(--vc-text-primary)" }}>{cyclesLeft} more clean cycle{cyclesLeft !== 1 ? "s" : ""}</strong> to unlock ₹{loan.nextLimit.toLocaleString()}
          </p>
        </div>

        {/* Active loan */}
        {loan.activeLoan && (
          <div className="card">
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1.25rem" }}>
              Active loan
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div className="stat-card">
                <div className="stat-value">{loan.currency}{loan.activeLoan.amount.toLocaleString()}</div>
                <div className="stat-label">Borrowed</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{loan.currency}{loan.activeLoan.outstanding.toLocaleString()}</div>
                <div className="stat-label">Outstanding</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{loan.repaymentShare}%</div>
                <div className="stat-label">Repayment share</div>
              </div>
            </div>
            <div style={{
              padding: "0.85rem 1rem",
              background: "var(--vc-surface-2)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              color: "var(--vc-text-secondary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span>Next repayment: <strong style={{ color: "var(--vc-text-primary)" }}>{loan.activeLoan.nextRepayment}</strong></span>
              <span style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)" }}>Due {loan.activeLoan.nextDate}</span>
            </div>
            <div style={{
              marginTop: "0.75rem",
              padding: "0.6rem 0.85rem",
              background: "var(--vc-success-dim)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.8rem",
              color: "var(--vc-success)",
            }}>
              ✓ Repayment auto-deducted from your payout — you don't need to do anything
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="card">
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "0.75rem" }}>
            Why this limit?
          </h2>
          <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
            {loan.explanation}
          </p>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className="badge badge-demo">demo stablecoin</span>
            <span className="badge badge-demo">open reference score (recomputable)</span>
          </div>
        </div>

        {/* Request loan */}
        {!loan.activeLoan || (
          <div className="card">
            <button
              className="btn btn-primary"
              onClick={() => setShowRequest(true)}
              id="request-loan-btn"
            >
              Request new loan
            </button>
          </div>
        )}

        {/* How repayment works */}
        <div className="card" style={{ background: "transparent", border: "1px solid var(--vc-border)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
            How repayment works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              "Your gig platform pays out.",
              `${loan.repaymentShare}% is automatically routed to the pool before reaching you.`,
              "The rest lands in your wallet.",
              "A LOAN_REPAYMENT attestation is written — your limit goes up.",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(124,58,237,0.15)",
                  color: "var(--vc-violet-light)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: "0.875rem", color: "var(--vc-text-secondary)", paddingTop: "0.15rem" }}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Request modal */}
      {showRequest && (
        <div className="modal-backdrop" onClick={() => setShowRequest(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", marginBottom: "1rem" }}>
              Request a loan
            </h2>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Your current limit is <strong style={{ color: "var(--vc-text-primary)" }}>₹{loan.currentLimit.toLocaleString()}</strong>.
              {" "}{loan.repaymentShare}% of each payout will automatically repay this loan.
            </p>
            <label className="input-label">Amount (₹)</label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g. 2000"
              max={loan.currentLimit}
              min={100}
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              id="loan-amount-input"
            />
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                className="btn btn-primary"
                onClick={handleRequest}
                disabled={requesting}
                id="loan-request-confirm"
              >
                {requesting ? "Processing…" : "Originate loan"}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowRequest(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

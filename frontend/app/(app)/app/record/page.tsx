"use client";

import { MOCK_ATTESTATIONS, MOCK_CONSENTS, MOCK_SCORE } from "@/lib/mock-data";
import { useState } from "react";
import toast from "react-hot-toast";

const EVENT_LABELS: Record<string, string> = {
  GIG_PAYOUT: "Gig payout",
  RENT: "Rent",
  BNPL_INSTALLMENT: "BNPL installment",
  P2P_LOAN_REPAYMENT: "P2P loan repayment",
  UTILITY_BILL: "Utility bill",
  LOAN_REPAYMENT: "Loan repayment",
};

const OUTCOME_CONFIG: Record<string, { dot: string; label: string; text: string }> = {
  ON_TIME:  { dot: "timeline-dot-success", label: "On time",  text: "✓ On time"  },
  LATE:     { dot: "timeline-dot-warning", label: "Late",     text: "⚠ Late"     },
  MISSED:   { dot: "timeline-dot-danger",  label: "Missed",   text: "✗ Missed"   },
  DEFAULTED:{ dot: "timeline-dot-danger",  label: "Defaulted",text: "✗ Defaulted"},
};

function TierBadge({ tier }: { tier: number }) {
  return (
    <span className={`badge badge-tier${tier}`}>Tier {tier}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "badge-active", CHALLENGED: "badge-challenged",
    SLASHED: "badge-slashed", DISPUTED_BY_SUBJECT: "badge-disputed",
  };
  return <span className={`badge ${map[status] ?? "badge-active"}`}>{status}</span>;
}

function HonestLabel({ children }: { children: React.ReactNode }) {
  return <span className="badge badge-demo" style={{ fontSize: "0.7rem" }}>{children}</span>;
}

function RevokeModal({
  consent,
  onClose,
}: {
  consent: (typeof MOCK_CONSENTS)[0];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast.success(`Access revoked for ${consent.viewer}`);
    setLoading(false);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", marginBottom: "1rem" }}>
          Revoke access
        </h2>
        <p style={{ color: "var(--vc-text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Revoking will stop <strong style={{ color: "var(--vc-text-primary)" }}>{consent.viewer}</strong> from
          accessing your record immediately. Any disclosures already made before revocation are
          unaffected — they relied on already-released evidence.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-danger" disabled={loading} onClick={handleRevoke} id="revoke-confirm-btn">
            {loading ? "Revoking…" : "Confirm revoke"}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function MyRecordPage() {
  const [showHex, setShowHex] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<(typeof MOCK_CONSENTS)[0] | null>(null);

  const onTimeCount = MOCK_ATTESTATIONS.filter(
    (a) => a.outcome === "ON_TIME"
  ).length;
  const total = MOCK_ATTESTATIONS.length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>My Record</h1>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
              {onTimeCount} of {total} payments confirmed on time · 2 independent attesters
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <HonestLabel>interim signed disclosure</HonestLabel>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem" }}>
        {/* Score card */}
        <div className="card gradient-border" style={{ padding: "1.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Open reference score
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "3rem", fontWeight: 700, lineHeight: 1, color: "var(--vc-violet-light)" }}>
                {MOCK_SCORE.score}
              </div>
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {MOCK_SCORE.reasons.map((r) => (
                  <span key={r} style={{ fontSize: "0.78rem", color: "var(--vc-text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <span style={{ color: "var(--vc-success)" }}>✓</span> {r}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)", marginBottom: "0.4rem" }}>On-time rate</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 700, color: "var(--vc-success)" }}>
                {MOCK_SCORE.onTimeRate}%
              </div>
              <div className="progress-track" style={{ marginTop: "0.5rem", width: 120 }}>
                <div
                  className="progress-fill progress-fill-success"
                  style={{ width: `${MOCK_SCORE.onTimeRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Payments", value: MOCK_SCORE.attestationCount },
            { label: "Attesters", value: MOCK_SCORE.attesterDiversity },
            { label: "Days on record", value: MOCK_SCORE.tenureDays },
            { label: "Disputes", value: MOCK_SCORE.disputeCount },
          ].map((s) => (
            <div key={s.label} className="card stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Payment timeline */}
        <div className="card">
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1.25rem" }}>
            Payment history
          </h2>
          <div className="timeline">
            {MOCK_ATTESTATIONS.map((a) => {
              const oc = OUTCOME_CONFIG[a.outcome] ?? OUTCOME_CONFIG.ON_TIME;
              return (
                <div key={a.id} className="timeline-item">
                  <div className={`timeline-dot ${oc.dot}`} style={{ fontSize: "0.6rem" }}>
                    {a.outcome === "ON_TIME" ? "✓" : a.outcome === "LATE" ? "⚠" : "✗"}
                  </div>
                  <div className="timeline-content">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {EVENT_LABELS[a.eventType] ?? a.eventType} — {a.amount}
                      </strong>
                      <span style={{
                        fontSize: "0.78rem",
                        color: a.outcome === "ON_TIME" ? "var(--vc-success)" : a.outcome === "LATE" ? "var(--vc-warning)" : "var(--vc-danger)",
                      }}>
                        {oc.text}
                      </span>
                      <TierBadge tier={a.tier} />
                      <StatusBadge status={a.status} />
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)" }}>
                      {a.platform} · {a.date}
                    </div>
                    {showHex === a.id ? (
                      <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "var(--vc-surface-2)", borderRadius: 6 }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.2rem" }}>
                          commitmentHash (on-chain — not plaintext)
                        </div>
                        <code className="mono" style={{ fontSize: "0.8rem", color: "var(--vc-text-secondary)" }}>
                          {a.commitmentHash}
                        </code>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ marginLeft: "0.5rem" }}
                          onClick={() => setShowHex(null)}
                        >
                          hide
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: "0.3rem", padding: "0.1rem 0", fontSize: "0.75rem" }}
                        onClick={() => setShowHex(a.id)}
                      >
                        Show commitment hash →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active consents */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem" }}>
              Active access grants
            </h2>
            <span style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)" }}>
              {MOCK_CONSENTS.length} active
            </span>
          </div>
          {MOCK_CONSENTS.length === 0 ? (
            <p style={{ color: "var(--vc-text-muted)", fontSize: "0.875rem" }}>
              No one has access to your record right now.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {MOCK_CONSENTS.map((c) => (
                <div key={c.id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1rem",
                  background: "var(--vc-surface-2)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--vc-border)",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                      {c.viewer}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)" }}>
                      {c.scopeTags.join(", ")} · Expires {c.expiry}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setRevoking(c)}
                    id={`revoke-btn-${c.id}`}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {revoking && (
        <RevokeModal consent={revoking} onClose={() => setRevoking(null)} />
      )}
    </div>
  );
}

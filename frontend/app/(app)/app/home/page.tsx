"use client";

import Link from "next/link";
import { MOCK_ATTESTATIONS, MOCK_CONSENTS, MOCK_LOAN } from "@/lib/mock-data";

export default function BorrowerHomePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top Banner */}
      <div
        className="card"
        style={{
          padding: "1.75rem",
          background: "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(56, 189, 248, 0.05))",
          borderColor: "rgba(124, 58, 237, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="badge badge-active" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>
              Borrower Overview
            </span>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700 }}>
              Welcome back, Meena 👋
            </h1>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Your credit record is up to date with 24 verified platform payouts.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>Available Credit Limit</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 800, color: "#38BDF8" }}>
              ₹{MOCK_LOAN.currentLimit.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>Open Credit Score</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10B981", marginTop: "0.25rem" }}>765 / 900</div>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-secondary)", marginTop: "0.2rem" }}>Tier 2 Source-Verified</div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>Total Attestations</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--vc-text-primary)", marginTop: "0.25rem" }}>
            {MOCK_ATTESTATIONS.length} Verified
          </div>
          <div style={{ fontSize: "0.75rem", color: "#10B981", marginTop: "0.2rem" }}>100% On-Time Payouts</div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>Active Consents</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#38BDF8", marginTop: "0.25rem" }}>
            {MOCK_CONSENTS.length} Granted
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-secondary)", marginTop: "0.2rem" }}>Revocable Anytime</div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>Next Credit Ladder Step</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#7C3AED", marginTop: "0.25rem" }}>
            ₹{MOCK_LOAN.nextLimit.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-secondary)", marginTop: "0.2rem" }}>In 3 Repayment Cycles</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        {/* Recent Events */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Recent Attestations</h2>
            <Link href="/app/record" style={{ fontSize: "0.82rem", color: "#38BDF8" }}>
              View All →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {MOCK_ATTESTATIONS.slice(0, 4).map((att) => (
              <div
                key={att.id}
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--vc-surface-2)",
                  border: "1px solid var(--vc-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{att.platform}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)" }}>{att.eventType} • {att.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{att.amount}</div>
                  <span className="badge badge-active" style={{ fontSize: "0.65rem" }}>
                    {att.outcome} (T{att.tier})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Quick Actions</h2>

          <Link href="/app/consent" className="btn btn-primary btn-md" style={{ justifyContent: "center" }}>
            🔒 Grant Consent to Lender
          </Link>

          <Link href="/app/loan" className="btn btn-outline btn-md" style={{ justifyContent: "center" }}>
            💳 View Loan Offers & Ladder
          </Link>

          <Link href="/app/record" className="btn btn-ghost btn-md" style={{ justifyContent: "center" }}>
            📋 Inspect Proof Hashes
          </Link>
        </div>
      </div>
    </div>
  );
}

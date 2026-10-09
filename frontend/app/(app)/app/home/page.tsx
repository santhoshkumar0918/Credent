"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MOCK_ATTESTATIONS, MOCK_CONSENTS, MOCK_LOAN } from "@/lib/mock-data";
import { fetchSubjectScore } from "@/lib/api-client";
import { SystemHealthBadge } from "@/components/SystemHealthBadge";

export default function BorrowerHomePage() {
  const [lang, setLang] = useState<"en" | "ta" | "hi">("en");
  const [scoreData, setScoreData] = useState<{
    score: number;
    maxScore: number;
    recommendedLimitINR: number;
    decision: string;
    reasons: string[];
    explanations?: { en: string[]; ta: string[]; hi: string[] };
  }>({
    score: 765,
    maxScore: 900,
    recommendedLimitINR: 15000,
    decision: "APPROVED",
    reasons: ["24 consecutive on-time gig platform payouts verified."],
    explanations: {
      en: ["24 consecutive on-time gig platform payouts verified."],
      ta: ["24 தொடர்ச்சியான நேரடி மேடை கொடுப்பனவுகள் உறுதி செய்யப்பட்டன."],
      hi: ["24 लगातार समय पर गिग प्लेटफॉर्म भुगतान सत्यापित।"],
    },
  });

  useEffect(() => {
    async function loadScore() {
      try {
        const res = await fetchSubjectScore("0x5f2e...b1", lang);
        setScoreData({
          score: res.score,
          maxScore: res.maxScore || 900,
          recommendedLimitINR: res.recommendedLimitINR || 15000,
          decision: res.decision || "APPROVED",
          reasons: res.reasons || [],
          explanations: res.explanations,
        });
      } catch {
        // Fallback to local default
      }
    }

    loadScore();
  }, [lang]);

  const activeReasons =
    scoreData.explanations?.[lang] || scoreData.reasons || ["24 consecutive on-time gig platform payouts verified."];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* System Health Badge Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <SystemHealthBadge />
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>Explainer Language:</span>
          {(["en", "ta", "hi"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`btn btn-xs ${lang === l ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "0.2rem 0.55rem", fontSize: "0.72rem" }}
            >
              {l === "en" ? "🇬🇧 English" : l === "ta" ? "🇮🇳 Tanglish" : "🇮🇳 Hindi"}
            </button>
          ))}
        </div>
      </div>

      {/* Top Banner */}
      <div
        className="card"
        style={{
          padding: "1.75rem",
          background: "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(56, 189, 248, 0.05))",
          borderColor: "rgba(124, 58, 237, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
              <span className="badge badge-active" style={{ fontSize: "0.75rem" }}>
                Borrower Overview
              </span>
              <span className="badge badge-demo" style={{ fontSize: "0.68rem" }}>
                Platform integration service (bonded)
              </span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700 }}>
              Welcome back, Meena 👋
            </h1>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Your credit record is up to date with 24 verified platform payouts.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>Calculated Loan Limit</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 800, color: "#38BDF8" }}>
              ₹{scoreData.recommendedLimitINR.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--vc-text-muted)", marginTop: "0.1rem" }}>
              Repayment routed by platform
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>Open Credit Score</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10B981", marginTop: "0.25rem" }}>
            {scoreData.score} / {scoreData.maxScore}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-secondary)", marginTop: "0.2rem" }}>
            Tier 2 Source-Verified
          </div>
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
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>Underwriting Status</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#7C3AED", marginTop: "0.25rem" }}>
            {scoreData.decision}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-secondary)", marginTop: "0.2rem" }}>
            Score-Driven Limit
          </div>
        </div>
      </div>

      {/* Explainer Agent Reasons Card */}
      <div className="card" style={{ padding: "1.5rem", background: "rgba(124, 58, 237, 0.04)", border: "1px solid rgba(124, 58, 237, 0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#A78BFA" }}>
            🤖 Agent Credit Explanation ({lang.toUpperCase()})
          </h2>
          <span className="badge badge-demo" style={{ fontSize: "0.68rem" }}>
            Deterministic Scorer
          </span>
        </div>
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingLeft: "1.2rem", margin: 0 }}>
          {activeReasons.map((r, i) => (
            <li key={i} style={{ fontSize: "0.85rem", color: "var(--vc-text-secondary)", lineHeight: 1.5 }}>
              {r}
            </li>
          ))}
        </ul>
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
            💳 View Loan Offers
          </Link>

          <Link href="/app/record" className="btn btn-ghost btn-md" style={{ justifyContent: "center" }}>
            📋 Inspect Proof Hashes
          </Link>
        </div>
      </div>
    </div>
  );
}

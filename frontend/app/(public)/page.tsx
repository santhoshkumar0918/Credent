"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

const FEATURES = [
  {
    icon: "✍️",
    title: "Attester-signed evidence",
    desc: "The party who witnessed the payment signs a bonded commitment — not a self-claim.",
  },
  {
    icon: "🔐",
    title: "You own the key",
    desc: "Details stay encrypted. You choose who sees what, and for how long. Revoke anytime.",
  },
  {
    icon: "⚖️",
    title: "Proof-gated lending",
    desc: "No source, no proof, no loan. Better proof tiers unlock higher limits and lower rates.",
  },
  {
    icon: "🌐",
    title: "Chain-portable by design",
    desc: "EIP-712 signatures, EAS-compatible schema. Monad today, Solana next, any chain by design.",
  },
];

const STATS = [
  { value: "1.3B", label: "Adults without formal credit" },
  { value: "530M", label: "Smartphone-owning unbanked" },
  { value: "Tier 2", label: "Source-proven attestations" },
  { value: "<1s", label: "Monad block finality" },
];

export default function LandingPage() {
  const { login, authenticated } = usePrivy();

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Hero Section */}
      <section
        style={{
          padding: "5rem 2rem 4rem",
          maxWidth: 960,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <span className="badge badge-active" style={{ fontSize: "0.78rem" }}>
            Monad Metropolis Hackathon • Open Evidence Standard
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: " clamp(2.2rem, 5vw, 3.6rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            color: "var(--vc-text-primary)",
            marginBottom: "1.25rem",
          }}
        >
          Open credit evidence for people{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #7C3AED, #38BDF8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            the banking system cannot see
          </span>
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--vc-text-secondary)",
            maxWidth: 680,
            margin: "0 auto 2.5rem",
            lineHeight: 1.6,
          }}
        >
          Rent, gig payouts, and informal loan repayments verified by the counterparty who was actually there. You own your evidence. Any lender can underwrite on facts instead of collateral.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center" }}>
          {authenticated ? (
            <Link href="/app/home" className="btn btn-primary btn-lg" style={{ fontSize: "1rem", padding: "0.85rem 2rem" }}>
              Open Dashboard →
            </Link>
          ) : (
            <button
              onClick={() => login()}
              className="btn btn-primary btn-lg"
              style={{ fontSize: "1rem", padding: "0.85rem 2rem", cursor: "pointer" }}
            >
              Get Started with Passkey
            </button>
          )}
          <Link href="/how-it-works" className="btn btn-outline btn-lg" style={{ fontSize: "1rem", padding: "0.85rem 1.75rem" }}>
            How it works
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <section
        style={{
          borderTop: "1px solid var(--vc-border)",
          borderBottom: "1px solid var(--vc-border)",
          background: "var(--vc-surface)",
          padding: "2.5rem 2rem",
        }}
      >
        <div
          className="max-w-6xl mx-auto"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "2rem",
            textAlign: "center",
          }}
        >
          {STATS.map((s) => (
            <div key={s.label}>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#38BDF8",
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", marginTop: "0.25rem" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: "5rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.75rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          Four pillars of open credit evidence
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} className="card" style={{ padding: "1.75rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{f.icon}</div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>{f.title}</h3>
              <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)", lineHeight: "1.55" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

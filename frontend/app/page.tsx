"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) router.push("/record");
  }, [ready, authenticated, router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--vc-bg)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Top bar */}
      <header style={{
        padding: "1.25rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--vc-border)",
        position: "sticky",
        top: 0,
        background: "rgba(8,10,15,0.9)",
        backdropFilter: "blur(20px)",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #7C3AED, #38BDF8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem", fontWeight: 700, color: "#fff",
            fontFamily: "var(--font-heading)",
          }}>V</div>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.1rem" }}>
            Vouchain
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="badge badge-pilot">Monad Testnet</span>
          <button className="btn btn-primary" onClick={() => login()} id="hero-login-btn">
            Get started →
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "5rem 2rem 4rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 400,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", maxWidth: 760 }}>
          <div className="badge badge-demo" style={{ marginBottom: "1.5rem" }}>
            🏆 Monad Metropolis Hackathon — Track 01
          </div>

          <h1 style={{
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "1.5rem",
            letterSpacing: "-0.02em",
          }}>
            Your rent, your gig payouts,
            <br />
            <span className="gradient-text">your credit — finally yours.</span>
          </h1>

          <p style={{
            fontSize: "1.15rem",
            color: "var(--vc-text-secondary)",
            lineHeight: 1.7,
            maxWidth: 560,
            margin: "0 auto 2.5rem",
          }}>
            Vouchain is an open evidence layer. The party who witnessed your payment
            signs a bonded commitment. You own the key. Any lender on any chain can
            verify it — no source, no proof, no loan.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => login()}
              id="hero-cta-btn"
            >
              Build my credit record
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => login()}
              id="hero-lender-btn"
            >
              I'm a lender
            </button>
          </div>

          <p style={{ marginTop: "1rem", fontSize: "0.82rem", color: "var(--vc-text-muted)" }}>
            Sign in with passkey or phone — no seed phrase, no crypto knowledge needed
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{
        borderTop: "1px solid var(--vc-border)",
        borderBottom: "1px solid var(--vc-border)",
        padding: "2rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "1.5rem",
        maxWidth: 960,
        margin: "0 auto",
        width: "100%",
      }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "1.8rem",
              color: "var(--vc-violet-light)",
              lineHeight: 1.1,
            }}>{s.value}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", marginTop: "0.35rem" }}>
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{ padding: "4rem 2rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <h2 style={{
          textAlign: "center",
          fontFamily: "var(--font-heading)",
          fontSize: "1.75rem",
          marginBottom: "2.5rem",
        }}>How it works</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem",
        }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-glow" style={{ cursor: "default" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "0.5rem" }}>
                {f.title}
              </h3>
              <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Honesty section */}
      <section style={{
        padding: "2rem",
        borderTop: "1px solid var(--vc-border)",
        maxWidth: 760,
        margin: "0 auto",
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <span className="badge badge-demo">demo stablecoin</span>
          <span className="badge badge-demo">pilot platform (not a real gig company)</span>
          <span className="badge badge-demo">interim signed disclosure (ZK is roadmap)</span>
          <span className="badge badge-demo">arbiter address (oracle is roadmap)</span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", marginTop: "0.75rem" }}>
          We label everything that's simulated. Judges trust teams that say what's real.
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "1.5rem 2rem",
        borderTop: "1px solid var(--vc-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "0.8rem",
        color: "var(--vc-text-muted)",
      }}>
        <span>Vouchain — Monad Metropolis 2026</span>
        <span>Built with Privy · Envio · Monad</span>
      </footer>
    </div>
  );
}

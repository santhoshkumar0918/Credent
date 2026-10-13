"use client";

import { useState, useRef } from "react";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Icon } from "@/lib/nav";

// Attestation #1 — a real, cited exhibit. Recorded Oct 10 2026, block 69,775,867.
// Nothing here is illustrative: every hash below resolves on MonadScan.
const EXHIBIT = {
  id: "1",
  eventType: "GIG_PAYOUT",
  attester: "0xDCBde073aEBEA2d92394D0206BE5235CEb2eEd2D",
  commitment: "0xc97d6827bd75b51c75661facf5b17c442563bd3576a5ee341062b6d06e6cb3d3",
  tx: "0x494cb870bcdd59352f9eca0ea8146a6af143ceda1e23bd6d452fcccf68a2448f",
};

const FLOW_STEPS = [
  {
    n: "01",
    title: "A witness signs",
    desc: "The bonded attester who was actually there signs the payment it saw. Its bond backs every word.",
    contract: "AttesterRegistry",
  },
  {
    n: "02",
    title: "The chain seals it",
    desc: "Only a commitment hash lands on-chain. Amounts and outcomes stay sealed — plaintext nowhere.",
    contract: "AttestationRegistry",
  },
  {
    n: "03",
    title: "The subject grants",
    desc: "You sign a scoped, expiring EIP-712 grant for one viewer. Revoke anytime; revocation is immediate.",
    contract: "ConsentRegistry",
  },
  {
    n: "04",
    title: "The lender re-verifies",
    desc: "Every hash is recomputed in the browser and compared on-chain. A mismatch rejects the disclosure.",
    contract: "client-side",
  },
  {
    n: "05",
    title: "The pool lends",
    desc: "Underwrite from verified numbers → originate → repay. Each repayment mints new attested evidence.",
    contract: "MockLendingPool",
  },
  {
    n: "06",
    title: "Lies get slashed",
    desc: "A relying party posts a bond, proves the lie, the arbiter resolves — slash, reputation cut, winner claims.",
    contract: "ChallengeModule",
  },
];

const FEATURES = [
  {
    icon: "attester",
    title: "Attester-signed evidence",
    desc: "The party who witnessed the payment signs a bonded commitment — not a self-claim.",
  },
  {
    icon: "consent",
    title: "You own the key",
    desc: "Details stay sealed in on-chain commitments. You choose who sees what, and for how long. Revoke anytime.",
  },
  {
    icon: "lender",
    title: "Proof-gated lending",
    desc: "No source, no proof, no loan. Lenders underwrite on recomputed facts instead of collateral.",
  },
  {
    icon: "challenge",
    title: "Lies get slashed",
    desc: "Any relying party can challenge a false attestation, post a bond, and take the slash. Standing beats promises.",
  },
];

function short(hex: string) {
  return hex.length > 20 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex;
}

export default function LandingPage() {
  const { login, authenticated } = usePrivy();
  const [flowStep, setFlowStep] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  function goStep(next: number) {
    const clamped = Math.max(0, Math.min(FLOW_STEPS.length - 1, next));
    setFlowStep(clamped);
    const track = trackRef.current;
    const card = track?.children[clamped] as HTMLElement | undefined;
    if (track && card) {
      const reduce = typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({
        left: card.offsetLeft - track.clientWidth / 2 + card.clientWidth / 2,
        behavior: reduce ? "auto" : "smooth",
      });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Hero — thesis left, sealed exhibit right */}
      <section
        style={{
          padding: "4.5rem 2rem 4rem",
          maxWidth: 1180,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div className="grid-2" style={{ gap: "3rem", alignItems: "center" }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>
              Ledger nº 001 · The open evidence standard
            </p>
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                lineHeight: 1.08,
                color: "var(--vc-text-primary)",
                marginBottom: "1.25rem",
              }}
            >
              Open credit evidence for people{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, var(--vc-violet), var(--vc-violet-dim))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                the banking system cannot see
              </span>
            </h1>
            <p
              style={{
                fontSize: "1.05rem",
                color: "var(--vc-text-secondary)",
                maxWidth: 560,
                marginBottom: "2.25rem",
                lineHeight: 1.65,
              }}
            >
              Rent, gig payouts, and informal loan repayments verified by the counterparty
              who was actually there. You own your evidence. Any lender can underwrite on
              facts instead of collateral.
            </p>
            <div style={{ display: "flex", gap: "0.9rem", alignItems: "center", flexWrap: "wrap" }}>
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
          </div>

          {/* The signature: a real sealed attestation, cited like an exhibit */}
          <div className="receipt stamp-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
              <span className="mono" style={{ fontSize: "0.7rem", color: "var(--vc-text-muted)" }}>
                SEALED EXHIBIT · ATTESTATION #{EXHIBIT.id}
              </span>
              <span className="seal">ACTIVE</span>
            </div>
            <p className="serif" style={{ fontSize: "1.3rem", marginBottom: "0.9rem" }}>
              Gig payout · witnessed &amp; sealed
            </p>
            <div className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-secondary)", display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1rem" }}>
              <span>event&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{EXHIBIT.eventType}</span>
              <span>attester&nbsp;&nbsp;&nbsp;{short(EXHIBIT.attester)}</span>
              <span>commit&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{short(EXHIBIT.commitment)}</span>
              <span>tx&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{short(EXHIBIT.tx)}</span>
            </div>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <a className="btn btn-outline btn-sm" href={`https://testnet.monadscan.com/tx/${EXHIBIT.tx}`} target="_blank" rel="noreferrer">
                Verify on MonadScan ↗
              </a>
              <Link href="/explorer" className="btn btn-ghost btn-sm">
                Living record →
              </Link>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginTop: "0.9rem", lineHeight: 1.6 }}>
              Recorded Oct 10 2026 · block 69,775,867. The amount never touched the chain —
              only this hash did.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive protocol flow — the demo narrator clicks through left to right.
          Active step is lit, the rest sit dull. Replaces the old static strip. */}
      <section
        style={{
          borderTop: "1px solid var(--vc-border)",
          borderBottom: "1px solid var(--vc-border)",
          background: "var(--vc-surface-1)",
          padding: "3.5rem 2rem",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: "0.6rem" }}>Protocol flow · narrate the demo</p>
              <h2 className="serif" style={{ fontSize: "1.6rem" }}>
                Six moves, one trust spine
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span className="mono" style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>
                {flowStep + 1} / {FLOW_STEPS.length}
              </span>
              <button
                className="btn btn-outline btn-sm" aria-label="Previous step"
                onClick={() => goStep(flowStep - 1)} disabled={flowStep === 0}
                style={{ opacity: flowStep === 0 ? 0.4 : 1, cursor: flowStep === 0 ? "default" : "pointer" }}
              >
                ←
              </button>
              <button
                className="btn btn-primary btn-sm" aria-label="Next step"
                onClick={() => goStep(flowStep + 1)} disabled={flowStep === FLOW_STEPS.length - 1}
                style={{ opacity: flowStep === FLOW_STEPS.length - 1 ? 0.4 : 1, cursor: flowStep === FLOW_STEPS.length - 1 ? "default" : "pointer" }}
              >
                →
              </button>
            </div>
          </div>
          <div
            ref={trackRef}
            className="stagger"
            style={{
              display: "grid",
              gridAutoFlow: "column",
              gridAutoColumns: "minmax(230px, 1fr)",
              gap: "1rem",
              marginTop: "1.5rem",
              overflowX: "auto",
              paddingBottom: "0.5rem",
              scrollSnapType: "x proximity",
            }}
          >
            {FLOW_STEPS.map((s, i) => {
              const active = i === flowStep;
              const done = i < flowStep;
              return (
                <button
                  key={s.n}
                  onClick={() => goStep(i)}
                  aria-label={`Flow step ${i + 1}: ${s.title}`}
                  style={{
                    all: "unset",
                    boxSizing: "border-box",
                    display: "block",
                    cursor: "pointer",
                    scrollSnapAlign: "center",
                    textAlign: "left",
                    background: active ? "var(--vc-surface-1)" : "transparent",
                    border: active
                      ? "2px solid var(--vc-violet)"
                      : "1px solid var(--vc-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                    opacity: active ? 1 : 0.45,
                    transition: "opacity 0.25s var(--ease-out), border-color 0.25s var(--ease-out), background 0.25s var(--ease-out)",
                  }}
                >
                  <div className="mono" style={{
                    fontSize: "0.8rem", marginBottom: "0.5rem",
                    color: done ? "var(--vc-success)" : active ? "var(--vc-violet)" : "var(--vc-text-muted)",
                  }}>
                    {done ? "✓ " : ""}{s.n}
                  </div>
                  <h3 style={{ fontSize: "1.02rem", fontWeight: 600, marginBottom: "0.4rem" }}>{s.title}</h3>
                  <p style={{ fontSize: "0.83rem", color: "var(--vc-text-secondary)", lineHeight: 1.6, marginBottom: "0.6rem" }}>{s.desc}</p>
                  <span className="mono" style={{ fontSize: "0.68rem", color: "var(--vc-text-muted)" }}>{s.contract}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", alignItems: "center" }}>
            {FLOW_STEPS.map((s, i) => (
              <button
                key={s.n}
                onClick={() => goStep(i)}
                aria-label={`Go to step ${i + 1}`}
                style={{
                  all: "unset", cursor: "pointer", height: 6, flex: 1, borderRadius: 999,
                  background: i <= flowStep ? "var(--vc-violet)" : "var(--vc-border-strong)",
                  transition: "background 0.25s var(--ease-out)",
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features — line icons, no emoji */}
      <section style={{ padding: "4.5rem 2rem", maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <p className="eyebrow" style={{ marginBottom: "0.6rem" }}>What the protocol guarantees</p>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.75rem",
            fontWeight: 500,
            marginBottom: "2.5rem",
          }}
        >
          Four properties, enforced on-chain
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} className="card" style={{ padding: "1.75rem" }}>
              <div style={{ color: "var(--vc-violet)", marginBottom: "1rem" }}>
                <Icon name={f.icon} />
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.5rem" }}>{f.title}</h3>
              <p style={{ fontSize: "0.87rem", color: "var(--vc-text-secondary)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honesty band + CTA */}
      <section
        style={{
          background: "var(--vc-success-dim)",
          borderTop: "1px solid rgba(14,107,62,0.25)",
          padding: "3.5rem 2rem 4rem",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <h2 className="serif" style={{ fontSize: "1.6rem", marginBottom: "0.8rem" }}>
            Evidence, not scores. Disclosure, not exposure.
          </h2>
          <p style={{ fontSize: "0.92rem", color: "var(--vc-text-secondary)", lineHeight: 1.7, marginBottom: "2rem" }}>
            Credent never rates you and never sees your amounts. Signed disclosure is our
            working privacy mechanism today; threshold proofs are the production target.
            And no system makes negative history inescapable — a fresh wallet starts
            fresh, and we say so openly.
          </p>
          <div style={{ display: "flex", gap: "0.9rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/explorer" className="btn btn-primary btn-lg" style={{ fontSize: "1rem", padding: "0.85rem 2rem" }}>
              Inspect the live record →
            </Link>
            <Link href="/transparency" className="btn btn-outline btn-lg" style={{ fontSize: "1rem", padding: "0.85rem 1.75rem" }}>
              Contracts &amp; honesty notes
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";

export default function HowItWorksPage() {
  const steps = [
    {
      step: "01",
      title: "Payment Attestation",
      desc: "The counterparty who actually witnessed a payment (gig platform, landlord, SACCO, or peer lender) signs a bonded commitment on Monad. Amounts stay sealed in the commitment — never plaintext on-chain.",
    },
    {
      step: "02",
      title: "Subject-Controlled Consent",
      desc: "You own your payment history. When applying for credit, you sign a scoped, time-limited EIP-712 grant letting a named lender see the values behind your sealed commitments.",
    },
    {
      step: "03",
      title: "Proof-Gated Underwriting",
      desc: "The lender re-verifies your commitment hashes client-side and records an underwriting score from that evidence. Higher proof tiers (T1/T2/T3) unlock larger limits.",
    },
    {
      step: "04",
      title: "Repay in Full, Grow the Record",
      desc: "Repay your loan in full on-chain and the pool itself attests the repayment — a new sealed record that raises your future limit. Every cycle makes the evidence stronger.",
    },
  ];

  return (
    <div style={{ padding: "4rem 2rem", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <span className="badge badge-tier2" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
          End-to-End Workflow
        </span>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2.25rem", fontWeight: 500, letterSpacing: "-0.01em" }}>
          How Credent Works
        </h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "1.05rem", marginTop: "0.5rem" }}>
          From informal payment behavior to portable, proof-gated credit identity.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {steps.map((s) => (
          <div key={s.step} className="card" style={{ padding: "2rem", display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.5rem",
                fontWeight: 500,
                color: "var(--vc-violet-dim)",
                background: "var(--vc-success-dim)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
              }}
            >
              {s.step}
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>{s.title}</h2>
              <p style={{ color: "var(--vc-text-secondary)", lineHeight: 1.6, fontSize: "0.95rem" }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: "3.5rem" }}>
        <Link href="/login" className="btn btn-primary btn-lg">
          Get Started Now →
        </Link>
      </div>
    </div>
  );
}

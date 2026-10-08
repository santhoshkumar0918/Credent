import Link from "next/link";

export default function HowItWorksPage() {
  const steps = [
    {
      step: "01",
      title: "Payment Attestation",
      desc: "The counterparty who actually witnessed a payment (gig platform, landlord, SACCO, or peer lender) signs a bonded commitment on Monad. Plaintext amounts stay encrypted off-chain.",
    },
    {
      step: "02",
      title: "Subject-Controlled Consent",
      desc: "You own your payment history. When applying for credit, you issue a scoped, time-limited EIP-712 consent grant releasing a decryption key to a named lender.",
    },
    {
      step: "03",
      title: "Proof-Gated Underwriting",
      desc: "The lender's smart contract re-verifies your commitment hashes and attester bonds client-side. Higher proof tiers (T1/T2/T3) unlock larger limits and lower interest rates.",
    },
    {
      step: "04",
      title: "Automatic Repayment Waterfall",
      desc: "Repayments are automatically routed from your recurring platform payouts before reaching your wallet, building your on-chain credit record for the next cycle.",
    },
  ];

  return (
    <div style={{ padding: "4rem 2rem", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <span className="badge badge-tier2" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
          End-to-End Workflow
        </span>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2.25rem", fontWeight: 800 }}>
          How Vouchain Works
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
                fontWeight: 800,
                color: "#38BDF8",
                background: "rgba(56, 189, 248, 0.1)",
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

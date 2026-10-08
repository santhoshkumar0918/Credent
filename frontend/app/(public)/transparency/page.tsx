import { ADDRESSES } from "@shared/constants";

export default function TransparencyPage() {
  const declarations = [
    {
      label: "Smart Contracts",
      status: "LIVE ON MONAD TESTNET",
      color: "badge-active",
      desc: "AttesterRegistry, AttestationRegistry, ConsentRegistry, ChallengeModule, and MockLendingPool deployed on Monad Testnet (Chain ID 10143).",
    },
    {
      label: "Proof-Gated Underwriting",
      status: "LIVE ON-CHAIN",
      color: "badge-active",
      desc: "Recomputes commitment hashes and verifies attester bonds on-chain before originating loans.",
    },
    {
      label: "Attestation Privacy",
      status: "INTERIM SIGNED DISCLOSURE (ZK ROADMAP)",
      color: "badge-tier2",
      desc: "MVP relies on EIP-712 scoped key release. ZK threshold-proof circuit (Noir/Circom) is the production target.",
    },
    {
      label: "Challenge Arbiter",
      status: "HACKATHON OWNER RESOLVER (ORACLE ROADMAP)",
      color: "badge-challenged",
      desc: "ChallengeModule uses an owner-controlled arbiter function for demo purposes. Production target is a decentralized oracle network.",
    },
    {
      label: "Demo Stablecoin",
      status: "MOCK ERC20 ON MONAD TESTNET",
      color: "badge-tier2",
      desc: "Testnet MON and mock USDC used for loan origination and payout simulation.",
    },
  ];

  return (
    <div style={{ padding: "4rem 2rem", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <span className="badge badge-active" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
          Protocol Honesty & Verification
        </span>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2.25rem", fontWeight: 800 }}>
          Transparency & Deployment Status
        </h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "1rem", marginTop: "0.5rem" }}>
          Full disclosure of what is live on Monad Testnet vs. what is simulated in demo mode.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "3rem" }}>
        {declarations.map((d) => (
          <div key={d.label} className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{d.label}</h2>
              <span className={`badge ${d.color}`} style={{ fontSize: "0.7rem" }}>
                {d.status}
              </span>
            </div>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>{d.desc}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>Deployed Contract Addresses</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
          {Object.entries(ADDRESSES).map(([name, addr]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--vc-border)" }}>
              <span style={{ color: "var(--vc-text-secondary)" }}>{name}</span>
              <a
                href={`https://testnet.monadscan.com/address/${addr}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#38BDF8", textDecoration: "underline" }}
              >
                {addr}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

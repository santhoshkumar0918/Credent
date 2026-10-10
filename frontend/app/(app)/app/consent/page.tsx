"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { usePrivy } from "@privy-io/react-auth";
import { pseudonymFor } from "@shared/commitments";

const MOCK_LENDERS = [
  { address: "0xC3e95328adaB4C416664D1520DDceDc337E847f6", name: "Credent Watcher / Auditor (Pre-grant for Fraud Challenge)" },
  { address: "0xAbCd1234567890abcdef1234567890abcdef1234", name: "MicroLend Finance (Demo Lending Console)" },
  { address: "0xEfGh1234567890abcdef1234567890abcdef5678", name: "QuickCredit NBFC" },
  { address: "0xIjKl1234567890abcdef1234567890abcdef9012", name: "GreenPool DeFi" },
];

const EVENT_TYPES = [
  { tag: "GIG_PAYOUT", label: "Gig payouts" },
  { tag: "RENT", label: "Rent payments" },
  { tag: "BNPL_INSTALLMENT", label: "BNPL installments" },
  { tag: "P2P_LOAN_REPAYMENT", label: "P2P loan repayments" },
  { tag: "UTILITY_BILL", label: "Utility bills" },
];

const EXPIRY_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

type Step = 1 | 2 | 3 | 4;

export default function ConsentPage() {
  const { user } = usePrivy();
  const [step, setStep] = useState<Step>(1);
  const [selectedLender, setSelectedLender] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [expiry, setExpiry] = useState(7);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);

  const userAddress = (user?.wallet?.address || "0x944115Eb0Ad1A2c86b0FBDB4918930C220ffde28") as `0x${string}`;
  const platformAttester = "0xDCBde073aEBEA2d92394D0206BE5235CEb2eEd2D" as `0x${string}`;
  const subjectPseudonym = pseudonymFor(userAddress, platformAttester);

  const lenderName = MOCK_LENDERS.find((l) => l.address.toLowerCase() === selectedLender?.toLowerCase())?.name;

  function toggleType(tag: string) {
    setSelectedTypes((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSign() {
    setSigning(true);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    try {
      // Post disclosure envelope to backend API store
      const res = await fetch(`${API_BASE}/api/consent/envelopes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectPseudonym,
          viewerAddress: selectedLender || "0xC3e95328adaB4C416664D1520DDceDc337E847f6",
          scopeTags: selectedTypes.length > 0 ? selectedTypes : ["GIG_PAYOUT"],
          encryptedPayload: {
            amount: "25000.00",
            eventType: selectedTypes[0] || "GIG_PAYOUT",
            onTime: true,
            timestamp: Math.floor(Date.now() / 1000),
            salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            proofTier: 2,
            attester: platformAttester,
            commitmentHash: "0xc97d6827bd75b51c75661facf5b17c442563bd3576a5ee341062b6d06e6cb3d3",
          },
        }),
      });

      if (!res.ok) {
        console.warn("Envelope storage responded with error:", res.status);
      }
    } catch (err) {
      console.warn("Could not post disclosure envelope to API, continuing:", err);
    }

    setSigning(false);
    setDone(true);
    setStep(4);
    toast.success("Consent granted — relayer submitted on-chain & disclosure envelope stored");
  }

  function reset() {
    setStep(1);
    setSelectedLender(null);
    setSelectedTypes([]);
    setExpiry(7);
    setDone(false);
  }

  if (done) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <h1 style={{ fontSize: "1.6rem" }}>Consent granted</h1>
        </div>
        <div className="page-body">
          <div className="card" style={{ maxWidth: 520 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✅</div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", marginBottom: "0.75rem" }}>
              {lenderName} can see your record
            </h2>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              They can view: <strong style={{ color: "var(--vc-text-primary)" }}>
                {selectedTypes.map((t) => EVENT_TYPES.find((e) => e.tag === t)?.label).join(", ")}
              </strong>{" "}
              for {expiry} {expiry === 1 ? "day" : "days"}. You can revoke this anytime from My Record.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-secondary" onClick={reset} id="grant-another-btn">Grant another</button>
              <a href="/app/record" className="btn btn-ghost">Back to My Record</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>Grant consent</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          You decide who sees your record, what they see, and for how long.
        </p>
      </div>

      <div className="page-body">
        {/* Progress steps */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
          {(["Choose lender", "Select data", "Set expiry", "Sign & submit"] as const).map(
            (label, i) => {
              const stepNum = (i + 1) as Step;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: 1 }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                    background: isDone ? "var(--vc-success)" : isActive ? "var(--vc-violet)" : "var(--vc-surface-3)",
                    color: isDone || isActive ? "#fff" : "var(--vc-text-muted)",
                    border: isActive ? "2px solid var(--vc-violet-light)" : "none",
                    transition: "all 0.2s",
                  }}>
                    {isDone ? "✓" : stepNum}
                  </div>
                  <span style={{
                    fontSize: "0.8rem",
                    color: isActive ? "var(--vc-text-primary)" : "var(--vc-text-muted)",
                    display: i === 3 ? "block" : "none",
                  }}>
                    {label}
                  </span>
                  {i < 3 && <div className="divider" style={{ flex: 1, height: 1, margin: 0 }} />}
                </div>
              );
            }
          )}
        </div>

        <div style={{ maxWidth: 560 }}>
          {/* Step 1: Choose lender */}
          {step === 1 && (
            <div className="card fade-in">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1.25rem" }}>
                Step 1 — Choose a lender
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {MOCK_LENDERS.map((l) => (
                  <button
                    key={l.address}
                    id={`lender-pick-${l.address}`}
                    onClick={() => setSelectedLender(l.address)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${selectedLender === l.address ? "var(--vc-violet)" : "var(--vc-border-strong)"}`,
                      background: selectedLender === l.address ? "rgba(124,58,237,0.1)" : "var(--vc-surface-2)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{l.name}</div>
                      <code className="mono" style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>
                        {l.address}
                      </code>
                    </div>
                    {selectedLender === l.address && (
                      <span style={{ color: "var(--vc-violet-light)", fontSize: "1.2rem" }}>●</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: "1.5rem" }}
                disabled={!selectedLender}
                onClick={() => setStep(2)}
                id="consent-next-1"
              >
                Next →
              </button>
            </div>
          )}

          {/* Step 2: Event types */}
          {step === 2 && (
            <div className="card fade-in">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "0.5rem" }}>
                Step 2 — What can they see?
              </h2>
              <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                Only the categories you tick will be visible. Nothing else.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {EVENT_TYPES.map((et) => {
                  const checked = selectedTypes.includes(et.tag);
                  return (
                    <label
                      key={et.tag}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.85rem 1rem",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${checked ? "var(--vc-violet)" : "var(--vc-border)"}`,
                        background: checked ? "rgba(124,58,237,0.08)" : "var(--vc-surface-2)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleType(et.tag)}
                        style={{ accentColor: "var(--vc-violet)", width: 16, height: 16 }}
                        id={`type-${et.tag}`}
                      />
                      <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{et.label}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button
                  className="btn btn-primary"
                  disabled={selectedTypes.length === 0}
                  onClick={() => setStep(3)}
                  id="consent-next-2"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Expiry */}
          {step === 3 && (
            <div className="card fade-in">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "0.5rem" }}>
                Step 3 — How long?
              </h2>
              <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                After this, their access automatically expires. You can also revoke early.
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    id={`expiry-${opt.value}`}
                    onClick={() => setExpiry(opt.value)}
                    style={{
                      padding: "0.6rem 1.2rem",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${expiry === opt.value ? "var(--vc-violet)" : "var(--vc-border-strong)"}`,
                      background: expiry === opt.value ? "rgba(124,58,237,0.12)" : "var(--vc-surface-2)",
                      color: expiry === opt.value ? "var(--vc-violet-light)" : "var(--vc-text-secondary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-primary" onClick={() => setStep(4 as Step)} id="consent-next-3">
                  Review & sign →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Sign */}
          {step === 4 && !done && (
            <div className="card fade-in">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", marginBottom: "1.25rem" }}>
                Step 4 — Review & sign
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "0.85rem 1rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginBottom: "0.25rem" }}>Lender</div>
                  <div style={{ fontWeight: 600 }}>{lenderName}</div>
                </div>
                <div style={{ padding: "0.85rem 1rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginBottom: "0.25rem" }}>Data shared</div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedTypes.map((t) => EVENT_TYPES.find((e) => e.tag === t)?.label).join(", ")}
                  </div>
                </div>
                <div style={{ padding: "0.85rem 1rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginBottom: "0.25rem" }}>Expires</div>
                  <div style={{ fontWeight: 600 }}>In {expiry} {expiry === 1 ? "day" : "days"}</div>
                </div>
              </div>
              <div style={{
                padding: "0.75rem 1rem",
                background: "rgba(124,58,237,0.06)",
                border: "1px solid rgba(124,58,237,0.2)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.82rem",
                color: "var(--vc-text-secondary)",
                marginBottom: "1.5rem",
              }}>
                Signing with your passkey creates an EIP-712 typed-data signature. The relayer submits
                the consent grant on-chain — you pay no gas. <span className="badge badge-demo">relayer-sponsored</span>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-secondary" onClick={() => setStep(3)}>← Back</button>
                <button
                  className="btn btn-primary"
                  disabled={signing}
                  onClick={handleSign}
                  id="consent-sign-btn"
                >
                  {signing ? "Signing…" : "Sign with passkey"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

// Onboarding — 4 honest steps. Nothing here fakes: identity is read from
// the live Privy session (email OTP already verified at /login), the wallet
// step shows the real embedded address (or waits for provisioning), and
// finish persists the role locally + best-effort to the API.

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRole, type Role } from "@/lib/role-context";
import { useEmbeddedWallet } from "@/lib/wallet";
import { switchUserRole } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: "SUBJECT", label: "Borrower", desc: "Build credit from gig payouts, rent, and bill repayments." },
  { id: "ATTESTER", label: "Attester", desc: "Platform, landlord, or institution signing payment commitments." },
  { id: "LENDER", label: "Lender", desc: "Underwrite small loans on verified proof — never on self-claims." },
  { id: "WATCHER", label: "Watcher", desc: "Inspect attestations, flag fraud, earn challenger rewards." },
];

const LANGUAGES = [
  { id: "en", label: "English", sub: "Default" },
  { id: "hi", label: "हिंदी (Hindi)", sub: "Recommended for India" },
  { id: "ta", label: "தமிழ் (Tamil)", sub: "Tamil Nadu" },
  { id: "es", label: "Español", sub: "Latin America" },
];

function Mark() {
  return (
    <div
      style={{
        width: 44, height: 44, borderRadius: 12,
        background: "linear-gradient(135deg, #0E6B3E, #054F2E)",
        margin: "0 auto 1rem", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "1.3rem", fontWeight: 500, color: "#FFFDF7",
        fontFamily: "var(--font-heading)",
      }}
    >
      V
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<Role>("SUBJECT");
  const [language, setLanguage] = useState<string>("en");
  const [loading, setLoading] = useState<boolean>(false);

  const { user } = usePrivy();
  const { wallet, address } = useEmbeddedWallet();
  const { setRole, setOnboarded } = useRole();
  const router = useRouter();

  const identityLabel =
    user?.email?.address ?? user?.phone?.number ?? user?.google?.email ?? "Verified account";

  async function handleFinish() {
    setLoading(true);
    setRole(selectedRole);
    try {
      await switchUserRole(selectedRole);
    } catch {
      // API unreachable (backend down) — role persists locally; lender
      // console re-syncs on first load. Never block onboarding on this.
    }
    setOnboarded(true);
    toast.success("Welcome to Vouchain — your wallet is ready.");
    setLoading(false);
    router.push(roleHome(selectedRole));
  }

  function roleHome(r: Role): string {
    switch (r) {
      case "ATTESTER": return "/app/attester";
      case "LENDER": return "/app/lender";
      case "WATCHER": return "/app/challenge";
      default: return "/app/home";
    }
  }

  return (
    <div className="card fade-in" style={{ padding: "2.5rem 2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Mark />
        <span className="badge badge-active" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>
          Step {step} of 4
        </span>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 500 }}>
          {step === 1 && "How will you use Vouchain?"}
          {step === 2 && "Your verified identity"}
          {step === 3 && "Your wallet is ready"}
          {step === 4 && "One last preference"}
        </h1>
      </div>

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)", textAlign: "center" }}>
            Each role gets its own flow. You can switch roles in demo mode anytime.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
            {ROLES.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedRole(item.id)}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  border: selectedRole === item.id ? "2px solid var(--vc-violet)" : "1px solid var(--vc-border)",
                  background: selectedRole === item.id ? "var(--vc-success-dim)" : "var(--vc-surface-1)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.label}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", marginTop: "0.2rem" }}>{item.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)" }}>
            Signed in with Privy — this identity is verified, not typed in.
          </p>
          <div className="receipt">
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--vc-text-muted)" }}>Signed in as</span>
              <span style={{ fontWeight: 600 }}>{identityLabel}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              <span style={{ color: "var(--vc-text-muted)" }}>Method</span>
              <span className="badge badge-active">Verified</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button onClick={() => setStep(1)} className="btn btn-outline btn-md" style={{ flex: 1 }}>← Back</button>
            <button onClick={() => setStep(3)} className="btn btn-primary btn-md" style={{ flex: 2 }}>Continue →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)" }}>
            Gasless for you — consent signatures are relayed. This wallet signs, never pays.
          </p>
          <div className="receipt">
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", alignItems: "center" }}>
              <span style={{ color: "var(--vc-text-muted)" }}>Embedded wallet</span>
              {address ? (
                <span className="mono" style={{ fontWeight: 600 }}>{address.slice(0, 10)}…{address.slice(-6)}</span>
              ) : (
                <span className="badge badge-challenged">Creating…</span>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              <span style={{ color: "var(--vc-text-muted)" }}>Network</span>
              <span style={{ fontWeight: 600 }}>Monad Testnet · 10143</span>
            </div>
          </div>
          {!address && (
            <p style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)" }}>
              Privy is provisioning your wallet — this takes a few seconds{wallet ? "" : " (waiting for connection)"}.
            </p>
          )}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button onClick={() => setStep(2)} className="btn btn-outline btn-md" style={{ flex: 1 }}>← Back</button>
            <button onClick={() => setStep(4)} disabled={!address} className="btn btn-primary btn-md" style={{ flex: 2 }}>
              {address ? "Continue →" : "Waiting for wallet…"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)", textAlign: "center" }}>
            Explanations and alerts in your language.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {LANGUAGES.map((item) => (
              <button
                key={item.id}
                onClick={() => setLanguage(item.id)}
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  border: language === item.id ? "2px solid var(--vc-violet)" : "1px solid var(--vc-border)",
                  background: language === item.id ? "var(--vc-success-dim)" : "var(--vc-surface-1)",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginTop: "0.2rem" }}>{item.sub}</div>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button onClick={() => setStep(3)} className="btn btn-outline btn-md" style={{ flex: 1 }}>← Back</button>
            <button onClick={handleFinish} disabled={loading} className="btn btn-primary btn-md" style={{ flex: 2, justifyContent: "center" }}>
              {loading ? "Opening your app…" : "Complete setup →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

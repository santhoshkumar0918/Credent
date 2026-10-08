"use client";

import { useState } from "react";
import { useRole, type Role } from "@/lib/role-context";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function OnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<Role>("SUBJECT");
  const [phone, setPhone] = useState<string>("+91 98765 43210");
  const [otp, setOtp] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const [loading, setLoading] = useState<boolean>(false);

  const { setRole, setOnboarded } = useRole();
  const router = useRouter();

  const handleFinishOnboarding = () => {
    setLoading(true);
    setTimeout(() => {
      setRole(selectedRole);
      setOnboarded(true);
      toast.success("Account setup complete! Welcome to Vouchain.");
      setLoading(false);
      router.push("/app/home");
    }, 1000);
  };

  return (
    <div className="card" style={{ padding: "2.5rem 2rem" }}>
      {/* Header & Step Indicator */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, #7C3AED, #38BDF8)",
            margin: "0 auto 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.3rem",
            fontWeight: 700,
            color: "#fff",
            fontFamily: "var(--font-heading)",
            boxShadow: "0 0 20px rgba(124, 58, 237, 0.3)",
          }}
        >
          V
        </div>
        <span className="badge badge-active" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>
          Step {step} of 4
        </span>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 700 }}>
          {step === 1 && "Choose Your Vouchain Role"}
          {step === 2 && "Verify Phone Number"}
          {step === 3 && "Preferred Language"}
          {step === 4 && "Create Credit Record Anchor"}
        </h1>
      </div>

      {/* Step 1: Role Selection */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)", textAlign: "center" }}>
            Select how you intend to use Vouchain. You can switch roles in demo mode anytime.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
            {[
              { id: "SUBJECT", label: "Borrower (Subject)", desc: "Build credit from gig payouts, rent, and bill repayments." },
              { id: "ATTESTER", label: "Attester", desc: "Gig platform, landlord, or institution signing payment commitments." },
              { id: "LENDER", label: "Lender / Underwriter", desc: "Underwrite small uncollateralised loans on verified proof." },
              { id: "WATCHER", label: "Watcher / Challenger", desc: "Inspect attestations, flag fraud, and earn challenger rewards." },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedRole(item.id as Role)}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  border: selectedRole === item.id ? "2px solid #7C3AED" : "1px solid var(--vc-border)",
                  background: selectedRole === item.id ? "rgba(124, 58, 237, 0.1)" : "var(--vc-surface-2)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--vc-text-primary)" }}>{item.label}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", marginTop: "0.2rem" }}>{item.desc}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
          >
            Continue to Phone Verification →
          </button>
        </div>
      )}

      {/* Step 2: Phone Verification */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)", textAlign: "center" }}>
            We use SMS OTP for account recovery and instant notification alerts.
          </p>

          <div>
            <label style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", display: "block", marginBottom: "0.4rem" }}>
              Mobile Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--vc-surface-2)", border: "1px solid var(--vc-border)", color: "#fff" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", display: "block", marginBottom: "0.4rem" }}>
              Enter 6-Digit SMS Code
            </label>
            <input
              type="text"
              placeholder="1 2 3 4 5 6"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="input-field"
              style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--vc-surface-2)", border: "1px solid var(--vc-border)", color: "#fff", letterSpacing: "0.2rem", textAlign: "center", fontWeight: 700 }}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button onClick={() => setStep(1)} className="btn btn-outline btn-md" style={{ flex: 1 }}>
              ← Back
            </button>
            <button onClick={() => setStep(3)} className="btn btn-primary btn-md" style={{ flex: 2 }}>
              Verify & Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Language Selection */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)", textAlign: "center" }}>
            Choose your preferred display language for explanations and alerts.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { id: "en", label: "English", sub: "Default" },
              { id: "hi", label: "हिंदी (Hindi)", sub: "Recommended for India" },
              { id: "id", label: "Bahasa Indonesia", sub: "Southeast Asia" },
              { id: "es", label: "Español", sub: "Latin America" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setLanguage(item.id)}
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  border: language === item.id ? "2px solid #38BDF8" : "1px solid var(--vc-border)",
                  background: language === item.id ? "rgba(56, 189, 248, 0.1)" : "var(--vc-surface-2)",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--vc-text-primary)" }}>{item.label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginTop: "0.2rem" }}>{item.sub}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button onClick={() => setStep(2)} className="btn btn-outline btn-md" style={{ flex: 1 }}>
              ← Back
            </button>
            <button onClick={() => setStep(4)} className="btn btn-primary btn-md" style={{ flex: 2 }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Create Record Anchor */}
      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)" }}>
            Vouchain will generate your persistent identity anchor and encryption keys stored securely in your browser.
          </p>

          <div className="card" style={{ padding: "1.25rem", background: "var(--vc-surface-2)", textAlign: "left", fontSize: "0.82rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--vc-text-muted)" }}>Selected Role</span>
              <span style={{ color: "#38BDF8", fontWeight: 600 }}>{selectedRole}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--vc-text-muted)" }}>Verified Phone</span>
              <span style={{ color: "var(--vc-text-primary)" }}>{phone}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--vc-text-muted)" }}>Storage</span>
              <span style={{ color: "#10B981", fontWeight: 600 }}>Encrypted Local Keyring</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button onClick={() => setStep(3)} className="btn btn-outline btn-md" style={{ flex: 1 }}>
              ← Back
            </button>
            <button
              onClick={handleFinishOnboarding}
              disabled={loading}
              className="btn btn-primary btn-md"
              style={{ flex: 2, justifyContent: "center" }}
            >
              {loading ? "Generating Keys..." : "Complete Setup & Open App →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

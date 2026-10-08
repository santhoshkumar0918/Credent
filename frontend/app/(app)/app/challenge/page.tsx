"use client";

import { MOCK_CHALLENGES, MOCK_ATTESTERS } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function calc() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(`${h}h ${m}m ${s}s`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return <span style={{ fontFamily: "var(--font-mono)", color: "var(--vc-warning)" }}>{remaining}</span>;
}

export default function ChallengePage() {
  const [slashing, setSlashing] = useState(false);
  const [slashed, setSlashed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);

  const ch = MOCK_CHALLENGES[0];
  const attester = MOCK_ATTESTERS[0];

  async function handleOpenChallenge() {
    setOpening(true);
    await new Promise((r) => setTimeout(r, 1500));
    setOpening(false);
    setOpened(true);
    toast.success("Challenge opened — 0.5 MON challenger bond posted");
  }

  async function handleSlash() {
    setSlashing(true);
    await new Promise((r) => setTimeout(r, 2200));
    setSlashing(false);
    setSlashed(true);
    toast.success("Challenger wins — attester slashed, bond paid to challenger");
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>Challenge console</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Any lender or watcher can challenge a false attestation and win the attester's bond.
        </p>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem", maxWidth: 720 }}>

        {/* Flagged attestation */}
        <div className="card" style={{ borderColor: slashed ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: slashed ? "var(--vc-danger-dim)" : "var(--vc-warning-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem",
            }}>
              {slashed ? "⚔️" : "🚩"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                Attestation #{ch.attestationId}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)" }}>
                By {ch.platform} · Subject {ch.subjectPseudonym}
              </div>
            </div>
            {slashed ? (
              <span className="badge badge-slashed" style={{ marginLeft: "auto" }}>SLASHED</span>
            ) : (
              <span className="badge badge-challenged" style={{ marginLeft: "auto" }}>CHALLENGED</span>
            )}
          </div>

          <div style={{
            padding: "0.85rem 1rem",
            background: "var(--vc-surface-2)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.875rem",
            color: "var(--vc-text-secondary)",
            marginBottom: "1.25rem",
            lineHeight: 1.6,
          }}>
            <strong style={{ color: "var(--vc-warning)" }}>Alleged fraud:</strong>{" "}
            {ch.description}
          </div>

          {/* Window countdown */}
          {!slashed && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)" }}>Challenge window closes in:</span>
              <Countdown endsAt={ch.windowEnds} />
            </div>
          )}

          {/* Attester info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <div style={{ padding: "0.75rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.2rem" }}>Attester bond</div>
              <div style={{ fontWeight: 700, color: slashed ? "var(--vc-danger)" : "var(--vc-text-primary)" }}>
                {slashed ? "0 MON ⚔" : attester.bond}
              </div>
            </div>
            <div style={{ padding: "0.75rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.2rem" }}>Reputation</div>
              <div style={{ fontWeight: 700, color: slashed ? "var(--vc-danger)" : "var(--vc-success)" }}>
                {slashed ? "44 ↓" : attester.reputation}
              </div>
            </div>
            <div style={{ padding: "0.75rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.2rem" }}>Challenges lost</div>
              <div style={{ fontWeight: 700, color: slashed ? "var(--vc-danger)" : "var(--vc-text-primary)" }}>
                {slashed ? "2" : attester.challengesLost}
              </div>
            </div>
          </div>

          {!opened && !slashed && (
            <button
              className="btn btn-danger"
              onClick={handleOpenChallenge}
              disabled={opening}
              id="open-challenge-btn"
            >
              {opening ? "Posting bond…" : "Open challenge — post 0.5 MON challenger bond"}
            </button>
          )}

          {opened && !slashed && (
            <div className="fade-in">
              <div style={{
                padding: "0.75rem 1rem",
                background: "var(--vc-success-dim)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.82rem",
                color: "var(--vc-success)",
                marginBottom: "1rem",
              }}>
                ✓ 0.5 MON challenger bond posted · awaiting arbiter resolution
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn-danger"
                  onClick={handleSlash}
                  disabled={slashing}
                  id="slash-btn"
                >
                  {slashing ? "Slashing…" : "⚔ Arbiter resolves — challenger wins"}
                </button>
                <span className="badge badge-demo" style={{ alignSelf: "center" }}>
                  arbiter address (oracle is roadmap)
                </span>
              </div>
            </div>
          )}

          {slashed && (
            <div className="fade-in" style={{
              padding: "1rem",
              background: "var(--vc-danger-dim)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}>
              <div style={{ fontWeight: 700, color: "var(--vc-danger)", marginBottom: "0.5rem" }}>
                ⚔ Attester slashed
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--vc-text-secondary)", lineHeight: 1.6 }}>
                5 MON slashed from attester bond. 0.5 MON paid to challenger.
                Attestation marked <code className="mono">SLASHED</code>. Attester
                reputation dropped from {attester.reputation} → 44. Attester deactivated
                (bond below minimum).
              </div>
            </div>
          )}
        </div>

        {/* How challenges work */}
        <div className="card" style={{ background: "transparent" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
            How the challenge-slash cycle works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              { step: "Any lender or watcher sees a suspicious attestation.", icon: "👁" },
              { step: "They post a 0.5 MON bond to open a challenge.", icon: "💰" },
              { step: "The attester submits their pinned evidence.", icon: "📋" },
              { step: "An arbiter resolves (hackathon: one address; production: oracle).", icon: "⚖️" },
              { step: "Challenger wins → attester bond slashed, challenger paid, attestation marked SLASHED.", icon: "⚔️" },
              { step: "Attester loses → they keep their bond, challenger forfeits theirs.", icon: "🔒" },
            ].map(({ step, icon }, i) => (
              <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: "0.875rem", color: "var(--vc-text-secondary)", lineHeight: 1.5 }}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <span className="badge badge-demo">arbiter address (oracle is roadmap)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { MOCK_CHALLENGES, MOCK_ATTESTERS } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { resolveChallengeAdmin } from "@/lib/api-client";

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
  const [adminPassword, setAdminPassword] = useState("vouchain-admin-secret");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [resolutionTxHash, setResolutionTxHash] = useState("");

  const ch = MOCK_CHALLENGES[0];
  const attester = MOCK_ATTESTERS[0];

  async function handleOpenChallenge() {
    setOpening(true);
    await new Promise((r) => setTimeout(r, 1200));
    setOpening(false);
    setOpened(true);
    toast.success("Challenge opened — 0.5 MON challenger bond posted");
  }

  async function handleExecuteSlash() {
    if (!adminPassword) {
      toast.error("Admin password required to execute arbiter resolution");
      return;
    }

    setSlashing(true);
    try {
      const res = await resolveChallengeAdmin({
        adminPassword,
        challengeId: ch.attestationId,
        slashAttester: true,
      });

      setResolutionTxHash(res.txHash || "0xaddea2f...");
      setSlashed(true);
      setShowAdminModal(false);
      toast.success("Arbiter resolved — Attester slashed 4.5 MON on-chain!");
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve challenge");
    } finally {
      setSlashing(false);
    }
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-header">
        <h1 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>Fraud & Challenge Console</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Any relying party or watcher can challenge a false attestation and trigger an on-chain slash.
        </p>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem", maxWidth: 720 }}>
        {/* Flagged attestation card */}
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
              <span className="badge badge-slashed" style={{ marginLeft: "auto" }}>SLASHED ON-CHAIN</span>
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
            <strong style={{ color: "var(--vc-warning)" }}>Alleged Fraud / Planted Claim:</strong>{" "}
            {ch.description}
          </div>

          {/* Window countdown */}
          {!slashed && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)" }}>Challenge window closes in:</span>
              <Countdown endsAt={ch.windowEnds} />
            </div>
          )}

          {/* Attester stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <div style={{ padding: "0.75rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.2rem" }}>Attester Bond</div>
              <div style={{ fontWeight: 700, color: slashed ? "var(--vc-danger)" : "var(--vc-text-primary)" }}>
                {slashed ? "0.5 MON (Slashed)" : attester.bond}
              </div>
            </div>
            <div style={{ padding: "0.75rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.2rem" }}>Reputation Score</div>
              <div style={{ fontWeight: 700, color: slashed ? "var(--vc-danger)" : "var(--vc-success)" }}>
                {slashed ? "84 (-10)" : attester.reputation}
              </div>
            </div>
            <div style={{ padding: "0.75rem", background: "var(--vc-surface-2)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.2rem" }}>Challenges Lost</div>
              <div style={{ fontWeight: 700, color: slashed ? "var(--vc-danger)" : "var(--vc-text-primary)" }}>
                {slashed ? "1" : attester.challengesLost}
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
              {opening ? "Posting Bond…" : "Open Challenge — Post 0.5 MON Challenger Bond"}
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
                ✓ 0.5 MON challenger bond posted · Awaiting Arbiter resolution
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowAdminModal(true)}
                  id="slash-btn"
                >
                  ⚔ Arbiter Resolves — Execute On-Chain Slash
                </button>
                <span className="badge badge-demo" style={{ alignSelf: "center" }}>
                  Arbiter address (oracle is roadmap)
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
                ⚔ Attester Slashed On-Chain
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--vc-text-secondary)", lineHeight: 1.6 }}>
                4.5 MON slashed from attester bond. 90% paid to challenger, 10% burned.
                Attestation marked <code className="mono">SLASHED</code>. Attester reputation dropped by -10.
                {resolutionTxHash && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--vc-text-muted)" }}>
                    Tx Hash: <span style={{ color: "#38BDF8", fontFamily: "var(--font-mono)" }}>{resolutionTxHash}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* How challenges work */}
        <div className="card" style={{ background: "transparent" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
            How the Challenge-Slash Cycle Works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              { step: "Watcher or relying party detects fraudulent claim.", icon: "👁" },
              { step: "Posts a 0.5 MON bond to open ChallengeModule dispute.", icon: "💰" },
              { step: "Attester submits pinned IPFS evidence blob for audit.", icon: "📋" },
              { step: "Arbiter resolves (hackathon: single arbiter key; production: multi-sig oracle).", icon: "⚖️" },
              { step: "Challenger wins → Attester bond slashed 4.5 MON, challenger paid.", icon: "⚔️" },
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
            <span className="badge badge-demo">Arbiter address (oracle is roadmap)</span>
          </div>
        </div>
      </div>

      {/* Admin Password Modal */}
      {showAdminModal && (
        <div className="modal-backdrop" onClick={() => setShowAdminModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", marginBottom: "1rem" }}>
              Arbiter Challenge Resolution
            </h2>
            <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Enter the admin secret password to sign resolution with the Arbiter private key on the backend API server.
            </p>
            <label className="input-label">Admin Secret Password</label>
            <input
              type="password"
              className="input-field"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
            />
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                className="btn btn-danger"
                onClick={handleExecuteSlash}
                disabled={slashing}
              >
                {slashing ? "Executing Slash..." : "⚔ Slash Attester"}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAdminModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

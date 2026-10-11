"use client";

// Fraud & challenge console — the watcher's home. Open challenges post a
// real 0.5 MON bond and need a live subject grant (the chain enforces
// both). Resolved challenges are claimed here by the winner. Resolution
// itself is the arbiter's signature, executed operator-side — this console
// never fakes it. False claims are planted by the red-team operator's own
// bonded wallet via platform-sim, never from this screen.

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useEmbeddedWallet, getEmbeddedWalletClient } from "@/lib/wallet";
import {
  CHALLENGER_BOND_MON,
  CHALLENGE_STATUS,
  listDisputes,
  openChallenge,
  claimWinnings,
  proofHashFor,
  challengeErrorCopy,
  disputeTxUrl,
  type Dispute,
} from "@/lib/dispute";

function Countdown({ endsAt }: { endsAt: bigint }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function calc() {
      const diff = Number(endsAt) * 1000 - Date.now();
      if (diff <= 0) { setRemaining("window closed"); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`);
    }
    calc();
    const id = setInterval(calc, 30_000);
    return () => clearInterval(id);
  }, [endsAt]);
  return <span className="mono" style={{ fontSize: "0.75rem", color: "var(--vc-warning)" }}>{remaining}</span>;
}

function short(hex: string) {
  return hex.length > 16 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex;
}

export default function ChallengePage() {
  const { wallet, address } = useEmbeddedWallet();
  const [disputes, setDisputes] = useState<Dispute[] | null | undefined>(undefined);
  const [attestationId, setAttestationId] = useState("");
  const [disclosure, setDisclosure] = useState("");
  const [opening, setOpening] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [lastOpen, setLastOpen] = useState<{ txHash: string; challengeId: bigint | null } | null>(null);

  const refresh = useCallback(async () => {
    setDisputes(await listDisputes());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleOpen() {
    let id: bigint;
    try {
      id = BigInt(attestationId);
      if (id < BigInt(0)) throw new Error("bad");
    } catch {
      toast.error("Enter a valid attestation id.");
      return;
    }
    if (!disclosure.trim()) {
      toast.error("Paste the disclosure you relied upon — the challenge commits to it.");
      return;
    }
    if (!wallet) {
      toast.error("Wallet not ready.");
      return;
    }
    setOpening(true);
    setLastOpen(null);
    try {
      const wc = await getEmbeddedWalletClient(wallet);
      const out = await openChallenge(wc, id, proofHashFor(disclosure.trim()));
      setLastOpen(out);
      toast.success(
        out.challengeId !== null
          ? `Challenge #${out.challengeId} open — ${CHALLENGER_BOND_MON} MON bond posted.`
          : "Challenge opened — receipt confirmed.",
      );
      setAttestationId("");
      setDisclosure("");
      await refresh();
    } catch (e) {
      toast.error(challengeErrorCopy(e));
    } finally {
      setOpening(false);
    }
  }

  async function handleClaim(d: Dispute) {
    if (!wallet) {
      toast.error("Wallet not ready.");
      return;
    }
    setClaiming(d.id);
    try {
      const wc = await getEmbeddedWalletClient(wallet);
      const tx = await claimWinnings(wc, d.id);
      toast.success(`Winnings claimed. Tx ${short(tx)}`);
      await refresh();
    } catch (e) {
      toast.error(challengeErrorCopy(e));
    } finally {
      setClaiming(null);
    }
  }

  const mineClaimable = (d: Dispute) =>
    d.status === 2 && !d.claimed && address && d.challenger.toLowerCase() === address.toLowerCase();

  return (
    <div className="fade-in page-shell">
      <div className="page-header">
        <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Watcher · Disputes</p>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.35rem" }}>Fraud & challenge console</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Standing belongs to relying parties. Post a bond, prove the lie, take the slash.
        </p>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem", maxWidth: 720 }}>
        {/* How it works */}
        <div className="card">
          <div className="stat-grid" style={{ fontSize: "0.83rem" }}>
            {[
              ["1 · Standing", "The subject must have granted YOUR wallet a live disclosure. No grant, no challenge."],
              ["2 · Bond", `${CHALLENGER_BOND_MON} MON locked with the challenge. Win it back with the slash, or lose it.`],
              ["3 · Window", "7 days from attestation. The arbiter resolves; the winner claims on-chain."],
            ].map(([t, d]) => (
              <div key={t}>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{t}</div>
                <div style={{ color: "var(--vc-text-secondary)", lineHeight: 1.6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Open a challenge */}
        <div className="card">
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Open a challenge</h2>
          <div style={{ display: "grid", gap: "0.9rem" }}>
            <div>
              <label className="input-label" htmlFor="challenge-att-id">Attestation id (must be ACTIVE)</label>
              <input id="challenge-att-id" className="input-field mono" value={attestationId}
                onChange={(e) => setAttestationId(e.target.value)} placeholder="e.g. 2" inputMode="numeric" />
            </div>
            <div>
              <label className="input-label" htmlFor="challenge-disclosure">Disclosure you relied upon</label>
              <textarea id="challenge-disclosure" className="input-field mono" rows={3} value={disclosure}
                onChange={(e) => setDisclosure(e.target.value)}
                placeholder='Paste the disclosed values — the challenge stores only their hash'
                style={{ fontSize: "0.78rem" }} />
              <p style={{ fontSize: "0.76rem", color: "var(--vc-text-muted)", marginTop: "0.35rem" }}>
                Content stays off-chain; its hash becomes the audit trail.
              </p>
            </div>
            <div>
              <button className="btn btn-primary" onClick={handleOpen} disabled={opening} id="open-challenge-btn">
                {opening ? "Posting bond…" : `Challenge · lock ${CHALLENGER_BOND_MON} MON`}
              </button>
            </div>
            {lastOpen && (
              <div className="receipt stamp-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: "0.7rem", color: "var(--vc-text-muted)" }}>
                    CHALLENGE {lastOpen.challengeId !== null ? `#${lastOpen.challengeId.toString()} OPEN` : "OPEN"}
                  </span>
                  <span className="seal">BONDED</span>
                </div>
                <a className="btn btn-outline btn-sm" style={{ marginTop: "0.7rem" }} href={disputeTxUrl(lastOpen.txHash)} target="_blank" rel="noreferrer">
                  View on MonadScan ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Live disputes */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem" }}>Disputes on-chain</h2>
            <button className="btn btn-ghost btn-sm" onClick={refresh}>Refresh</button>
          </div>
          {disputes === undefined ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div className="skeleton" style={{ height: 64 }} />
              <div className="skeleton" style={{ height: 64 }} />
            </div>
          ) : disputes === null ? (
            <p style={{ fontSize: "0.85rem", color: "var(--vc-warning)" }}>Registry unreadable — RPC may be down. Retry.</p>
          ) : disputes.length === 0 ? (
            <p style={{ fontSize: "0.88rem", color: "var(--vc-text-muted)", textAlign: "center", padding: "1rem 0" }}>
              No challenges yet. When the red team plants a false claim, it lands here for challenge.
            </p>
          ) : (
            <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
              {disputes.map((d) => (
                <div key={d.id} style={{
                  padding: "0.85rem 1rem", background: "var(--vc-surface-2)",
                  borderRadius: "var(--radius-md)", border: "1px solid var(--vc-border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
                    <strong>Challenge #{d.id} → attestation <a href={`/explorer?id=${d.attestationId.toString()}`} style={{ color: "var(--vc-violet)", textDecoration: "underline" }}>#{d.attestationId.toString()}</a></strong>
                    <span className={`badge ${d.status === 0 ? "badge-challenged" : d.status === 2 ? "badge-slashed" : "badge-active"}`}>
                      {CHALLENGE_STATUS[d.status] ?? d.status}{d.claimed ? " · claimed" : ""}
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: d.status === 0 || mineClaimable(d) ? "0.6rem" : 0 }}>
                    challenger {short(d.challenger)} · bond {d.bond.toString()} wei · {d.status === 0 ? <Countdown endsAt={d.windowEnds} /> : "decided"}
                  </div>
                  {mineClaimable(d) && (
                    <button className="btn btn-primary btn-sm" disabled={claiming !== null} onClick={() => handleClaim(d)} id={`claim-${d.id}`}>
                      {claiming === d.id ? "Claiming…" : "Claim winnings"}
                    </button>
                  )}
                  {d.status !== 0 && !d.claimed && !mineClaimable(d) && (
                    <p style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)" }}>Awaiting the winner's claim.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Red team honesty card */}
        <div className="card" style={{ borderColor: "var(--vc-border-strong)" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Where do false claims come from?</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--vc-text-secondary)", lineHeight: 1.65 }}>
            The red-team operator plants them from a <strong>separate bonded wallet</strong> via the
            platform simulator — never from this console, never from the honest platform's bond.
            A planted claim appears in the list above the moment it's attested. Resolution is the
            arbiter's signature, executed operator-side; winners claim here.
          </p>
        </div>
      </div>
    </div>
  );
}

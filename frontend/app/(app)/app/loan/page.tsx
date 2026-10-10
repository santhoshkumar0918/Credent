"use client";

// My Loan — live underwriting state, live loans, real repayment.
// Origination is owner-only (demo operator): this page never pretends the
// borrower can originate. It reads underwritings(pseudonym), lists YOUR
// loans from the pool, and repays them — each repayment minting a
// P2P_LOAN_REPAYMENT attestation on-chain, surfaced in the receipt.

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { formatEther } from "viem";
import { pseudonymFor } from "@shared/commitments";
import { useEmbeddedWallet, getEmbeddedWalletClient } from "@/lib/wallet";
import {
  readUnderwriting,
  readMyLoans,
  readBalance,
  repayLoan,
  poolTxUrl,
  type Underwriting,
  type Loan,
} from "@/lib/pool";
import type { Address } from "viem";

const PLATFORM_ATTESTER = "0xDCBde073aEBEA2d92394D0206BE5235CEb2eEd2D" as Address;
const UNDERWRITING_VALIDITY_DAYS = 30;

function fmtMON(wei: bigint): string {
  const s = formatEther(wei);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, ".0") : s;
}

export default function LoanPage() {
  const [underwriting, setUnderwriting] = useState<Underwriting | null | undefined>(undefined);
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [repaying, setRepaying] = useState<number | null>(null);
  const [lastRepay, setLastRepay] = useState<{ txHash: string; attestationId: bigint | null } | null>(null);

  const { wallet, address } = useEmbeddedWallet();
  const pseudonym = address ? pseudonymFor(address, PLATFORM_ATTESTER) : null;

  const refresh = useCallback(async () => {
    if (!pseudonym || !address) return;
    try {
      setUnderwriting(await readUnderwriting(pseudonym));
    } catch { setUnderwriting(null); }
    try {
      setLoans(await readMyLoans(address));
    } catch { setLoans([]); }
    try {
      setBalance(await readBalance(address));
    } catch { setBalance(null); }
  }, [pseudonym, address]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleRepay(loan: Loan) {
    if (!wallet) {
      toast.error("Wallet not ready yet.");
      return;
    }
    setRepaying(loan.id);
    try {
      const wc = await getEmbeddedWalletClient(wallet);
      const out = await repayLoan(wc, loan.id, loan.amount);
      setLastRepay(out);
      toast.success(
        out.attestationId !== null
          ? `Repaid in full — attested on-chain as #${out.attestationId}.`
          : "Repaid in full — receipt confirmed.",
      );
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Repayment failed.";
      toast.error(/rejected|denied/i.test(msg) ? "Rejected in wallet — nothing submitted." : msg.slice(0, 160));
    } finally {
      setRepaying(null);
    }
  }

  const openLoan = loans?.find((l) => !l.repaid) ?? null;
  const validityLeft = underwriting
    ? UNDERWRITING_VALIDITY_DAYS - Math.floor((Date.now() / 1000 - Number(underwriting.timestamp)) / 86400)
    : null;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-header">
        <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Borrower · Loan</p>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.35rem" }}>My Loan & Underwriting</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Underwritten from verified attestations · settled in native testnet MON.
        </p>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem", maxWidth: 680 }}>
        {/* Underwriting state */}
        <div className="card gradient-border" style={{ padding: "1.75rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            On-chain underwriting
          </div>
          {underwriting === undefined ? (
            <div className="skeleton" style={{ height: 44 }} />
          ) : underwriting === null ? (
            <div>
              <p className="serif" style={{ fontSize: "1.25rem", marginBottom: "0.4rem" }}>Not underwritten yet.</p>
              <p style={{ fontSize: "0.85rem", color: "var(--vc-text-secondary)", lineHeight: 1.65 }}>
                Underwriting appears after a lender verifies your record and requests it from the pool.
                Scores are computed from attested evidence — never from self-claims, so there's nothing to fill in here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "2rem", alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div className="stat-value" style={{ fontSize: "2.5rem", color: "var(--vc-violet)" }}>{underwriting.score.toString()}</div>
                <div className="stat-label">Pool score (needs ≥ 50)</div>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--vc-text-secondary)" }}>
                Recorded {new Date(Number(underwriting.timestamp) * 1000).toLocaleDateString()}
                {validityLeft !== null && (
                  <> · valid {validityLeft > 0 ? `~${validityLeft} more days` : "— expired, ask your lender to refresh"}</>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loans */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem" }}>Your loans</h2>
            {balance !== null && (
              <span className="mono" style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>
                wallet {fmtMON(balance)} MON
              </span>
            )}
          </div>
          {loans === null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div className="skeleton" style={{ height: 64 }} />
            </div>
          ) : loans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <p style={{ fontSize: "0.9rem", marginBottom: "0.4rem" }}>No loans originated for you yet.</p>
              <p style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", lineHeight: 1.65 }}>
                After underwriting, the demo operator originates your loan on-chain and it appears here for repayment.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {loans.map((l) => (
                <div key={l.id} style={{
                  padding: "1rem 1.1rem", background: "var(--vc-surface-2)",
                  borderRadius: "var(--radius-md)", border: "1px solid var(--vc-border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <strong>Loan #{l.id} · {fmtMON(l.amount)} MON</strong>
                    <span className={`badge ${l.repaid ? "badge-active" : "badge-challenged"}`}>
                      {l.repaid ? "repaid" : "outstanding"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--vc-text-muted)", marginBottom: l.repaid ? 0 : "0.75rem" }}>
                    Due {new Date(Number(l.dueAt) * 1000).toLocaleDateString()}
                    {l.repaid ? " · closed" : Date.now() / 1000 > Number(l.dueAt) ? " · overdue" : " · on track"}
                  </div>
                  {!l.repaid && (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={repaying !== null}
                      onClick={() => handleRepay(l)}
                      id={`repay-loan-${l.id}`}
                    >
                      {repaying === l.id ? "Confirm in wallet…" : `Repay ${fmtMON(l.amount)} MON in full`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {balance !== null && openLoan && balance < openLoan.amount && (
            <p style={{ fontSize: "0.8rem", color: "var(--vc-warning)", marginTop: "0.9rem" }}>
              Wallet balance ({fmtMON(balance)} MON) is below the repayment amount — top up from the Monad faucet first.
            </p>
          )}
          {lastRepay && (
            <div className="receipt stamp-in" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span className="mono" style={{ fontSize: "0.7rem", color: "var(--vc-text-muted)" }}>REPAYMENT · CONFIRMED</span>
                <span className="seal">REPAID</span>
              </div>
              <p style={{ fontSize: "0.88rem" }}>
                {lastRepay.attestationId !== null
                  ? <>Repayment attested on-chain as <strong>#{lastRepay.attestationId.toString()}</strong> — your record grows.</>
                  : "Repayment confirmed on-chain."}
              </p>
              <a className="btn btn-outline btn-sm" style={{ marginTop: "0.7rem" }} href={poolTxUrl(lastRepay.txHash)} target="_blank" rel="noreferrer">
                View repayment on MonadScan ↗
              </a>
            </div>
          )}
        </div>

        {/* Honest lifecycle */}
        <div className="card">
          <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>How borrowing works here</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              "A lender verifies your sealed record against on-chain commitments.",
              "The pool records an underwriting score from that evidence.",
              "The demo operator originates your loan on-chain.",
              "You repay in full — the pool mints a repayment attestation, raising your future limit.",
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: "var(--vc-success-dim)",
                  color: "var(--vc-violet-dim)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>
                <span style={{ fontSize: "0.875rem", color: "var(--vc-text-secondary)", paddingTop: "0.15rem" }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className="badge badge-demo">Settled in native testnet MON</span>
            <span className="badge badge-demo">Full repayment mints new attestation</span>
          </div>
        </div>
      </div>
    </div>
  );
}

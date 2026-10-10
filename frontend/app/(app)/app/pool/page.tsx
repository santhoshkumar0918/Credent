"use client";

// Demo pool — exactly what MockLendingPool is, nothing it isn't: a pot of
// testnet MON that funds underwritten loans. No tranches, no reserve fund,
// no waterfall — those don't exist on-chain and aren't shown. Anyone can
// fund; the operator originates; borrowers repay (which mints attestations).

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useEmbeddedWallet, getEmbeddedWalletClient } from "@/lib/wallet";
import { fundPool, poolTxUrl } from "@/lib/pool";
import { readPoolBook, fmtMON } from "@/lib/lender";

function short(hex: string) {
  return hex.length > 16 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex;
}

export default function PoolPage() {
  const { wallet } = useEmbeddedWallet();
  const [book, setBook] = useState<{ loans: { id: number; borrower: string; amount: bigint; dueAt: bigint; repaid: boolean }[]; balance: bigint } | null | undefined>(undefined);
  const [amount, setAmount] = useState("1");
  const [funding, setFunding] = useState(false);
  const [fundTx, setFundTx] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBook(await readPoolBook());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleFund() {
    const v = parseFloat(amount);
    if (!amount || isNaN(v) || v <= 0) {
      toast.error("Enter a MON amount above zero.");
      return;
    }
    if (!wallet) {
      toast.error("Wallet not ready.");
      return;
    }
    setFunding(true);
    setFundTx(null);
    try {
      const wc = await getEmbeddedWalletClient(wallet);
      const tx = await fundPool(wc, amount);
      setFundTx(tx);
      toast.success(`Funded ${v} MON to the demo pool.`);
      setAmount("1");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Funding failed.";
      toast.error(/rejected|denied/i.test(msg) ? "Rejected in wallet." : msg.slice(0, 160));
    } finally {
      setFunding(false);
    }
  }

  const outstanding = book && book !== null
    ? book.loans.filter((l) => !l.repaid).reduce((s, l) => s + l.amount, BigInt(0))
    : null;
  const repaid = book && book !== null ? book.loans.filter((l) => l.repaid).length : null;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-header">
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.4rem" }}>
          <p className="eyebrow">Lender · Pool</p>
          <span className="badge badge-demo">demo pool · testnet MON</span>
        </div>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.35rem" }}>Lending pool</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Capital backing proof-gated loans. What you see is everything the contract does.
        </p>
      </div>

      <div className="page-body" style={{ display: "grid", gap: "1.5rem" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.05rem" }}>Pool capital</h2>
            <button className="btn btn-ghost btn-sm" onClick={refresh}>Refresh</button>
          </div>
          {book === undefined ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
              <div className="skeleton" style={{ height: 56 }} />
              <div className="skeleton" style={{ height: 56 }} />
              <div className="skeleton" style={{ height: 56 }} />
            </div>
          ) : book === null ? (
            <p style={{ fontSize: "0.88rem", color: "var(--vc-warning)" }}>Pool unreadable — RPC may be down. Retry.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: "1.4rem" }}>{fmtMON(book.balance)} MON</div>
                <div className="stat-label">Pool balance</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: "1.4rem" }}>{outstanding !== null ? fmtMON(outstanding) : "—"} MON</div>
                <div className="stat-label">Outstanding</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: "1.4rem" }}>{book.loans.length}</div>
                <div className="stat-label">Loans originated</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: "1.4rem" }}>{repaid ?? "—"}</div>
                <div className="stat-label">Repaid</div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Fund the pool</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--vc-text-muted)", marginBottom: "1rem" }}>
            Anyone can add liquidity — it funds originated loans and absorbs no risk beyond the demo.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
            <input className="input-field mono" value={amount} onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal" style={{ width: 140 }} aria-label="MON amount" id="pool-deposit-input" />
            <span style={{ fontSize: "0.85rem", color: "var(--vc-text-muted)" }}>MON</span>
            <button className="btn btn-primary btn-sm" onClick={handleFund} disabled={funding} id="pool-deposit-btn">
              {funding ? "Confirm in wallet…" : "Deposit to pool"}
            </button>
          </div>
          {fundTx && (
            <a className="btn btn-outline btn-sm" style={{ marginTop: "0.8rem" }} href={poolTxUrl(fundTx)} target="_blank" rel="noreferrer">
              View funding on MonadScan ↗
            </a>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>Originated loans</h2>
          {book === undefined || book === null ? (
            <p style={{ fontSize: "0.85rem", color: "var(--vc-text-muted)" }}>
              {book === null ? "Unavailable — see above." : "Loading…"}
            </p>
          ) : book.loans.length === 0 ? (
            <p style={{ fontSize: "0.88rem", color: "var(--vc-text-muted)", textAlign: "center", padding: "1rem 0" }}>
              No loans yet. Underwrite in the lender console, then the operator originates.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {book.loans.map((l) => (
                <div key={l.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem",
                  padding: "0.7rem 0.9rem", background: "var(--vc-surface-2)",
                  borderRadius: "var(--radius-md)", fontSize: "0.85rem", flexWrap: "wrap",
                }}>
                  <span><strong>#{l.id}</strong> · {fmtMON(l.amount)} MON · {short(l.borrower)}</span>
                  <span className={`badge ${l.repaid ? "badge-active" : "badge-challenged"}`}>
                    {l.repaid ? "repaid" : `due ${new Date(Number(l.dueAt) * 1000).toLocaleDateString()}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ background: "var(--vc-success-dim)", borderColor: "rgba(14,107,62,0.25)" }}>
          <p style={{ fontSize: "0.83rem", color: "var(--vc-text-secondary)", lineHeight: 1.65 }}>
            <strong>Honest scope:</strong> fund → underwrite → originate → repay. That is the whole
            contract — no tranches, no reserve, no waterfall. Anything beyond that is roadmap, not demo.
          </p>
        </div>
      </div>
    </div>
  );
}

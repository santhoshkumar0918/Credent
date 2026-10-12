"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRole } from "@/lib/role-context";
import { useWalletAddress } from "@/lib/wallet";
import { fetchAdminWallets } from "@/lib/api-client";
import { SystemHealthBadge } from "@/components/SystemHealthBadge";

export default function SettingsPage() {
  const { role, logoutAndClear } = useRole();
  const { user } = usePrivy();
  const address = useWalletAddress();
  const [wallets, setWallets] = useState<Array<{ roleName: string; address: string; balanceMON: string }> | null>(null);
  const [walletsDown, setWalletsDown] = useState(false);

  useEffect(() => {
    async function loadWallets() {
      try {
        const res = await fetchAdminWallets();
        setWallets(res.wallets || []);
        setWalletsDown(false);
      } catch {
        // No fabricated fallback: operator balances are unknown when the
        // API is unreachable. Show that instead of fake addresses.
        setWallets(null);
        setWalletsDown(true);
      }
    }

    loadWallets();
  }, []);

  const identity = user?.email?.address ?? user?.phone?.number ?? "Verified account";

  return (
    <div className="fade-in page-shell">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700 }}>
            Account & System Settings
          </h1>
          <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
            Manage your Credent identity, system health status, and wallet roles.
          </p>
        </div>
        <SystemHealthBadge />
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 740 }}>
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Profile Identity</h2>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--vc-border)" }}>
          <span style={{ color: "var(--vc-text-muted)", fontSize: "0.88rem" }}>Active Role</span>
          <span className="badge badge-active" style={{ fontSize: "0.75rem" }}>{role}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--vc-border)" }}>
          <span style={{ color: "var(--vc-text-muted)", fontSize: "0.88rem" }}>Embedded Wallet</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--vc-text-secondary)" }}>
            {address || "provisioning…"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0" }}>
          <span style={{ color: "var(--vc-text-muted)", fontSize: "0.88rem" }}>Signed in as</span>
          <span style={{ fontSize: "0.88rem", color: "var(--vc-text-primary)" }}>{identity}</span>
        </div>
      </div>

      {/* Admin Wallet Balances Inspector (Demo Mode Only) */}
      {process.env.NEXT_PUBLIC_DEMO_MODE !== "false" && (
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>System Wallet Balances & Bonding</h2>
            <span className="badge badge-demo" style={{ fontSize: "0.68rem" }}>Monad Testnet Demo</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {walletsDown ? (
              <p style={{ fontSize: "0.85rem", color: "var(--vc-warning)" }}>
                Operator endpoint offline — balances unknown, not shown.
              </p>
            ) : wallets === null ? (
              <div className="skeleton" style={{ height: 56 }} />
            ) : (
              wallets.map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--vc-surface-2)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{w.roleName}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>{w.address}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--vc-violet-dim)", fontSize: "0.9rem" }}>
                    {w.balanceMON.includes("MON") ? w.balanceMON : `${w.balanceMON} MON`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: "1.5rem", border: "1px solid rgba(201, 58, 58, 0.3)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--vc-danger)", marginBottom: "0.5rem" }}>Session Security</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--vc-text-muted)", marginBottom: "1rem" }}>
          Signing out clears your active browser session and local role state.
        </p>

        <button
          onClick={() => logoutAndClear()}
          className="btn btn-outline btn-md"
          style={{ color: "var(--vc-danger)", borderColor: "var(--vc-danger)", cursor: "pointer" }}
        >
          Sign Out of Credent
        </button>
      </div>
      </div>
    </div>
  );
}

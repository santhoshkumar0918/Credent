"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/lib/role-context";
import { useWalletAddress } from "@/lib/wallet";
import { fetchAdminWallets } from "@/lib/api-client";
import { SystemHealthBadge } from "@/components/SystemHealthBadge";

export default function SettingsPage() {
  const { role, logoutAndClear } = useRole();
  const address = useWalletAddress();
  const [wallets, setWallets] = useState<Array<{ roleName: string; address: string; balanceMON: string }>>([]);

  useEffect(() => {
    async function loadWallets() {
      try {
        const res = await fetchAdminWallets();
        setWallets(res.wallets || []);
      } catch {
        // Dev default balances
        setWallets([
          { roleName: "Platform Attester (SwiftDeliver)", address: "0x4f3e...3b1d", balanceMON: "5.0 MON (Bonded)" },
          { roleName: "Red-Team Attester 1", address: "0x6c34...4cda", balanceMON: "5.0 MON (Bonded)" },
          { roleName: "Watcher Fraud Auditor", address: "0x8a1b...cdef", balanceMON: "10.0 MON" },
          { roleName: "Gasless Consent Relayer", address: "0x1122...eeff", balanceMON: "2.5 MON" },
          { roleName: "Arbiter Deployer Key", address: "0xaabb...8900", balanceMON: "1.6 MON" },
        ]);
      }
    }

    loadWallets();
  }, []);

  return (
    <div style={{ maxWidth: 740, display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700 }}>
            Account & System Settings
          </h1>
          <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
            Manage your Vouchain identity, system health status, and wallet roles.
          </p>
        </div>
        <SystemHealthBadge />
      </div>

      <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Profile Identity</h2>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--vc-border)" }}>
          <span style={{ color: "var(--vc-text-muted)", fontSize: "0.88rem" }}>Active Role</span>
          <span className="badge badge-active" style={{ fontSize: "0.75rem" }}>{role}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--vc-border)" }}>
          <span style={{ color: "var(--vc-text-muted)", fontSize: "0.88rem" }}>Embedded Wallet</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--vc-text-secondary)" }}>
            {address || "0x5f2e...b1"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0" }}>
          <span style={{ color: "var(--vc-text-muted)", fontSize: "0.88rem" }}>Verified Phone</span>
          <span style={{ fontSize: "0.88rem", color: "var(--vc-text-primary)" }}>+91 98765 43210</span>
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
            {wallets.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--vc-surface-2)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{w.roleName}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>{w.address}</div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#38BDF8", fontSize: "0.9rem" }}>
                  {w.balanceMON.includes("MON") ? w.balanceMON : `${w.balanceMON} MON`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: "1.5rem", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#EF4444", marginBottom: "0.5rem" }}>Session Security</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--vc-text-muted)", marginBottom: "1rem" }}>
          Signing out clears your active browser session and local role state.
        </p>

        <button
          onClick={() => logoutAndClear()}
          className="btn btn-outline btn-md"
          style={{ color: "#EF4444", borderColor: "#EF4444", cursor: "pointer" }}
        >
          Sign Out of Vouchain
        </button>
      </div>
    </div>
  );
}

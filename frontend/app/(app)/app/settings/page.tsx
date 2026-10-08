"use client";

import { useRole } from "@/lib/role-context";
import { useWalletAddress } from "@/lib/wallet";

export default function SettingsPage() {
  const { role, logoutAndClear } = useRole();
  const address = useWalletAddress();

  return (
    <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700 }}>
          Account Settings
        </h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Manage your Vouchain identity, linked platforms, and security preferences.
        </p>
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

      <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Linked Gig Platforms</h2>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--vc-surface-2)" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>SwiftDeliver Pilot Platform</div>
            <div style={{ fontSize: "0.78rem", color: "var(--vc-text-muted)" }}>Attester ID: 0x84a8...152d • T2 Source-Verified</div>
          </div>
          <span className="badge badge-active" style={{ fontSize: "0.68rem" }}>ACTIVE LINK</span>
        </div>
      </div>

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

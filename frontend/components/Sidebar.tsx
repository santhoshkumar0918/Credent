"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useRole, type Role } from "@/lib/role-context";
import { useWalletAddress, useWalletBalance } from "@/lib/wallet";
import toast from "react-hot-toast";
import { ROLE_NAV, ROLE_LABELS, ROLE_COLORS, ROLE_HOME, Icon, isNavActive, roleHasRoute } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, allRoles, logoutAndClear } = useRole();
  const { authenticated } = usePrivy();
  const address = useWalletAddress();
  const balance = useWalletBalance();

  function copyAddress() {
    if (!address) return;
    navigator.clipboard?.writeText(address).then(
      () => toast.success("Wallet address copied."),
      () => toast.error("Copy failed — select manually."),
    );
  }

  const balanceText =
    balance === undefined ? "…" : balance === null ? "balance offline" : `${trimMon(balance)} MON`;

  const currentNav = ROLE_NAV[role] ?? ROLE_NAV.SUBJECT;

  function handleRoleChange(next: Role) {
    setRole(next);
    // Role state alone does not change the route: if the current page is not
    // in the newly selected role’s menu, navigate to that role’s landing page.
    if (!roleHasRoute(next, pathname)) {
      router.push(ROLE_HOME[next] ?? "/app/home");
    }
  }

  function shortAddress(addr: string | null) {
    if (!addr) return "creating…";
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  function trimMon(wei: string) {
    const dot = wei.indexOf(".");
    return dot === -1 ? wei : wei.slice(0, dot + 5);
  }

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <Link href={ROLE_HOME[role] ?? "/app/home"} style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
          <img src="/logo.jpeg" alt="C" width={32} height={32} style={{ borderRadius: 10 }} />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "1.2rem", letterSpacing: "-0.01em" }}>
            redent
          </span>
        </Link>
      </div>

      {/* Role-Based Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">{ROLE_LABELS[role] ?? role}</div>
        {currentNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item${isNavActive(pathname, item.href) ? " active" : ""}`}
          >
            <Icon name={item.icon} className="sidebar-icon" />
            {item.label}
          </Link>
        ))}

        <div style={{ flex: 1 }} />

        {/* Demo Role Switcher */}
        {isDemoMode && (
          <div style={{ padding: "0.75rem 0", borderTop: "1px solid var(--vc-border)" }}>
            <div className="sidebar-section">Role Switcher (Demo)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {allRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`sidebar-item${role === r ? " active" : ""}`}
                  style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                >
                  <span className={`badge ${ROLE_COLORS[r]}`} style={{ fontSize: "0.65rem" }}>
                    {ROLE_LABELS[r] ?? r}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* User Footer */}
        {authenticated && (
          <div
            style={{
              margin: "0.5rem 0.75rem 0",
              padding: "0.6rem 0.75rem",
              background: "var(--vc-surface-2)",
              border: "1px solid var(--vc-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.25rem" }}>
              Connected Wallet
            </div>
            <button
              onClick={copyAddress}
              title={address ?? "Wallet provisioning…"}
              disabled={!address}
              className="mono"
              style={{
                fontSize: "0.8rem", color: "var(--vc-text-secondary)", cursor: address ? "pointer" : "default",
                background: "none", border: "none", padding: 0, textAlign: "left", width: "100%",
              }}
            >
              {shortAddress(address)} {address ? "⧉" : ""}
            </button>
            <div className="mono" style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginTop: "0.15rem" }}>
              {balanceText}{balance != null ? " · testnet" : ""}
            </div>
            <button
              onClick={() => logoutAndClear()}
              className="btn btn-ghost btn-sm"
              style={{ marginTop: "0.4rem", padding: "0.2rem 0", fontSize: "0.75rem", width: "100%", textAlign: "left", color: "var(--vc-danger)" }}
            >
              Log out →
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}

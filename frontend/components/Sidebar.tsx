"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useRole, type Role } from "@/lib/role-context";
import { useWalletAddress } from "@/lib/wallet";
import { ROLE_NAV, ROLE_LABELS, ROLE_COLORS, ROLE_HOME, Icon, isNavActive, roleHasRoute } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, allRoles, logoutAndClear } = useRole();
  const { authenticated } = usePrivy();
  const address = useWalletAddress();

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

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <Link href={ROLE_HOME[role] ?? "/app/home"} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0E6B3E, #054F2E)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.05rem",
              fontWeight: 500,
              color: "#FFFDF7",
              fontFamily: "var(--font-heading)",
            }}
          >
            V
          </div>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "1.2rem", letterSpacing: "-0.01em" }}>
            Credent
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
            <div className="mono" style={{ fontSize: "0.8rem", color: "var(--vc-text-secondary)" }}>
              {shortAddress(address)}
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

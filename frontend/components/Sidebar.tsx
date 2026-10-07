"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useRole } from "@/lib/role-context";
import { useWalletAddress } from "@/lib/wallet";

// Icons as inline SVGs (no icon lib needed)
const icons: Record<string, string> = {
  attester: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  record:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/></svg>`,
  consent:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>`,
  loan:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>`,
  lender:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>`,
  challenge:`<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>`,
  explorer: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/></svg>`,
  pool:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"/></svg>`,
  home:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>`,
};

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={`inline-flex ${className}`}
      dangerouslySetInnerHTML={{ __html: icons[name] ?? "" }}
    />
  );
}

const SUBJECT_NAV = [
  { href: "/record",  label: "My Record",    icon: "record" },
  { href: "/consent", label: "Consent",       icon: "consent" },
  { href: "/loan",    label: "My Loan",       icon: "loan" },
];
const ATTESTER_NAV = [
  { href: "/attester", label: "Dashboard",   icon: "attester" },
];
const LENDER_NAV = [
  { href: "/lender",   label: "Console",     icon: "lender" },
];
const WATCHER_NAV = [
  { href: "/challenge",label: "Challenges",  icon: "challenge" },
];
const SHARED_NAV = [
  { href: "/explorer", label: "Explorer",    icon: "explorer" },
  { href: "/pool",     label: "Pool",        icon: "pool" },
];

const ROLE_NAV: Record<string, typeof SUBJECT_NAV> = {
  SUBJECT: SUBJECT_NAV,
  ATTESTER: ATTESTER_NAV,
  LENDER: LENDER_NAV,
  WATCHER: WATCHER_NAV,
};

const ROLE_COLORS: Record<string, string> = {
  SUBJECT:  "badge-tier2",
  ATTESTER: "badge-active",
  LENDER:   "badge-tier3",
  WATCHER:  "badge-challenged",
};

export function Sidebar() {
  const pathname = usePathname();
  const { role, setRole, allRoles } = useRole();
  const { authenticated, logout } = usePrivy();
  const address = useWalletAddress();

  const primaryNav = ROLE_NAV[role] ?? [];

  function shortAddress(addr: string | null) {
    if (!addr) return "---";
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #7C3AED, #38BDF8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", fontWeight: 700, color: "#fff", fontFamily: "var(--font-heading)",
          }}>V</div>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.05rem" }}>
            Vouchain
          </span>
        </Link>
      </div>

      {/* Primary nav (role-specific) */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">{role}</div>
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item${pathname === item.href ? " active" : ""}`}
          >
            <Icon name={item.icon} className="sidebar-icon" />
            {item.label}
          </Link>
        ))}

        {/* Shared nav */}
        <div className="sidebar-section" style={{ marginTop: "0.5rem" }}>Open</div>
        {SHARED_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item${pathname === item.href ? " active" : ""}`}
          >
            <Icon name={item.icon} className="sidebar-icon" />
            {item.label}
          </Link>
        ))}

        <div style={{ flex: 1 }} />

        {/* Role switcher */}
        <div style={{ padding: "0.75rem 0", borderTop: "1px solid var(--vc-border)" }}>
          <div className="sidebar-section">Switch role (demo)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {allRoles.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`sidebar-item${role === r ? " active" : ""}`}
                style={{ width: "100%", textAlign: "left" }}
              >
                <span className={`badge ${ROLE_COLORS[r]}`} style={{ fontSize: "0.65rem" }}>
                  {r}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Wallet pill */}
        {authenticated && (
          <div style={{
            margin: "0.5rem 0.75rem 0",
            padding: "0.6rem 0.75rem",
            background: "var(--vc-surface-2)",
            border: "1px solid var(--vc-border)",
            borderRadius: "var(--radius-md)",
          }}>
            <div style={{ fontSize: "0.72rem", color: "var(--vc-text-muted)", marginBottom: "0.25rem" }}>Connected</div>
            <div style={{ fontSize: "0.8rem", color: "var(--vc-text-secondary)", fontFamily: "var(--font-mono)" }}>
              {shortAddress(address)}
            </div>
            <button
              onClick={() => logout()}
              className="btn btn-ghost btn-sm"
              style={{ marginTop: "0.4rem", padding: "0.2rem 0", fontSize: "0.75rem" }}
            >
              Sign out
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}

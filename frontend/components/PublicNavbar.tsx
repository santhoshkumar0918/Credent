"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export function PublicNavbar() {
  const pathname = usePathname();
  const { authenticated } = usePrivy();

  const links = [
    { href: "/how-it-works", label: "How it works" },
    { href: "/explorer", label: "Explorer" },
    { href: "/transparency", label: "Transparency" },
  ];

  return (
    <header
      className="public-nav"
      style={{
        padding: "1.25rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--vc-border)",
        position: "sticky",
        top: 0,
        background: "rgba(255, 253, 247, 0.88)",
        backdropFilter: "blur(12px)",
        zIndex: 50,
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "flex-end", gap: "0.05rem" }}>
          <img src="/logo.jpeg" alt="C" width={36} height={36} style={{ borderRadius: 10 }} />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "1.25rem", color: "var(--vc-text-primary)", lineHeight: 1, paddingBottom: "0.32rem" }}>
            redent
          </span>
      </Link>

      <nav className="public-nav-links" style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              fontSize: "0.9rem",
              fontWeight: 500,
              color: pathname === item.href ? "var(--vc-violet-dim)" : "var(--vc-text-secondary)",
              transition: "color 0.15s ease",
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div>
        {authenticated ? (
          <Link href="/app/home" className="btn btn-primary btn-md">
            Open Dashboard →
          </Link>
        ) : (
          <Link href="/login" className="btn btn-primary btn-md">
            Get Started
          </Link>
        )}
      </div>
    </header>
  );
}

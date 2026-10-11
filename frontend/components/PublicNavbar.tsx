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
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0E6B3E, #054F2E)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              fontWeight: 500,
              color: "#FFFDF7",
              fontFamily: "var(--font-heading)",
            }}
          >
            V
          </div>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "1.25rem", color: "var(--vc-text-primary)" }}>
            Vouchain
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

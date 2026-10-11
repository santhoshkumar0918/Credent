"use client";

// Home — the borrower's launchpad. One live number (sealed attestation
// count from the record API), three next actions, zero invented scores.
// Anything richer lives on its own screen (record, consent, loan).

import { useState, useEffect } from "react";
import { pseudonymFor } from "@shared/commitments";
import { apiFetch } from "@/lib/api-client";
import { useEmbeddedWallet } from "@/lib/wallet";
import { useRole } from "@/lib/role-context";
import { ROLE_LABELS } from "@/lib/nav";
import type { Address } from "viem";

const PLATFORM_ATTESTER = "0xDCBde073aEBEA2d92394D0206BE5235CEb2eEd2D" as Address;

const ACTIONS = [
  {
    href: "/app/record",
    title: "View my record",
    desc: "Sealed attestations, live from chain — amounts stay committed until you share.",
  },
  {
    href: "/app/consent",
    title: "Share with a lender",
    desc: "Sign a scoped, expiring grant. Revoke it anytime.",
  },
  {
    href: "/app/loan",
    title: "Borrow & repay",
    desc: "Underwritten from evidence. Repayment mints new attestations.",
  },
];

export default function HomePage() {
  const [count, setCount] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const { address } = useEmbeddedWallet();
  const { role } = useRole();

  useEffect(() => {
    if (!address) return;
    apiFetch<{ attestations: unknown[] }>(`/api/subjects/${pseudonymFor(address, PLATFORM_ATTESTER)}/attestations`)
      .then((res) => {
        setCount(res.attestations?.length ?? 0);
        setOffline(false);
      })
      .catch(() => {
        setCount(null);
        setOffline(true);
      });
  }, [address]);

  return (
    <div className="fade-in page-shell">
      <div className="page-header">
        <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>{ROLE_LABELS[role] ?? "Borrower"} · Home</p>
        <h1 className="serif" style={{ fontSize: "clamp(1.9rem, 3.5vw, 2.6rem)", fontWeight: 400, maxWidth: 560 }}>
          Your payments, witnessed and sealed.
        </h1>
      </div>
      <div className="page-body" style={{ display: "grid", gap: "1.25rem", maxWidth: 720 }}>
        <div className="card" style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
          {count === null ? (
            offline ? (
              <p style={{ fontSize: "0.9rem", color: "var(--vc-text-secondary)" }}>
                Record service offline — your attestations are safe on-chain; the count returns when the API is back.
              </p>
            ) : (
              <div className="skeleton" style={{ height: 44, width: 220 }} />
            )
          ) : (
            <>
              <span className="stat-value" style={{ fontSize: "2.75rem" }}>{count}</span>
              <span style={{ fontSize: "0.9rem", color: "var(--vc-text-secondary)" }}>
                sealed attestation{count === 1 ? "" : "s"} on your record
              </span>
            </>
          )}
        </div>
        <div className="stagger" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {ACTIONS.map((a) => (
            <a key={a.href} href={a.href} className="card card-glow" style={{ textDecoration: "none" }}>
              <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>{a.title} →</h2>
              <p style={{ fontSize: "0.83rem", color: "var(--vc-text-secondary)", lineHeight: 1.6 }}>{a.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

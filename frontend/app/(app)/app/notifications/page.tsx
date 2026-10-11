"use client";

// Activity — a browser-local feed of YOUR actions (grants made here, with
// live on-chain status). This is not a push-notification center: SMS/
// WhatsApp alerts are operator tooling via the notify API, configured
// per-deployment. Nothing here is invented — an empty feed says so.

import { useState, useEffect } from "react";
import { hasLiveGrant, loadGrants, type SavedGrant } from "@/lib/consent";
import { pseudonymFor } from "@shared/commitments";
import { useEmbeddedWallet } from "@/lib/wallet";
import type { Address } from "viem";

const PLATFORM_ATTESTER = "0xDCBde073aEBEA2d92394D0206BE5235CEb2eEd2D" as Address;

function short(hex: string) {
  return hex.length > 16 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex;
}

export default function NotificationsPage() {
  const { address } = useEmbeddedWallet();
  const [items, setItems] = useState<(SavedGrant & { live: boolean | null })[] | null>(null);

  useEffect(() => {
    async function load() {
      const saved = loadGrants();
      if (!address) {
        setItems(saved.map((g) => ({ ...g, live: null })));
        return;
      }
      const pseudo = pseudonymFor(address, PLATFORM_ATTESTER);
      const checked = await Promise.all(
        saved.map(async (g) => {
          try {
            return { ...g, live: await hasLiveGrant(pseudo, g.viewer as Address) };
          } catch {
            return { ...g, live: null as boolean | null };
          }
        }),
      );
      setItems(checked);
    }
    load();
  }, [address]);

  return (
    <div className="fade-in page-shell">
      <div className="page-header">
        <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Borrower · Activity</p>
        <h1 className="serif" style={{ fontSize: "1.8rem", marginBottom: "0.35rem" }}>Your activity</h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          Consent actions taken in this browser, each re-checked against the chain.
        </p>
      </div>

      <div className="page-body" style={{ maxWidth: 750 }}>
      {items === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div className="skeleton" style={{ height: 72 }} />
          <div className="skeleton" style={{ height: 72 }} />
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="serif" style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Nothing yet.</p>
          <p style={{ fontSize: "0.85rem", color: "var(--vc-text-muted)", marginBottom: "1.25rem" }}>
            Grants you sign and revocations you make will appear here with their live on-chain status.
          </p>
          <a href="/app/consent" className="btn btn-primary btn-sm">Grant your first consent →</a>
        </div>
      ) : (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {items.map((item) => (
            <div key={item.viewer + item.at} className="card" style={{ padding: "1.1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: "0.25rem" }}>
                    Granted {item.viewerLabel} access
                  </div>
                  <div className="mono" style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)" }}>
                    {short(item.viewer)} · {item.eventTypes.join(", ")} · {new Date(item.at).toLocaleString()}
                  </div>
                </div>
                <span className={`badge ${item.live === true ? "badge-active" : item.live === false ? "badge-slashed" : "badge-challenged"}`}>
                  {item.live === true ? "live on-chain" : item.live === false ? "ended" : "unconfirmed"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export default function NotificationsPage() {
  const [items] = useState([
    {
      id: "notif_1",
      title: "Payout Confirmed by SwiftDeliver",
      message: "Your payout of ₹25,000 was confirmed and attested (Tier 2). Your available limit is now ₹15,000.",
      time: "2 hours ago",
      type: "SUCCESS",
    },
    {
      id: "notif_2",
      title: "Access Granted to MicroLend Finance",
      message: "You granted a 7-day scoped consent grant to MicroLend Finance.",
      time: "1 day ago",
      type: "INFO",
    },
    {
      id: "notif_3",
      title: "Loan Repayment Routed Automatically",
      message: "10% share (₹2,500) auto-deducted towards your active loan repayment.",
      time: "3 days ago",
      type: "SUCCESS",
    },
  ]);

  return (
    <div style={{ maxWidth: 750, display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700 }}>
          Notifications & Alerts
        </h1>
        <p style={{ color: "var(--vc-text-secondary)", fontSize: "0.9rem" }}>
          SMS, WhatsApp, and in-app alerts sent via Twilio notification agents.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {items.map((item) => (
          <div key={item.id} className="card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>{item.title}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--vc-text-secondary)", lineHeight: 1.5 }}>{item.message}</div>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", whiteSpace: "nowrap", marginLeft: "1rem" }}>
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

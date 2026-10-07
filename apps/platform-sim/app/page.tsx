"use client";

import { useState } from "react";

interface PayoutEvent {
  id: string;
  workerId: string;
  workerName: string;
  amount: string;
  eventType: "GIG_PAYOUT" | "RENT" | "BNPL_INSTALLMENT";
  outcome: "ON_TIME" | "LATE" | "MISSED" | "FABRICATED_CLAIM";
  proofTier: number;
  txHash: string;
  timestamp: string;
}

export default function PlatformSimDashboard() {
  const [events, setEvents] = useState<PayoutEvent[]>([
    {
      id: "evt_101",
      workerId: "worker_9821",
      workerName: "Meena (SwiftDeliver Pilot Worker)",
      amount: "₹25,000",
      eventType: "GIG_PAYOUT",
      outcome: "ON_TIME",
      proofTier: 2,
      txHash: "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [cycle, setCycle] = useState(6);

  const triggerPayout = (outcome: "ON_TIME" | "LATE" | "MISSED" | "FABRICATED_CLAIM") => {
    setLoading(true);
    setTimeout(() => {
      const newEvent: PayoutEvent = {
        id: `evt_${Date.now().toString().slice(-4)}`,
        workerId: "worker_9821",
        workerName: "Meena (SwiftDeliver Pilot Worker)",
        amount: outcome === "MISSED" ? "₹0" : "₹25,000",
        eventType: "GIG_PAYOUT",
        outcome,
        proofTier: outcome === "FABRICATED_CLAIM" ? 1 : 2,
        txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setEvents((prev) => [newEvent, ...prev]);
      if (outcome === "ON_TIME") setCycle((c) => c + 1);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border border-purple-500/20">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">SwiftDeliver Operator Portal</h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              pilot platform
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Bonded: 100 MON
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Simulated gig-platform payout engine & attestation webhook dispatcher for Monad Metropolis hackathon.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Current Payout Cycle</div>
          <div className="text-2xl font-bold text-purple-400">Cycle #{cycle}</div>
        </div>
      </div>

      {/* Operator Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Worker Account Link Status */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Active Worker Status</h2>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Worker ID</span>
              <span className="font-mono text-purple-300">worker_9821 (Meena)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Vouchain Pseudonym</span>
              <span className="font-mono text-xs text-slate-300">0x5f2e...b1</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Verification Status</span>
              <span className="text-emerald-400 font-medium">✓ Linked & Attested (Tier 2)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">On-Time Payout Record</span>
              <span className="text-slate-200 font-semibold">24 / 24 On-Time</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Payout & Fraud Controls</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => triggerPayout("ON_TIME")}
              disabled={loading}
              className="p-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium text-sm transition text-left flex flex-col gap-1 disabled:opacity-50 cursor-pointer"
            >
              <span className="font-semibold text-base">🟢 On-Time Payout</span>
              <span className="text-xs text-emerald-500/80">Trigger ₹25,000 payout + T2 attestation</span>
            </button>

            <button
              onClick={() => triggerPayout("LATE")}
              disabled={loading}
              className="p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium text-sm transition text-left flex flex-col gap-1 disabled:opacity-50 cursor-pointer"
            >
              <span className="font-semibold text-base">⏰ Late Payout</span>
              <span className="text-xs text-amber-500/80">Trigger delayed payout + LATE tag</span>
            </button>

            <button
              onClick={() => triggerPayout("MISSED")}
              disabled={loading}
              className="p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium text-sm transition text-left flex flex-col gap-1 disabled:opacity-50 cursor-pointer"
            >
              <span className="font-semibold text-base">❌ Missed Payout</span>
              <span className="text-xs text-red-500/80">Trigger missed cycle + default alert</span>
            </button>

            <button
              onClick={() => triggerPayout("FABRICATED_CLAIM")}
              disabled={loading}
              className="p-3.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-medium text-sm transition text-left flex flex-col gap-1 disabled:opacity-50 cursor-pointer"
            >
              <span className="font-semibold text-base">🚨 Plant False Claim</span>
              <span className="text-xs text-purple-500/80">Fabricate hash to trigger challenge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Webhook & Attestation Log Feed */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-200">Attestation Webhook Dispatch Feed</h2>
          <span className="text-xs text-slate-400">{events.length} dispatches logged</span>
        </div>

        <div className="space-y-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4 font-mono text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-sans font-semibold text-[10px] ${
                      evt.outcome === "ON_TIME"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : evt.outcome === "LATE"
                        ? "bg-amber-500/20 text-amber-400"
                        : evt.outcome === "MISSED"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {evt.outcome}
                  </span>
                  <span className="text-slate-300 font-sans font-medium">{evt.workerName}</span>
                  <span className="text-slate-500">({evt.eventType})</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Tx Hash: <span className="text-slate-400">{evt.txHash.slice(0, 18)}...</span> | Proof Tier: T{evt.proofTier}
                </div>
              </div>
              <div className="text-right font-sans">
                <div className="text-slate-200 font-semibold">{evt.amount}</div>
                <div className="text-slate-500 text-[11px]">{evt.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

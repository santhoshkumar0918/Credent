import { NextResponse } from "next/server";

// Shared in-memory ledger for platform-sim service
export interface LedgerEntry {
  id: string;
  workerId: string;
  amount: string;
  currency: string;
  eventType: string;
  outcome: string;
  proofTier: number;
  txHash: string;
  timestamp: number;
  attesterAddress: string;
  isRedTeam: boolean;
}

export const payoutLedger: LedgerEntry[] = [
  {
    id: "legit_001",
    workerId: "worker_9821",
    amount: "25000.00",
    currency: "INR",
    eventType: "GIG_PAYOUT",
    outcome: "ON_TIME",
    proofTier: 2,
    txHash: "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    timestamp: Math.floor(Date.now() / 1000) - 86400 * 30,
    attesterAddress: "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
    isRedTeam: false,
  },
];

export async function GET() {
  return NextResponse.json({
    platform: "SwiftDeliver Pilot Platform",
    ledger: payoutLedger,
    count: payoutLedger.length,
    timestamp: new Date().toISOString(),
  });
}

import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, stringToBytes } from "viem";

// Demo pilot platform attester key for SwiftDeliver
// (Consistent local dev key — never used with real funds)
const SWIFTDELIVER_DEMO_KEY = (process.env.PLATFORM_PRIVATE_KEY ||
  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d") as `0x${string}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outcome, workerId = "worker_9821", amount = "25000.00" } = body;

    const account = privateKeyToAccount(SWIFTDELIVER_DEMO_KEY);
    const platformAttester = account.address;
    const timestamp = Math.floor(Date.now() / 1000);
    const eventType = "GIG_PAYOUT";
    const currency = "INR";
    const proofTier = outcome === "FABRICATED_CLAIM" ? 1 : 2;
    const eventOutcome = outcome === "FABRICATED_CLAIM" ? "ON_TIME" : outcome;

    // Build canonical message hash matching Collector Agent
    const canonicalString = `${workerId}:${platformAttester.toLowerCase()}:${eventType}:${amount}:${currency}:${eventOutcome}:${timestamp}:${proofTier}`;
    const payloadHash = keccak256(stringToBytes(canonicalString));
    const platformSignature = await account.sign({ hash: payloadHash });

    const agentsUrl = process.env.AGENTS_SERVICE_URL || "http://localhost:3003";

    const payload = {
      workerId,
      platformAttester,
      eventType,
      amount,
      currency,
      outcome: eventOutcome,
      timestamp,
      proofTier,
      platformSignature,
    };

    try {
      const res = await fetch(`${agentsUrl}/collector/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          status: "success",
          txHash: data.commitmentHash || data.txHash,
          commitmentHash: data.commitmentHash,
          evidenceHash: data.evidenceHash,
          cid: data.cid,
          proofTier,
        });
      }
    } catch {
      // Agents server offline fallback
    }

    // Fallback if agents service is starting up
    return NextResponse.json({
      status: "fallback",
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      proofTier,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

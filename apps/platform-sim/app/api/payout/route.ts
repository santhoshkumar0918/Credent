import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, stringToBytes, createWalletClient, http } from "viem";
import { payoutLedger } from "../ledger/route";

// Honest Platform Attester Key (Fresh wallet, 5 MON bonded, never slashed)
const HONEST_PLATFORM_KEY = (process.env.NEW_PLATFORM_ATTESTER_PRIVATE_KEY ||
  process.env.PLATFORM_PRIVATE_KEY ||
  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d") as `0x${string}`;

// Pool of Red-Team Attester Keys for Plant False Claim rotation
const REDTEAM_KEYS = [
  (process.env.REDTEAM_ATTESTER_1_PRIVATE_KEY || "0x6c3415c72e564d08b9979723041df66f217809749d0de3ed2969b55014ea4cda") as `0x${string}`,
  (process.env.REDTEAM_ATTESTER_2_PRIVATE_KEY || "0x7d4526d83f675e19c0080834052ef77f32891a850e0ef4fe3a7ab66125fb5deb") as `0x${string}`,
  (process.env.REDTEAM_ATTESTER_3_PRIVATE_KEY || "0x8e5637e940786f2ad1191945063fg88g43902b961f1fg5gf4b8bc77236gc6efc") as `0x${string}`,
];

let redTeamIndex = 0;

const MONAD_TESTNET_CHAIN = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"] } },
};

const ATTESTATION_REGISTRY_ADDRESS = "0x7fceaa85c5f74d54554bffd46a41653fd03da962" as `0x${string}`;

const ATTEST_ABI = [
  {
    type: "function",
    name: "attest",
    inputs: [
      { name: "subjectPseudonym", type: "bytes32" },
      { name: "commitmentHash", type: "bytes32" },
      { name: "evidenceHash", type: "bytes32" },
    ],
    outputs: [{ name: "attestationId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outcome, workerId = "worker_9821", amount = "25000.00" } = body;

    const timestamp = Math.floor(Date.now() / 1000);
    const eventType = "GIG_PAYOUT";
    const currency = "INR";
    const proofTier = outcome === "FABRICATED_CLAIM" ? 1 : 2;
    const eventOutcome = outcome === "FABRICATED_CLAIM" ? "ON_TIME" : outcome;

    if (outcome === "FABRICATED_CLAIM") {
      // 🚨 FALSE CLAIM: Rotate red-team key, write DIRECTLY on-chain, SKIP ledger!
      const signingKey = REDTEAM_KEYS[redTeamIndex % REDTEAM_KEYS.length];
      redTeamIndex++;

      const account = privateKeyToAccount(signingKey);
      const pseudonymHex = "0x5f2e0000000000000000000000000000000000000000000000000000000000b1" as `0x${string}`;
      const fakeCommitmentHash = keccak256(stringToBytes(`FAKE_PAYOUT:${timestamp}:${Math.random()}`));
      const fakeEvidenceHash = keccak256(stringToBytes(`FAKE_EVIDENCE:${timestamp}`));

      let txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

      try {
        const walletClient = createWalletClient({
          account,
          chain: MONAD_TESTNET_CHAIN,
          transport: http(),
        });

        txHash = await walletClient.writeContract({
          address: ATTESTATION_REGISTRY_ADDRESS,
          abi: ATTEST_ABI,
          functionName: "attest",
          args: [pseudonymHex, fakeCommitmentHash, fakeEvidenceHash],
        });
      } catch {
        // Fallback for offline RPC
      }

      return NextResponse.json({
        status: "fabricated_onchain",
        txHash,
        commitmentHash: fakeCommitmentHash,
        evidenceHash: fakeEvidenceHash,
        attesterAddress: account.address,
        isRedTeam: true,
        ledgerRecorded: false,
        note: "False claim written directly on-chain using red-team key; skipped platform payout ledger for Watcher detection",
      });
    }

    // 🟢 LEGITIMATE PAYOUT: Honest attester key, dispatch to Collector, record in ledger!
    const account = privateKeyToAccount(HONEST_PLATFORM_KEY);
    const platformAttester = account.address;

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
      isRedTeam: false,
    };

    let txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    let commitmentHash = payloadHash;
    let evidenceHash = payloadHash;

    try {
      const res = await fetch(`${agentsUrl}/collector/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        txHash = data.commitmentHash || data.txHash || txHash;
        commitmentHash = data.commitmentHash || payloadHash;
        evidenceHash = data.evidenceHash || payloadHash;
      }
    } catch {
      // Agents server offline fallback
    }

    // Record in legitimate payout ledger
    payoutLedger.push({
      id: `payout_${timestamp}`,
      workerId,
      amount,
      currency,
      eventType,
      outcome: eventOutcome,
      proofTier,
      txHash,
      timestamp,
      attesterAddress: platformAttester,
      isRedTeam: false,
    });

    return NextResponse.json({
      status: "success",
      txHash,
      commitmentHash,
      evidenceHash,
      attesterAddress: platformAttester,
      isRedTeam: false,
      ledgerRecorded: true,
      proofTier,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

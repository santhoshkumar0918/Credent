"use client";

// dispute.ts — the watcher seam against the DEPLOYED ChallengeModule.
// openChallenge posts a 0.5 MON bond and requires a LIVE grant from the
// subject to the challenger (NoValidGrant otherwise — the subject grants
// the watcher via Consent first). Resolution is the arbiter's signature,
// executed operator-side; this seam reads outcomes and claims winnings.

import { decodeEventLog, keccak256, parseEther, toHex, type Address, type Hex, type WalletClient } from "viem";
import { ADDRESSES, MONAD_TESTNET_EXPLORER } from "@shared/constants";
import { monadTestnet } from "./wagmi";
import { getPublicClient } from "./contracts";

export const CHALLENGE_ADDRESS = ADDRESSES.challengeModule as Address;
export const CHALLENGER_BOND_MON = "0.5";

export const CHALLENGE_STATUS = ["OPEN", "ATTESTER_WON", "CHALLENGER_WON"] as const;

const challengeAbi = [
  {
    type: "function", name: "openChallenge",
    inputs: [
      { name: "attestationId", type: "uint256" },
      { name: "disclosureProofHash", type: "bytes32" },
    ],
    outputs: [{ name: "challengeId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function", name: "challenges",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "attestationId", type: "uint256" },
      { name: "challenger", type: "address" },
      { name: "challengerBond", type: "uint256" },
      { name: "disclosureProofHash", type: "bytes32" },
      { name: "defenseEvidenceHash", type: "bytes32" },
      { name: "windowEnds", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "claimed", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "nextChallengeId",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "claim",
    inputs: [{ name: "challengeId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event", name: "ChallengeOpened",
    inputs: [
      { name: "challengeId", type: "uint256", indexed: false },
      { name: "attestationId", type: "uint256", indexed: false },
      { name: "challenger", type: "address", indexed: false },
    ],
  },
] as const;

export interface Dispute {
  id: number;
  attestationId: bigint;
  challenger: Address;
  bond: bigint;
  status: number;
  claimed: boolean;
  windowEnds: bigint;
}

export async function listDisputes(cap = 20): Promise<Dispute[] | null> {
  try {
    const client = getPublicClient();
    const next = Number(
      (await client.readContract({
        address: CHALLENGE_ADDRESS, abi: challengeAbi, functionName: "nextChallengeId",
      })) as bigint,
    );
    const rows: Dispute[] = [];
    for (let n = next; n >= 1 && rows.length < cap; n--) {
      const [attId, challenger, bond, , , windowEnds, status, claimed] = (await client.readContract({
        address: CHALLENGE_ADDRESS, abi: challengeAbi,
        functionName: "challenges", args: [BigInt(n)],
      })) as [bigint, Address, bigint, Hex, Hex, bigint, number, boolean];
      rows.push({ id: n, attestationId: attId, challenger, bond, status, claimed, windowEnds });
    }
    return rows;
  } catch {
    return null;
  }
}

/** Commitment to the off-chain disclosure relied upon — content stays off-chain. */
export function proofHashFor(disclosureText: string): Hex {
  return keccak256(toHex(disclosureText));
}

export async function openChallenge(
  wc: WalletClient,
  attestationId: bigint,
  proofHash: Hex,
): Promise<{ txHash: Hex; challengeId: bigint | null }> {
  if (!wc.account) throw new Error("Wallet not connected.");
  const txHash = await wc.writeContract({
    address: CHALLENGE_ADDRESS,
    abi: challengeAbi,
    functionName: "openChallenge",
    args: [attestationId, proofHash],
    value: parseEther(CHALLENGER_BOND_MON),
    account: wc.account,
    chain: monadTestnet,
  });
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash: txHash });
  let challengeId: bigint | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: challengeAbi, ...log });
      if (decoded.eventName === "ChallengeOpened") {
        challengeId = (decoded.args as unknown as { challengeId: bigint }).challengeId;
      }
    } catch { /* not our event */ }
  }
  return { txHash, challengeId };
}

export async function claimWinnings(wc: WalletClient, challengeId: number): Promise<Hex> {
  if (!wc.account) throw new Error("Wallet not connected.");
  return wc.writeContract({
    address: CHALLENGE_ADDRESS,
    abi: challengeAbi,
    functionName: "claim",
    args: [BigInt(challengeId)],
    account: wc.account,
    chain: monadTestnet,
  });
}

/** Contract revert names → watcher-readable explanations. */
export function challengeErrorCopy(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/rejected|denied/i.test(msg)) return "Rejected in wallet — nothing was submitted.";
  if (/NoValidGrant/i.test(msg)) return "No live grant: the subject must grant YOUR wallet access before you can challenge. Ask them to consent first.";
  if (/ChallengeAlreadyOpen/i.test(msg)) return "A challenge is already open on this attestation.";
  if (/AttestationNotActive/i.test(msg)) return "Only ACTIVE attestations can be challenged — this one is already decided.";
  if (/ChallengeWindowClosed/i.test(msg)) return "The 7-day challenge window has closed.";
  if (/InsufficientChallengerBond/i.test(msg)) return "0.5 MON bond required — top up from the faucet.";
  if (/NotWinner/i.test(msg)) return "Only the winner can claim this challenge.";
  if (/AlreadyClaimed/i.test(msg)) return "Already claimed.";
  return msg.slice(0, 180);
}

export function disputeTxUrl(txHash: string): string {
  return `${MONAD_TESTNET_EXPLORER}/tx/${txHash}`;
}

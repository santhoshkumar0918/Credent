"use client";

// lender.ts — the relying-party seam. Verification is client-side and
// explicit: every disclosure is recomputed against the on-chain commitment
// and the verdict names WHICH check failed (repo rule: never a bare bool).
// Underwriting writes use only verified numbers; the portfolio is a plain
// read of every pool loan, labeled as the demo pool's book — not advice.

import { decodeEventLog, formatEther, type Address, type Hex, type WalletClient } from "viem";
import { hashCommitment, parseAmount } from "@shared/commitments";
import { EVENT_TYPE_INDEX, type EventType } from "@shared/types";
import { MONAD_TESTNET_EXPLORER } from "@shared/constants";
import { monadTestnet } from "./wagmi";
import { getPublicClient, contracts } from "./contracts";
import { apiFetch } from "./api-client";

export const POOL_ADDRESS = contracts.mockLendingPool.address as Address;
const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:3111";

const attestationReadsAbi = [
  {
    type: "function", name: "getAttestation",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "id", type: "uint256" },
        { name: "attester", type: "address" },
        { name: "subjectPseudonym", type: "bytes32" },
        { name: "eventType", type: "uint8" },
        { name: "commitmentHash", type: "bytes32" },
        { name: "evidenceHash", type: "bytes32" },
        { name: "timestamp", type: "uint256" },
        { name: "status", type: "uint8" },
      ],
    }],
    stateMutability: "view",
  },
] as const;

const underwriteAbi = [
  {
    type: "function", name: "requestUnderwriting",
    inputs: [
      { name: "pseudonym", type: "bytes32" },
      { name: "onTimeRateBps", type: "uint256" },
      { name: "tenureDays", type: "uint256" },
      { name: "distinctAttesters", type: "uint256" },
      { name: "totalAttestations", type: "uint256" },
    ],
    outputs: [{ name: "score", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event", name: "UnderwritingRecorded",
    inputs: [
      { name: "pseudonym", type: "bytes32", indexed: true },
      { name: "score", type: "uint256", indexed: false },
      { name: "onTimeRateBps", type: "uint256", indexed: false },
      { name: "tenureDays", type: "uint256", indexed: false },
      { name: "distinctAttesters", type: "uint256", indexed: false },
      { name: "totalAttestations", type: "uint256", indexed: false },
    ],
  },
] as const;

const poolReadsAbi = [
  {
    type: "function", name: "nextLoanId",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "loans",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "borrowerPseudonym", type: "bytes32" },
      { name: "borrower", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "dueAt", type: "uint256" },
      { name: "repaid", type: "bool" },
    ],
    stateMutability: "view",
  },
] as const;

export interface DisclosureInput {
  attestationId: string;
  subjectPseudonym: Hex;
  eventType: EventType;
  /** Decimal string in 2-decimal minor units (must match attester convention). */
  amount: string;
  onTime: boolean;
  /** Unix seconds as string. */
  timestamp: string;
  salt: Hex;
}

export type Verdict =
  | { ok: true; id: bigint; attester: Address; status: number; eventType: number; timestamp: bigint }
  | { ok: false; reason: "NOT_FOUND" | "SUBJECT_MISMATCH" | "EVENT_MISMATCH" | "COMMITMENT_MISMATCH" | "BAD_INPUT"; detail: string };

/** Recompute the commitment and check it against the chain, naming failures. */
export async function verifyDisclosure(d: DisclosureInput): Promise<Verdict> {
  let id: bigint;
  let ts: bigint;
  let amount: bigint;
  try {
    id = BigInt(d.attestationId);
    ts = BigInt(d.timestamp);
    amount = parseAmount(d.amount, 2);
    if (!d.subjectPseudonym.startsWith("0x") || !d.salt.startsWith("0x")) throw new Error("hex");
  } catch {
    return { ok: false, reason: "BAD_INPUT", detail: "id, timestamp, amount, or hex fields are malformed." };
  }
  const recomputed = hashCommitment({
    subjectPseudonym: d.subjectPseudonym,
    eventType: d.eventType,
    amount,
    onTime: d.onTime,
    timestamp: ts,
    salt: d.salt,
  });
  let on: {
    id: bigint; attester: Address; subjectPseudonym: Hex; eventType: number;
    commitmentHash: Hex; timestamp: bigint; status: number;
  };
  try {
    on = (await getPublicClient().readContract({
      ...contracts.attestationRegistry,
      abi: attestationReadsAbi,
      functionName: "getAttestation",
      args: [id],
    })) as unknown as typeof on;
  } catch {
    return { ok: false, reason: "NOT_FOUND", detail: `Attestation #${id} does not exist on-chain.` };
  }
  if (on.subjectPseudonym.toLowerCase() !== d.subjectPseudonym.toLowerCase()) {
    return { ok: false, reason: "SUBJECT_MISMATCH", detail: "Disclosure pseudonym differs from the on-chain record." };
  }
  if (on.eventType !== EVENT_TYPE_INDEX[d.eventType]) {
    return { ok: false, reason: "EVENT_MISMATCH", detail: "Disclosure event type differs from the on-chain record." };
  }
  if (on.commitmentHash.toLowerCase() !== recomputed.toLowerCase()) {
    return { ok: false, reason: "COMMITMENT_MISMATCH", detail: "Recomputed hash differs — values were altered after attesting." };
  }
  return { ok: true, id: on.id, attester: on.attester, status: on.status, eventType: on.eventType, timestamp: on.timestamp };
}

export interface EnumRow {
  id: number;
  attester: string;
  event_type: string;
  status: string;
}

/** Full on-chain enumeration for this pseudonym (completeness baseline). */
export async function fetchEnumeration(pseudonym: Hex): Promise<EnumRow[] | null> {
  try {
    const res = await apiFetch<{ attestations: EnumRow[] }>(`/api/subjects/${pseudonym}/attestations`);
    return res.attestations ?? [];
  } catch {
    return null;
  }
}

export interface VerifiedSet {
  id: bigint;
  attester: Address;
  status: number;
  onTime: boolean;
  timestamp: bigint;
}

export function completeness(ids: VerifiedSet[], enumeration: EnumRow[] | null): {
  missing: number[];
  state: "complete" | "gaps" | "unknown";
} {
  if (!enumeration) return { missing: [], state: "unknown" };
  const have = new Set(ids.map((v) => Number(v.id)));
  const missing = enumeration.map((e) => e.id).filter((id) => !have.has(id));
  return { missing, state: missing.length === 0 ? "complete" : "gaps" };
}

export function underwriteInputs(set: VerifiedSet[]): {
  onTimeRateBps: number; tenureDays: number; distinctAttesters: number; total: number;
} {
  const total = set.length;
  const onTime = set.filter((v) => v.onTime).length;
  const attestors = new Set(set.map((v) => v.attester.toLowerCase()));
  const times = set.map((v) => Number(v.timestamp));
  const tenureDays = times.length > 1
    ? Math.max(0, Math.round((Math.max(...times) - Math.min(...times)) / 86400))
    : 0;
  return {
    onTimeRateBps: total === 0 ? 0 : Math.floor((onTime * 10000) / total),
    tenureDays,
    distinctAttesters: attestors.size,
    total,
  };
}

export async function writeUnderwriting(
  wc: WalletClient,
  pseudonym: Hex,
  inputs: { onTimeRateBps: number; tenureDays: number; distinctAttesters: number; total: number },
): Promise<{ txHash: Hex; score: bigint }> {
  if (!wc.account) throw new Error("Wallet not connected.");
  const txHash = await wc.writeContract({
    address: POOL_ADDRESS,
    abi: underwriteAbi,
    functionName: "requestUnderwriting",
    args: [pseudonym, BigInt(inputs.onTimeRateBps), BigInt(inputs.tenureDays), BigInt(inputs.distinctAttesters), BigInt(inputs.total)],
    account: wc.account,
    chain: monadTestnet,
  });
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash: txHash });
  let score = BigInt(0);
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: underwriteAbi, ...log });
      if (decoded.eventName === "UnderwritingRecorded") {
        score = (decoded.args as unknown as { score: bigint }).score;
      }
    } catch { /* not our event */ }
  }
  return { txHash, score };
}

export interface PoolLoan {
  id: number;
  borrower: Address;
  amount: bigint;
  dueAt: bigint;
  repaid: boolean;
}

export async function readPoolBook(): Promise<{ loans: PoolLoan[]; balance: bigint } | null> {
  try {
    const client = getPublicClient();
    const next = Number(
      (await client.readContract({ address: POOL_ADDRESS, abi: poolReadsAbi, functionName: "nextLoanId" })) as bigint,
    );
    const loans: PoolLoan[] = [];
    for (let n = 0; n < next; n++) {
      const [, borrower, amount, dueAt, repaid] = (await client.readContract({
        address: POOL_ADDRESS, abi: poolReadsAbi, functionName: "loans", args: [BigInt(n)],
      })) as [Hex, Address, bigint, bigint, boolean];
      loans.push({ id: n, borrower, amount, dueAt, repaid });
    }
    const balance = await client.getBalance({ address: POOL_ADDRESS });
    return { loans: loans.reverse(), balance };
  } catch {
    return null;
  }
}

export interface AttesterRep {
  reputation_score: number;
  bond: string;
  attestation_count: number;
  challenges_lost: number;
  active: boolean;
}

/** Indexer mirror (public). Null when the indexer is unreachable. */
export async function fetchAttesterRep(addr: Address): Promise<AttesterRep | null> {
  try {
    const res = await fetch(`${INDEXER_URL}/attesters/${addr.toLowerCase()}/reputation`);
    if (!res.ok) return null;
    return (await res.json()) as AttesterRep;
  } catch {
    return null;
  }
}

export function lenderTxUrl(txHash: string): string {
  return `${MONAD_TESTNET_EXPLORER}/tx/${txHash}`;
}

export function fmtMON(wei: bigint): string {
  const s = formatEther(wei);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, ".0") : s;
}

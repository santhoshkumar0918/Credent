"use client";

// attester.ts — the attester seam against the DEPLOYED registries.
// Reads: getAttester / isActiveAttester (live, no backend needed).
// Writes: register + topUpBond (payable) + attest, all through the
// connected wallet — which must itself be the bonded attester, otherwise
// the chain reverts (no backdoors, per repo rule 2). History is a
// newest-first chain scan filtered by attester (demo scale, capped).

import { decodeEventLog, formatEther, parseEther, type Address, type Hex, type WalletClient } from "viem";
import { ADDRESSES, MONAD_TESTNET_EXPLORER } from "@shared/constants";
import { EVENT_TYPES, type EventType } from "@shared/types";
import { monadTestnet } from "./wagmi";
import { getPublicClient } from "./contracts";

export const REGISTRY_ADDRESS = ADDRESSES.attesterRegistry as Address;
export const ATTESTATION_ADDRESS = ADDRESSES.attestationRegistry as Address;
export const MIN_BOND_MON = "5";

export const ATTESTER_TYPES = ["PLATFORM", "INDIVIDUAL", "INSTITUTION"] as const;

const registryAbi = [
  {
    type: "function", name: "getAttester",
    inputs: [{ name: "attester", type: "address" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "addr", type: "address" },
        { name: "attesterType", type: "uint8" },
        { name: "bond", type: "uint256" },
        { name: "reputationScore", type: "int256" },
        { name: "attestationCount", type: "uint256" },
        { name: "challengesLost", type: "uint256" },
        { name: "active", type: "bool" },
      ],
    }],
    stateMutability: "view",
  },
  {
    type: "function", name: "isActiveAttester",
    inputs: [{ name: "attester", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "register",
    inputs: [{ name: "attesterType", type: "uint8" }],
    outputs: [], stateMutability: "payable",
  },
  {
    type: "function", name: "topUpBond",
    inputs: [], outputs: [], stateMutability: "payable",
  },
] as const;

const attestAbi = [
  {
    type: "function", name: "attest",
    inputs: [
      { name: "subjectPseudonym", type: "bytes32" },
      { name: "eventType", type: "uint8" },
      { name: "commitmentHash", type: "bytes32" },
      { name: "evidenceHash", type: "bytes32" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "nextAttestationId",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
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
  {
    type: "event", name: "AttestationWritten",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "attester", type: "address", indexed: true },
      { name: "subjectPseudonym", type: "bytes32", indexed: true },
      { name: "eventType", type: "uint8", indexed: false },
      { name: "commitmentHash", type: "bytes32", indexed: false },
      { name: "evidenceHash", type: "bytes32", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export interface AttesterState {
  registered: boolean;
  active: boolean;
  bond: bigint;
  reputation: bigint;
  attestationCount: bigint;
  challengesLost: bigint;
  attesterType: number;
}

export async function readAttester(addr: Address): Promise<AttesterState> {
  const client = getPublicClient();
  const a = (await client.readContract({
    address: REGISTRY_ADDRESS, abi: registryAbi,
    functionName: "getAttester", args: [addr],
  })) as unknown as {
    addr: Address; attesterType: number; bond: bigint; reputationScore: bigint;
    attestationCount: bigint; challengesLost: bigint; active: boolean;
  };
  return {
    registered: a.addr !== "0x0000000000000000000000000000000000000000",
    active: a.active,
    bond: a.bond,
    reputation: a.reputationScore,
    attestationCount: a.attestationCount,
    challengesLost: a.challengesLost,
    attesterType: a.attesterType,
  };
}

async function writeWith(wc: WalletClient, fn: () => Promise<Hex>): Promise<Hex> {
  if (!wc.account) throw new Error("Wallet not connected.");
  return fn();
}

export async function registerAttester(wc: WalletClient, typeIndex: number): Promise<Hex> {
  return writeWith(wc, () =>
    wc.writeContract({
      address: REGISTRY_ADDRESS, abi: registryAbi, functionName: "register",
      args: [typeIndex], value: parseEther(MIN_BOND_MON),
      account: wc.account!, chain: monadTestnet,
    }),
  );
}

export async function topUpBond(wc: WalletClient, amountMon: string): Promise<Hex> {
  return writeWith(wc, () =>
    wc.writeContract({
      address: REGISTRY_ADDRESS, abi: registryAbi, functionName: "topUpBond",
      value: parseEther(amountMon),
      account: wc.account!, chain: monadTestnet,
    }),
  );
}

export async function writeAttestation(
  wc: WalletClient,
  input: { pseudonym: Hex; eventType: number; commitment: Hex; evidence: Hex },
): Promise<{ txHash: Hex; attestationId: bigint | null }> {
  const txHash = await writeWith(wc, () =>
    wc.writeContract({
      address: ATTESTATION_ADDRESS, abi: attestAbi, functionName: "attest",
      args: [input.pseudonym, input.eventType, input.commitment, input.evidence],
      account: wc.account!, chain: monadTestnet,
    }),
  );
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash: txHash });
  let attestationId: bigint | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: attestAbi, ...log });
      if (decoded.eventName === "AttestationWritten") {
        attestationId = (decoded.args as unknown as { id: bigint }).id;
      }
    } catch { /* not our event */ }
  }
  return { txHash, attestationId };
}

export interface AttesterHistoryRow {
  id: bigint;
  eventType: number;
  commitmentHash: Hex;
  timestamp: bigint;
  status: number;
}

/** Newest-first scan of the registry for this attester's writes (capped). */
export async function listMyAttestations(attester: Address, cap = 25): Promise<AttesterHistoryRow[]> {
  const client = getPublicClient();
  const next = Number(
    (await client.readContract({
      address: ATTESTATION_ADDRESS, abi: attestAbi, functionName: "nextAttestationId",
    })) as bigint,
  );
  const rows: AttesterHistoryRow[] = [];
  for (let id = next - 1; id >= 0 && rows.length < cap; id--) {
    const a = (await client.readContract({
      address: ATTESTATION_ADDRESS, abi: attestAbi,
      functionName: "getAttestation", args: [BigInt(id)],
    })) as unknown as {
      id: bigint; attester: Address; eventType: number;
      commitmentHash: Hex; timestamp: bigint; status: number;
    };
    if (a.attester.toLowerCase() === attester.toLowerCase()) {
      rows.push({
        id: a.id, eventType: a.eventType, commitmentHash: a.commitmentHash,
        timestamp: a.timestamp, status: a.status,
      });
    }
  }
  return rows;
}

/** Fresh 256-bit salt per attestation — in-browser, never reused. */
export function newSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ("0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")) as Hex;
}

export function eventLabel(i: number): string {
  return EVENT_TYPES[i] ?? `Event ${i}`;
}

export function eventIndex(t: EventType): number {
  return EVENT_TYPES.indexOf(t);
}

export function attesterTxUrl(txHash: string): string {
  return `${MONAD_TESTNET_EXPLORER}/tx/${txHash}`;
}

export function fmtBond(wei: bigint): string {
  const s = formatEther(wei);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, ".0") : s;
}

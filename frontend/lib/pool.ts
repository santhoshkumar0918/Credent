"use client";

// pool.ts — borrower reads + repay writes against the DEPLOYED
// MockLendingPool 0xf2e7…. Origination is owner-only (demo operator), so
// this seam exposes: underwriting reads, my-loans listing, repay.
// Repayment mints a P2P_LOAN_REPAYMENT attestation on-chain (the pool is a
// bonded attester) — the receipt parser surfaces that new attestation id.

import { decodeEventLog, type Address, type Hex, type WalletClient } from "viem";
import { ADDRESSES, MONAD_TESTNET_EXPLORER } from "@shared/constants";
import { monadTestnet } from "./wagmi";
import { getPublicClient } from "./contracts";

export const POOL_ADDRESS = ADDRESSES.mockLendingPool as Address;

const poolReadsAbi = [
  {
    type: "function", name: "underwritings",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "score", type: "uint256" }, { name: "timestamp", type: "uint256" }],
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
  {
    type: "function", name: "nextLoanId",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const repayAbi = [
  {
    type: "function", name: "recordRepayment",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "event", name: "LoanRepaid",
    inputs: [
      { name: "loanId", type: "uint256", indexed: false },
      { name: "attestationId", type: "uint256", indexed: false },
    ],
  },
] as const;

export interface Underwriting {
  score: bigint;
  timestamp: bigint;
}

export interface Loan {
  id: number;
  borrowerPseudonym: Hex;
  borrower: Address;
  amount: bigint;
  dueAt: bigint;
  repaid: boolean;
}

export async function readUnderwriting(pseudonym: Hex): Promise<Underwriting | null> {
  const client = getPublicClient();
  const [score, timestamp] = (await client.readContract({
    address: POOL_ADDRESS,
    abi: poolReadsAbi,
    functionName: "underwritings",
    args: [pseudonym],
  })) as [bigint, bigint];
  if (timestamp === BigInt(0)) return null;
  return { score, timestamp };
}

/** All loans ever originated for this borrower (scan-and-filter; demo scale). */
export async function readMyLoans(borrower: Address): Promise<Loan[]> {
  const client = getPublicClient();
  const next = (await client.readContract({
    address: POOL_ADDRESS,
    abi: poolReadsAbi,
    functionName: "nextLoanId",
  })) as bigint;
  const out: Loan[] = [];
  const total = Number(next);
  for (let n = 0; n < total; n++) {
    const [pseudonym, who, amount, dueAt, repaid] = (await client.readContract({
      address: POOL_ADDRESS,
      abi: poolReadsAbi,
      functionName: "loans",
      args: [BigInt(n)],
    })) as [Hex, Address, bigint, bigint, boolean];
    if (who.toLowerCase() === borrower.toLowerCase()) {
      out.push({ id: n, borrowerPseudonym: pseudonym, borrower: who, amount, dueAt, repaid });
    }
  }
  return out.reverse(); // newest first
}

export async function readBalance(who: Address): Promise<bigint> {
  return getPublicClient().getBalance({ address: who });
}

/** Repay in full; returns tx hash + the newly minted attestation id. */
export async function repayLoan(
  walletClient: WalletClient,
  loanId: number,
  amount: bigint,
): Promise<{ txHash: Hex; attestationId: bigint | null }> {
  const account = walletClient.account;
  if (!account) throw new Error("Wallet not connected.");
  const txHash = await walletClient.writeContract({
    address: POOL_ADDRESS,
    abi: repayAbi,
    functionName: "recordRepayment",
    args: [BigInt(loanId)],
    value: amount,
    account,
    chain: monadTestnet,
  });
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash: txHash });
  let attestationId: bigint | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: repayAbi, ...log });
      if (decoded.eventName === "LoanRepaid") {
        attestationId = (decoded.args as unknown as { attestationId: bigint }).attestationId;
      }
    } catch { /* not our event */ }
  }
  return { txHash, attestationId };
}

export function poolTxUrl(txHash: string): string {
  return `${MONAD_TESTNET_EXPLORER}/tx/${txHash}`;
}

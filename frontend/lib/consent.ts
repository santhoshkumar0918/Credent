"use client";

// consent.ts — the borrower consent seam, bound to the DEPLOYED contract.
//
// CHAIN TRUTH (probed 2026-10-10, do not "fix" without re-probing):
// ConsentRegistry 0x6f47… runs PRE-nonce code (`nonces()` reverts).
// So grants here sign the OLD struct (no nonce) and submit through the
// OLD 6-arg grantAccess — via the gas relayer first (its ABI matches the
// deployed contract), falling back to a direct wallet write when the
// relayer is offline. AFTER RedeployConsent.s.sol is broadcast, delete
// this adapter and sign shared/eip712.ts consentGrantTypes (with nonce).
//
// Nothing here invents disclosure plaintext: the subject holds no amounts.
// Envelopes are posted by the attester platform (it holds the preimages),
// never by this page.

import type { Address, Hex } from "viem";
import { ADDRESSES, MONAD_TESTNET_CHAIN_ID, MONAD_TESTNET_EXPLORER } from "@shared/constants";
import { scopeTag } from "@shared/eip712";
import { getPublicClient } from "./contracts";
import { monadTestnet } from "./wagmi";
import { submitRelayedTx } from "./api-client";
import type { WalletClient } from "viem";

export const DEPLOYED_CONSENT_ADDRESS = ADDRESSES.consentRegistry as Address;

/** Minimal ABI of the DEPLOYED (pre-nonce) ConsentRegistry. */
export const deployedConsentAbi = [
  {
    type: "function",
    name: "grantAccess",
    inputs: [
      { name: "subjectPseudonym", type: "bytes32" },
      { name: "viewer", type: "address" },
      { name: "attester", type: "address" },
      { name: "scopeTags", type: "bytes32[]" },
      { name: "expiry", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeAccess",
    inputs: [
      { name: "subjectPseudonym", type: "bytes32" },
      { name: "viewer", type: "address" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isAuthorized",
    inputs: [
      { name: "subjectPseudonym", type: "bytes32" },
      { name: "viewer", type: "address" },
      { name: "scopeTag", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasValidGrant",
    inputs: [
      { name: "subjectPseudonym", type: "bytes32" },
      { name: "viewer", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

/** EIP-712 domain of the deployed ConsentRegistry. */
export function consentDomain() {
  return {
    name: "VouchainConsent",
    version: "1",
    chainId: MONAD_TESTNET_CHAIN_ID,
    verifyingContract: DEPLOYED_CONSENT_ADDRESS,
  } as const;
}

/** OLD grant struct — matches the DEPLOYED typehash (no nonce). */
export const grantTypes = {
  ConsentGrant: [
    { name: "subjectPseudonym", type: "bytes32" },
    { name: "viewer", type: "address" },
    { name: "attester", type: "address" },
    { name: "scopeTags", type: "bytes32[]" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

export const revokeTypes = {
  ConsentRevoke: [
    { name: "subjectPseudonym", type: "bytes32" },
    { name: "viewer", type: "address" },
  ],
} as const;

export interface GrantInput {
  subjectPseudonym: Hex;
  viewer: Address;
  attester: Address;
  eventTypes: string[];
  expiry: bigint;
}

export function grantMessage(g: GrantInput) {
  return {
    subjectPseudonym: g.subjectPseudonym,
    viewer: g.viewer,
    attester: g.attester,
    scopeTags: g.eventTypes.map((t) => scopeTag(t)),
    expiry: g.expiry.toString(),
  };
}

export function explorerTxUrl(txHash: string): string {
  return `${MONAD_TESTNET_EXPLORER}/tx/${txHash}`;
}

export async function hasLiveGrant(pseudonym: Hex, viewer: Address): Promise<boolean> {
  const client = getPublicClient();
  return (await client.readContract({
    address: DEPLOYED_CONSENT_ADDRESS,
    abi: deployedConsentAbi,
    functionName: "hasValidGrant",
    args: [pseudonym, viewer],
  })) as boolean;
}

export async function isScopeAuthorized(pseudonym: Hex, viewer: Address, eventType: string): Promise<boolean> {
  const client = getPublicClient();
  return (await client.readContract({
    address: DEPLOYED_CONSENT_ADDRESS,
    abi: deployedConsentAbi,
    functionName: "isAuthorized",
    args: [pseudonym, viewer, scopeTag(eventType)],
  })) as boolean;
}

export type SubmitOutcome =
  | { path: "relayer"; txHash: Hex }
  | { path: "direct"; txHash: Hex };

/** Grant: relayer first (gasless), direct wallet write as honest fallback. */
export async function submitGrant(
  g: GrantInput,
  signature: Hex,
  walletClient?: WalletClient,
): Promise<SubmitOutcome> {
  const scopeTags = g.eventTypes.map((t) => scopeTag(t));
  const args = [g.subjectPseudonym, g.viewer, g.attester, scopeTags, Number(g.expiry), signature];
  try {
    const res = await submitRelayedTx({
      targetContract: DEPLOYED_CONSENT_ADDRESS,
      functionName: "grantAccess",
      args,
      userSignature: signature,
    });
    return { path: "relayer", txHash: res.txHash as Hex };
  } catch (err) {
    const account = walletClient?.account;
    if (!account) throw err;
    const txHash = await walletClient.writeContract({
      address: DEPLOYED_CONSENT_ADDRESS,
      abi: deployedConsentAbi,
      functionName: "grantAccess",
      args: [g.subjectPseudonym, g.viewer, g.attester, scopeTags, g.expiry, signature],
      account,
      chain: monadTestnet,
    });
    return { path: "direct", txHash };
  }
}

/** Revoke: relayer first, direct fallback. Same honesty rule. */
export async function submitRevoke(
  pseudonym: Hex,
  viewer: Address,
  signature: Hex,
  walletClient?: WalletClient,
): Promise<SubmitOutcome> {
  const args = [pseudonym, viewer, signature];
  try {
    const res = await submitRelayedTx({
      targetContract: DEPLOYED_CONSENT_ADDRESS,
      functionName: "revokeAccess",
      args,
      userSignature: signature,
    });
    return { path: "relayer", txHash: res.txHash as Hex };
  } catch (err) {
    const account = walletClient?.account;
    if (!account) throw err;
    const txHash = await walletClient.writeContract({
      address: DEPLOYED_CONSENT_ADDRESS,
      abi: deployedConsentAbi,
      functionName: "revokeAccess",
      args: [pseudonym, viewer, signature],
      account,
      chain: monadTestnet,
    });
    return { path: "direct", txHash };
  }
}

/** Grants made in this browser (the chain doesn't enumerate viewers). */
const GRANTS_KEY = "vc_grants";
export interface SavedGrant {
  viewer: Address;
  viewerLabel: string;
  eventTypes: string[];
  expiry: number;
  txHash: string;
  at: number;
}

export function loadGrants(): SavedGrant[] {
  try {
    return JSON.parse(localStorage.getItem(GRANTS_KEY) ?? "[]") as SavedGrant[];
  } catch {
    return [];
  }
}

export function saveGrant(g: SavedGrant) {
  try {
    const all = loadGrants().filter((x) => x.viewer.toLowerCase() !== g.viewer.toLowerCase());
    localStorage.setItem(GRANTS_KEY, JSON.stringify([g, ...all]));
  } catch { /* storage full/blocked — grants still live on-chain */ }
}

export function dropGrant(viewer: Address) {
  try {
    localStorage.setItem(
      GRANTS_KEY,
      JSON.stringify(loadGrants().filter((x) => x.viewer.toLowerCase() !== viewer.toLowerCase())),
    );
  } catch { /* ignore */ }
}

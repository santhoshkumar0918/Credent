// Live consent checks against ConsentRegistry (ticket I2).
// Every disclosure decision re-reads the chain: grants can be revoked or
// expire at any time, and a cached "yes" must never outlive the grant.

import { type Address, type PublicClient } from "viem";
import { ADDRESSES, consentRegistryAbi } from "shared";

const CONSENT = ADDRESSES.consentRegistry as Address;

export async function hasLiveGrant(
  client: PublicClient,
  subjectPseudonym: string,
  viewer: string
): Promise<boolean> {
  return (await client.readContract({
    address: CONSENT,
    abi: consentRegistryAbi,
    functionName: "hasValidGrant",
    args: [subjectPseudonym as `0x${string}`, viewer as Address],
  })) as boolean;
}

export async function hasLiveScope(
  client: PublicClient,
  subjectPseudonym: string,
  viewer: string,
  scopeTag: string
): Promise<boolean> {
  return (await client.readContract({
    address: CONSENT,
    abi: consentRegistryAbi,
    functionName: "isAuthorized",
    args: [subjectPseudonym as `0x${string}`, viewer as Address, scopeTag as `0x${string}`],
  })) as boolean;
}

export async function grantExpiry(
  client: PublicClient,
  subjectPseudonym: string,
  viewer: string
): Promise<bigint> {
  // NOTE: Solidity omits dynamically-sized array members from public
  // mapping-to-struct getters, so `consents()` returns
  // (expiry, revoked, grantSigner) — scopeTags is NOT readable here.
  // Scope checks go through isAuthorized(); scope enumeration for display
  // would need an event change (known gap, not needed for I2).
  const c = (await client.readContract({
    address: CONSENT,
    abi: consentRegistryAbi,
    functionName: "consents",
    args: [subjectPseudonym as `0x${string}`, viewer as Address],
  })) as unknown as readonly [bigint, boolean, Address];
  return c[0];
}

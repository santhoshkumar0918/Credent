// EIP-712 typed-data definitions for consent grants + disclosures.
// The `domain` below MUST match ConsentRegistry's EIP712(name, version)
// constructor args and the deployed chain/contract — otherwise every
// signature fails verification. Human-readable before signing, never blind.

import { keccak256, stringToBytes } from "viem";
import type { EventType, Hex } from "./types.js";

export const EIP712_NAME = "VouchainConsent";
export const EIP712_VERSION = "1";

export function consentDomain(
  verifyingContract: Hex,
  chainId: number
): {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Hex;
} {
  return {
    name: EIP712_NAME,
    version: EIP712_VERSION,
    chainId,
    verifyingContract,
  };
}

export const consentGrantTypes = {
  ConsentGrant: [
    { name: "subjectPseudonym", type: "bytes32" },
    { name: "viewer", type: "address" },
    { name: "scopeTags", type: "bytes32[]" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

export const disclosureTypes = {
  Disclosure: [
    { name: "attestationId", type: "uint256" },
    { name: "subjectPseudonym", type: "bytes32" },
    { name: "eventType", type: "uint8" },
    { name: "amount", type: "uint256" },
    { name: "onTime", type: "bool" },
    { name: "timestamp", type: "uint256" },
    { name: "salt", type: "bytes32" },
    { name: "viewer", type: "address" },
  ],
} as const;

/** Consent scope tag for an event type: keccak256(eventType). */
export function scopeTag(eventType: EventType): Hex {
  return keccak256(stringToBytes(eventType));
}

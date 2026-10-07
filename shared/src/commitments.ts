// THE canonical commitment helper (AGENTS.md §6).
// Byte-identical to AttestationRegistry's
//   keccak256(abi.encode(pseudonym, eventType, amount, onTime, timestamp, salt))
// so it MUST use encodeAbiParameters — never encodePacked (different hash).
// All commitment construction flows through here; nowhere else.

import { encodeAbiParameters, keccak256, parseUnits } from "viem";
import {
  EVENT_TYPE_INDEX,
  type CommitmentInput,
  type Hex,
} from "./types.js";

export function hashCommitment(input: CommitmentInput): Hex {  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "uint8" },
        { type: "uint256" },
        { type: "bool" },
        { type: "uint256" },
        { type: "bytes32" },
      ],
      [
        input.subjectPseudonym,
        EVENT_TYPE_INDEX[input.eventType],
        input.amount,
        input.onTime,
        input.timestamp,
        input.salt,
      ]
    )
  );
}

/** Decimal string → base units. Decimals are explicit at every call site. */
export function parseAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

/**
 * THE canonical pseudonym derivation (INTERFACES.md §1, ConsentRegistry,
 * AttestationRegistry disputes): keccak256(abi.encode(subject, attester)).
 * NOTE: abi.encode (padded), NOT abi.encodePacked — the two hash
 * differently, and every verifier (contracts, tests, UIs) must use this
 * helper rather than reimplementing the encoding.
 */
export function pseudonymFor(subject: Hex, attester: Hex): Hex {
  return keccak256(
    encodeAbiParameters([{ type: "address" }, { type: "address" }], [subject, attester])
  );
}

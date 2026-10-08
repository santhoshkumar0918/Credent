import {
  hashCommitment,
  outcomeToOnTime,
  parseAmount,
  pseudonymFor,
  EVENT_TYPE_INDEX,
  type EventType,
  type Hex,
  type OutcomeCode,
} from "shared";
import {
  keccak256,
  recoverAddress,
  stringToBytes,
  toHex,
  type Hash,
} from "viem";
import { pinEvidenceReceipt, type EvidenceReceipt } from "./ipfs.js";
import { submitAttestationTx } from "./chain.js";
import { config } from "../config.js";

export interface CollectorWebhookInput {
  workerId: string;
  platformAttester: Hex;
  eventType: EventType;
  amount: string; // Decimal string e.g. "25000.00"
  currency: "INR" | "USD" | "MON";
  outcome: "ON_TIME" | "LATE" | "MISSED";
  timestamp: number;
  evidenceHash?: Hex;
  proofTier: 1 | 2 | 3;
  platformSignature: Hex;
  subjectAddress?: Hex;
  subjectPseudonym?: Hex;
  salt?: Hex;
  submitOnChain?: boolean;
  platformPrivateKey?: Hex;
}

export interface CollectorResult {
  success: boolean;
  commitmentHash: Hex;
  evidenceHash: Hex;
  subjectPseudonym: Hex;
  salt: Hex;
  cid: string;
  onTime: boolean;
  amountBaseUnits: string;
  preparedTx: {
    contractAddress: Hex;
    functionName: "attest";
    args: [Hex, number, Hex, Hex];
  };
  txHash?: Hash;
}

/**
 * Deterministically constructs message hash for platform webhook signature verification.
 */
export function getWebhookPayloadHash(payload: Omit<CollectorWebhookInput, "platformSignature">): Hex {
  const canonicalString = `${payload.workerId}:${payload.platformAttester.toLowerCase()}:${payload.eventType}:${payload.amount}:${payload.currency}:${payload.outcome}:${payload.timestamp}:${payload.proofTier}`;
  return keccak256(stringToBytes(canonicalString));
}

/**
 * Verifies that the platform signature matches platformAttester
 */
export async function verifyPlatformSignature(payload: CollectorWebhookInput): Promise<boolean> {
  try {
    const payloadHash = getWebhookPayloadHash(payload);
    const recovered = await recoverAddress({
      hash: payloadHash,
      signature: payload.platformSignature,
    });
    return recovered.toLowerCase() === payload.platformAttester.toLowerCase();
  } catch (err) {
    // Also try standard message hash fallback
    try {
      const canonicalString = `${payload.workerId}:${payload.platformAttester.toLowerCase()}:${payload.eventType}:${payload.amount}:${payload.currency}:${payload.outcome}:${payload.timestamp}:${payload.proofTier}`;
      const messageHash = keccak256(stringToBytes(`\x19Ethereum Signed Message:\n${canonicalString.length}${canonicalString}`));
      const recoveredMsg = await recoverAddress({
        hash: messageHash,
        signature: payload.platformSignature,
      });
      return recoveredMsg.toLowerCase() === payload.platformAttester.toLowerCase();
    } catch {
      return false;
    }
  }
}

/**
 * Collector Agent main execution
 */
export async function processCollectorWebhook(input: CollectorWebhookInput): Promise<CollectorResult> {
  // 1. Signature check
  const isSigValid = await verifyPlatformSignature(input);
  if (!isSigValid) {
    throw new Error("INVALID_PLATFORM_SIGNATURE: Webhook signature does not match platformAttester");
  }

  // 2. Standardize Pseudonym
  let subjectPseudonym: Hex;
  if (input.subjectPseudonym) {
    subjectPseudonym = input.subjectPseudonym;
  } else if (input.subjectAddress) {
    subjectPseudonym = pseudonymFor(input.subjectAddress, input.platformAttester);
  } else {
    // Derive deterministic pseudonym for workerId + platform
    const workerDummyAddr = keccak256(stringToBytes(input.workerId)).slice(0, 42) as Hex;
    subjectPseudonym = pseudonymFor(workerDummyAddr, input.platformAttester);
  }

  // 3. Prepare salt (random 32 bytes hex if not passed)
  const salt: Hex = input.salt || toHex(crypto.getRandomValues(new Uint8Array(32)));

  // 4. Outcome boolean mapping & Amount parsing
  const onTime = outcomeToOnTime(input.outcome as OutcomeCode);
  const decimals = input.currency === "MON" ? 18 : 2;
  const amountBaseUnits = parseAmount(input.amount, decimals);

  // 5. Create commitment hash using shared/commitments.ts
  const commitmentHash = hashCommitment({
    subjectPseudonym,
    eventType: input.eventType,
    amount: amountBaseUnits,
    onTime,
    timestamp: BigInt(input.timestamp),
    salt,
  });

  // 6. Encrypt & pin receipt to IPFS
  const receipt: EvidenceReceipt = {
    kind: "receipt",
    workerId: input.workerId,
    eventType: input.eventType,
    amount: input.amount,
    currency: input.currency,
    outcome: input.outcome,
    proofTier: input.proofTier,
    timestamp: input.timestamp,
    platformAttester: input.platformAttester,
    pinnedAt: Math.floor(Date.now() / 1000),
  };

  const pinResult = await pinEvidenceReceipt(receipt);
  const evidenceHash = input.evidenceHash || pinResult.evidenceHash;

  const eventTypeIndex = EVENT_TYPE_INDEX[input.eventType];

  const preparedTx = {
    contractAddress: config.addresses.attestationRegistry,
    functionName: "attest" as const,
    args: [subjectPseudonym, eventTypeIndex, commitmentHash, evidenceHash] as [Hex, number, Hex, Hex],
  };

  let txHash: Hash | undefined;

  // Optional: If platform explicitly requested on-chain submission with key
  const signerKey = input.platformPrivateKey || config.platformPrivateKey;
  if (input.submitOnChain && signerKey) {
    txHash = await submitAttestationTx({
      privateKey: signerKey,
      subjectPseudonym,
      eventType: eventTypeIndex,
      commitmentHash,
      evidenceHash,
    });
  }

  return {
    success: true,
    commitmentHash,
    evidenceHash,
    subjectPseudonym,
    salt,
    cid: pinResult.cid,
    onTime,
    amountBaseUnits: amountBaseUnits.toString(),
    preparedTx,
    txHash,
  };
}

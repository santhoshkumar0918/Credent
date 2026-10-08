import {
  hashCommitment,
  outcomeToOnTime,
  parseAmount,
  type EventType,
  type Hex,
  type OutcomeCode,
} from "shared";
import { keccak256, stringToBytes, type Hash } from "viem";
import { getOnChainAttestation, openChallengeTx } from "./chain.js";
import { config } from "../config.js";

export interface WatcherDisclosedValues {
  subjectPseudonym: Hex;
  eventType: EventType;
  amount: string;
  currency?: "INR" | "USD" | "MON";
  outcome: "ON_TIME" | "LATE" | "MISSED";
  timestamp: number;
  salt: Hex;
}

export interface WatcherScanInput {
  attestationId: number | bigint;
  disclosedValues?: WatcherDisclosedValues;
  expectedEvidenceHash?: Hex;
  autoChallengeIfFraud?: boolean;
  challengerPrivateKey?: Hex;
}

export interface WatcherScanResult {
  attestationId: number;
  isFraudulent: boolean;
  mismatchType: "COMMITMENT_HASH_MISMATCH" | "EVIDENCE_HASH_MISMATCH" | "STATUS_NOT_ACTIVE" | "NONE";
  onChainCommitmentHash: Hex;
  onChainEvidenceHash: Hex;
  disclosedCommitmentHash?: Hex;
  challengeOpened: boolean;
  challengeTxHash?: Hash;
  actionRecommendation: "OPEN_CHALLENGE_FOR_SLASH" | "PASSED_AUDIT";
  details: string;
}

/**
 * Watcher Agent: detects fraudulent claims & triggers live on-chain challenge for slash
 */
export async function scanAttestationForFraud(input: WatcherScanInput): Promise<WatcherScanResult> {
  const attestationIdBigInt = BigInt(input.attestationId);
  const onChainAtt = await getOnChainAttestation(attestationIdBigInt);

  if (!onChainAtt) {
    throw new Error(`Attestation #${input.attestationId} not found on Monad testnet`);
  }

  let isFraudulent = false;
  let mismatchType: WatcherScanResult["mismatchType"] = "NONE";
  let disclosedCommitmentHash: Hex | undefined;
  let details = "Attestation verified successfully against on-chain record.";

  // 1. Check if disclosed values match on-chain commitmentHash
  if (input.disclosedValues) {
    const decimals = input.disclosedValues.currency === "MON" ? 18 : 2;
    const amountBaseUnits = parseAmount(input.disclosedValues.amount, decimals);
    const onTime = outcomeToOnTime(input.disclosedValues.outcome as OutcomeCode);

    disclosedCommitmentHash = hashCommitment({
      subjectPseudonym: input.disclosedValues.subjectPseudonym,
      eventType: input.disclosedValues.eventType,
      amount: amountBaseUnits,
      onTime,
      timestamp: BigInt(input.disclosedValues.timestamp),
      salt: input.disclosedValues.salt,
    });

    if (disclosedCommitmentHash.toLowerCase() !== onChainAtt.commitmentHash.toLowerCase()) {
      isFraudulent = true;
      mismatchType = "COMMITMENT_HASH_MISMATCH";
      details = `FRAUD DETECTED: Disclosed values hash (${disclosedCommitmentHash}) does NOT match on-chain commitment (${onChainAtt.commitmentHash})`;
    }
  }

  // 2. Check if evidenceHash matches expected IPFS document hash
  if (!isFraudulent && input.expectedEvidenceHash) {
    if (input.expectedEvidenceHash.toLowerCase() !== onChainAtt.evidenceHash.toLowerCase()) {
      isFraudulent = true;
      mismatchType = "EVIDENCE_HASH_MISMATCH";
      details = `FRAUD DETECTED: Evidence hash (${input.expectedEvidenceHash}) does NOT match on-chain receipt (${onChainAtt.evidenceHash})`;
    }
  }

  let challengeOpened = false;
  let challengeTxHash: Hash | undefined;

  // 3. If fraud detected and challenge requested, open on-chain challenge!
  if (isFraudulent && (input.autoChallengeIfFraud || config.challengerPrivateKey || input.challengerPrivateKey)) {
    const challengerKey = input.challengerPrivateKey || config.challengerPrivateKey;
    if (challengerKey) {
      try {
        const auditProofStr = `${input.attestationId}:${mismatchType}:${Date.now()}`;
        const disclosureProofHash = keccak256(stringToBytes(auditProofStr));

        challengeTxHash = await openChallengeTx({
          privateKey: challengerKey,
          attestationId: attestationIdBigInt,
          disclosureProofHash,
        });
        challengeOpened = true;
        details += ` | CHALLENGE OPENED ON-CHAIN: ${challengeTxHash}`;
      } catch (err: any) {
        details += ` | On-chain challenge attempt note: ${err?.shortMessage || err?.message || err}`;
      }
    }
  }

  return {
    attestationId: Number(input.attestationId),
    isFraudulent,
    mismatchType,
    onChainCommitmentHash: onChainAtt.commitmentHash,
    onChainEvidenceHash: onChainAtt.evidenceHash,
    disclosedCommitmentHash,
    challengeOpened,
    challengeTxHash,
    actionRecommendation: isFraudulent ? "OPEN_CHALLENGE_FOR_SLASH" : "PASSED_AUDIT",
    details,
  };
}

import {
  hashCommitment,
  outcomeToOnTime,
  parseAmount,
  type EventType,
  type Hex,
  type OutcomeCode,
} from "shared";
import {
  getAttesterDetails,
  getOnChainAttestation,
  isAttesterActive,
} from "./chain.js";
import { verifyPlatformSignature, type CollectorWebhookInput } from "./collector.js";

export interface VerifierCheckInput {
  attestationId?: number | bigint;
  commitmentHash: Hex;
  subjectPseudonym: Hex;
  eventType: EventType;
  amount: string; // e.g. "25000.00"
  currency?: "INR" | "USD" | "MON";
  outcome: "ON_TIME" | "LATE" | "MISSED";
  timestamp: number;
  salt: Hex;
  evidenceHash?: Hex;
  proofTier?: 1 | 2 | 3;
  platformAttester: Hex;
  platformSignature?: Hex;
  workerId?: string;
}

export interface VerificationResult {
  valid: boolean;
  checks: {
    hashValid: boolean;
    attesterBonded: boolean;
    attesterActive: boolean;
    attestationActiveOnChain?: boolean;
    proofTierValid: boolean;
    signatureValid?: boolean;
  };
  proofTier: number;
  failureReason?: string;
  code?:
    | "HASH_MISMATCH"
    | "ATTESTER_NOT_ACTIVE"
    | "INSUFFICIENT_BOND"
    | "ATTESTATION_NOT_ACTIVE"
    | "INVALID_SIGNATURE"
    | "PROOF_TIER_INVALID";
}

/**
 * Verifier Agent main audit execution
 */
export async function verifyAttestation(input: VerifierCheckInput): Promise<VerificationResult> {
  const decimals = input.currency === "MON" ? 18 : 2;
  const amountBaseUnits = parseAmount(input.amount, decimals);
  const onTime = outcomeToOnTime(input.outcome as OutcomeCode);

  // 1. Client-side commitment re-verification (AGENTS.md Rule 5)
  const computedHash = hashCommitment({
    subjectPseudonym: input.subjectPseudonym,
    eventType: input.eventType,
    amount: amountBaseUnits,
    onTime,
    timestamp: BigInt(input.timestamp),
    salt: input.salt,
  });

  const hashValid = computedHash.toLowerCase() === input.commitmentHash.toLowerCase();
  if (!hashValid) {
    return {
      valid: false,
      checks: {
        hashValid: false,
        attesterBonded: false,
        attesterActive: false,
        proofTierValid: false,
      },
      proofTier: input.proofTier ?? 1,
      failureReason: `HASH_MISMATCH: Computed commitment hash ${computedHash} does not match expected ${input.commitmentHash}`,
      code: "HASH_MISMATCH",
    };
  }

  // 2. On-chain Attester Active & Bond Verification
  const active = await isAttesterActive(input.platformAttester);
  const attesterInfo = await getAttesterDetails(input.platformAttester);

  // Default testnet MIN_BOND is 5 MON (5e18)
  const hasBond = attesterInfo ? attesterInfo.bonded >= 5000000000000000000n : false;

  if (!active) {
    return {
      valid: false,
      checks: {
        hashValid: true,
        attesterBonded: hasBond,
        attesterActive: false,
        proofTierValid: false,
      },
      proofTier: input.proofTier ?? 1,
      failureReason: `ATTESTER_NOT_ACTIVE: Attester ${input.platformAttester} is not registered or deactivated on-chain`,
      code: "ATTESTER_NOT_ACTIVE",
    };
  }

  // 3. Check On-Chain Attestation Status (if attestationId provided)
  let attestationActiveOnChain = true;
  if (input.attestationId !== undefined) {
    const onChainAtt = await getOnChainAttestation(BigInt(input.attestationId));
    if (!onChainAtt) {
      return {
        valid: false,
        checks: {
          hashValid: true,
          attesterBonded: hasBond,
          attesterActive: true,
          attestationActiveOnChain: false,
          proofTierValid: false,
        },
        proofTier: input.proofTier ?? 1,
        failureReason: `ATTESTATION_NOT_ACTIVE: Attestation ID ${input.attestationId} not found on-chain`,
        code: "ATTESTATION_NOT_ACTIVE",
      };
    }

    // Status enum in AttestationRegistry.sol: 0=ACTIVE, 1=CHALLENGED, 2=SLASHED, 3=DISPUTED_BY_SUBJECT
    if (onChainAtt.status !== 0) {
      const statusNames = ["ACTIVE", "CHALLENGED", "SLASHED", "DISPUTED_BY_SUBJECT"];
      return {
        valid: false,
        checks: {
          hashValid: true,
          attesterBonded: hasBond,
          attesterActive: true,
          attestationActiveOnChain: false,
          proofTierValid: false,
        },
        proofTier: input.proofTier ?? 1,
        failureReason: `ATTESTATION_NOT_ACTIVE: Attestation status on-chain is ${statusNames[onChainAtt.status] || onChainAtt.status}`,
        code: "ATTESTATION_NOT_ACTIVE",
      };
    }
  }

  // 4. Platform signature check (if signature and workerId provided)
  let signatureValid = true;
  if (input.platformSignature && input.workerId) {
    const webhookPayload: CollectorWebhookInput = {
      workerId: input.workerId,
      platformAttester: input.platformAttester,
      eventType: input.eventType,
      amount: input.amount,
      currency: input.currency || "INR",
      outcome: input.outcome,
      timestamp: input.timestamp,
      proofTier: input.proofTier || 2,
      platformSignature: input.platformSignature,
    };
    signatureValid = await verifyPlatformSignature(webhookPayload);
    if (!signatureValid) {
      return {
        valid: false,
        checks: {
          hashValid: true,
          attesterBonded: hasBond,
          attesterActive: true,
          attestationActiveOnChain,
          signatureValid: false,
          proofTierValid: false,
        },
        proofTier: input.proofTier ?? 1,
        failureReason: "INVALID_SIGNATURE: Platform signature verification failed",
        code: "INVALID_SIGNATURE",
      };
    }
  }

  // 5. Proof Tier Check
  const proofTier = input.proofTier ?? (input.platformSignature ? 2 : 1);
  const proofTierValid = proofTier >= 1 && proofTier <= 3;
  if (!proofTierValid) {
    return {
      valid: false,
      checks: {
        hashValid: true,
        attesterBonded: hasBond,
        attesterActive: true,
        attestationActiveOnChain,
        proofTierValid: false,
      },
      proofTier,
      failureReason: "PROOF_TIER_INVALID: Proof tier must be 1, 2, or 3",
      code: "PROOF_TIER_INVALID",
    };
  }

  return {
    valid: true,
    checks: {
      hashValid: true,
      attesterBonded: hasBond,
      attesterActive: true,
      attestationActiveOnChain,
      proofTierValid: true,
      signatureValid: input.platformSignature ? true : undefined,
    },
    proofTier,
  };
}

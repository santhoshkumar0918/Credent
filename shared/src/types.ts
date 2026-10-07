// Canonical domain types — mirrors prd/Credent-prd.md §§9–10.
// Single source of truth: frontend + indexer consume these, never redefine.

export const EVENT_TYPES = [
  "RENT",
  "BNPL_INSTALLMENT",
  "GIG_PAYOUT",
  "P2P_LOAN_REPAYMENT",
  "UTILITY_BILL",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** On-chain enum order MUST match AttestationRegistry.sol EventType. */
export const EVENT_TYPE_INDEX: Record<EventType, number> = {
  RENT: 0,
  BNPL_INSTALLMENT: 1,
  GIG_PAYOUT: 2,
  P2P_LOAN_REPAYMENT: 3,
  UTILITY_BILL: 4,
};

export const OUTCOME_CODES = {
  ON_TIME: 0,
  LATE: 1,
  MISSED: 2,
  DEFAULTED: 3,
} as const;

export type OutcomeCode = keyof typeof OUTCOME_CODES;

/**
 * UI 4-state outcome → on-chain commitment boolean. Only ON_TIME commits
 * true; every other outcome commits false. The rich label lives off-chain
 * (attesterNote / disclosure); the chain keeps the PRD §10 boolean.
 * Single mapping both UIs must use — never reimplement per screen.
 */
export function outcomeToOnTime(outcome: OutcomeCode): boolean {
  return outcome === "ON_TIME";
}

export type Hex = `0x${string}`;

export interface CommitmentInput {
  /** Per-relationship pseudonym — NEVER the raw wallet address. */
  subjectPseudonym: Hex;
  eventType: EventType;
  /** Base units (see parseAmount). Never a float. */
  amount: bigint;
  onTime: boolean;
  /** Outcome code (0=ON_TIME, 1=LATE, 2=MISSED, 3=DEFAULTED) */
  outcomeCode?: number;
  /** Unix seconds. */
  timestamp: bigint;
  /** Fresh 256-bit randomness per attestation. */
  salt: Hex;
}

export type AttestationStatus =
  | "ACTIVE"
  | "CHALLENGED"
  | "SLASHED"
  | "DISPUTED_BY_SUBJECT";

export interface ConsentGrant {
  subjectPseudonym: Hex;
  viewer: Hex;
  /** keccak256(eventType) values — per-type scopes, never all-or-nothing. */
  scopeTags: Hex[];
  expiry: bigint;
}

export interface DisclosurePayload extends CommitmentInput {
  attestationId: bigint;
  currency: string;
  attesterSignature: Hex;
  subjectCoSignature: Hex;
}

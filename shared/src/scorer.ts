// Pure, deterministic scoring engine (AGENTS.md & INTERFACES.md §5).
// No LLM is used in calculation. Recomputable by any relying lender.
// Directly mirrors the on-chain MockLendingPool.sol formula where applicable.

export interface ScoreInput {
  totalAttestations: number;
  onTimeCount: number;
  lateCount?: number;
  missedCount?: number;
  tenureDays: number;
  distinctAttesters: number;
  totalVolumeINR?: number;
  proofTier?: 1 | 2 | 3;
  consecutiveOnTimeStreak?: number;
}

export interface ScoreResult {
  score: number; // 300 - 900 standard credit heuristic
  maxScore: number; // 900
  onChainScore: number; // Exact integer value matching MockLendingPool.sol requestUnderwriting()
  onTimeRate: number; // Percentage (e.g. 100 or 95.5)
  onTimeRateBps: number; // 0 - 10000
  recommendedLimitINR: number; // e.g. 3000 for 6 on-time payouts
  decision: "APPROVED" | "REVIEW" | "INSUFFICIENT_HISTORY" | "DENIED";
  tier: "TIER_1_BONDED" | "TIER_2_SOURCE_VERIFIED" | "TIER_3_ZKTLS";
  breakdown: {
    timelinessPoints: number; // Max 350
    consistencyPoints: number; // Max 150
    diversityPoints: number; // Max 50
    tenurePoints: number; // Max 50
  };
  metrics: {
    totalAttestations: number;
    onTimeCount: number;
    lateCount: number;
    missedCount: number;
    tenureDays: number;
    distinctAttesters: number;
    streak: number;
  };
}

/**
 * Pure integer log2 helper matching MockLendingPool.sol internal _log2(x)
 */
export function integerLog2(x: number): number {
  if (x <= 0) return 0;
  let n = 0;
  let val = Math.floor(x);
  while (val > 1) {
    val = Math.floor(val / 2);
    n++;
  }
  return n;
}

/**
 * Computes on-chain MockLendingPool score:
 * score = (onTimeRateBps * _log2(tenureDays + 1) * diversityBps) / 1e7
 */
export function computeOnChainScore(
  onTimeRateBps: number,
  tenureDays: number,
  distinctAttesters: number,
  totalAttestations: number
): number {
  if (totalAttestations === 0 || distinctAttesters > totalAttestations || onTimeRateBps > 10000) {
    return 0;
  }
  const tenure = integerLog2(tenureDays + 1);
  const diversityBps = Math.floor((distinctAttesters * 10000) / totalAttestations);
  // Multiply before divide, matching contract integer math
  const score = Math.floor((onTimeRateBps * tenure * diversityBps) / 10000000);
  return score;
}

/**
 * Pure deterministic score calculation for subjects.
 * Never guesses or calls external AI models.
 */
export function calculateCreditScore(input: ScoreInput): ScoreResult {
  const total = Math.max(0, input.totalAttestations);
  const onTime = Math.min(total, Math.max(0, input.onTimeCount));
  const late = input.lateCount ?? 0;
  const missed = input.missedCount ?? Math.max(0, total - onTime - late);
  const tenureDays = Math.max(0, input.tenureDays);
  const distinctAttesters = Math.min(total === 0 ? 1 : total, Math.max(1, input.distinctAttesters));
  const streak = input.consecutiveOnTimeStreak ?? onTime;
  const proofTier = input.proofTier ?? 2;

  if (total === 0) {
    return {
      score: 300,
      maxScore: 900,
      onChainScore: 0,
      onTimeRate: 0,
      onTimeRateBps: 0,
      recommendedLimitINR: 0,
      decision: "INSUFFICIENT_HISTORY",
      tier: "TIER_2_SOURCE_VERIFIED",
      breakdown: {
        timelinessPoints: 0,
        consistencyPoints: 0,
        diversityPoints: 0,
        tenurePoints: 0,
      },
      metrics: {
        totalAttestations: 0,
        onTimeCount: 0,
        lateCount: 0,
        missedCount: 0,
        tenureDays: 0,
        distinctAttesters: 0,
        streak: 0,
      },
    };
  }

  // 1. Timeliness: on-time rate
  const onTimeRate = (onTime / total) * 100;
  const onTimeRateBps = Math.floor((onTime / total) * 10000);
  const timelinessPoints = Math.round((onTimeRate / 100) * 350);

  // 2. Consistency points (based on streak and volume)
  // 6 payouts -> 50pts, 12 payouts -> 100pts, 24+ payouts -> 150pts
  const consistencyPoints = Math.min(150, Math.round(Math.min(streak, 24) * 6.25));

  // 3. Diversity points (up to 50)
  const diversityRatio = distinctAttesters / total;
  const diversityPoints = Math.min(50, Math.round(Math.min(distinctAttesters, 3) * 16.6));

  // 4. Tenure points (up to 50)
  // 180 days (6 months) = 50 pts
  const tenurePoints = Math.min(50, Math.round(Math.min(tenureDays, 180) * (50 / 180)));

  // Base score 300 + points (max 600 points -> total max 900)
  const rawScore = 300 + timelinessPoints + consistencyPoints + diversityPoints + tenurePoints;
  const score = Math.min(900, Math.max(300, rawScore));

  // On-chain MockLendingPool score
  const onChainScore = computeOnChainScore(onTimeRateBps, tenureDays, distinctAttesters, total);

  // Recommended Limit heuristic:
  // ₹500 per on-time payout up to 6 = ₹3,000 baseline!
  // Scales up to ₹25,000 based on streak and onTimeRate >= 90%
  let recommendedLimitINR = 0;
  if (onTimeRate >= 80 && onTime >= 1) {
    if (onTime <= 6) {
      recommendedLimitINR = onTime * 500; // e.g. 6 on-time payouts = ₹3,000
    } else if (onTime <= 12) {
      recommendedLimitINR = 3000 + (onTime - 6) * 1000; // e.g. 12 = ₹9,000
    } else {
      recommendedLimitINR = Math.min(25000, 9000 + (onTime - 12) * 1333); // e.g. 24 = ₹25,000
    }
  }

  // Decision rule
  let decision: ScoreResult["decision"] = "APPROVED";
  if (onTimeRate < 60 || missed >= 3) {
    decision = "DENIED";
  } else if (onTimeRate < 80 || total < 3) {
    decision = "REVIEW";
  }

  const tierMap: Record<number, ScoreResult["tier"]> = {
    1: "TIER_1_BONDED",
    2: "TIER_2_SOURCE_VERIFIED",
    3: "TIER_3_ZKTLS",
  };

  return {
    score,
    maxScore: 900,
    onChainScore,
    onTimeRate: Math.round(onTimeRate * 10) / 10,
    onTimeRateBps,
    recommendedLimitINR,
    decision,
    tier: tierMap[proofTier] || "TIER_2_SOURCE_VERIFIED",
    breakdown: {
      timelinessPoints,
      consistencyPoints,
      diversityPoints,
      tenurePoints,
    },
    metrics: {
      totalAttestations: total,
      onTimeCount: onTime,
      lateCount: late,
      missedCount: missed,
      tenureDays,
      distinctAttesters,
      streak,
    },
  };
}

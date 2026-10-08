import { type ScoreResult } from "shared";

export interface ExplanationsByLanguage {
  en: string[];
  ta: string[]; // Tanglish / Tamil
  hi: string[]; // Hindi
}

export interface ExplainerOutput {
  score: number;
  maxScore: number;
  onTimeRate: number;
  recommendedLimitINR: number;
  decision: string;
  tier: string;
  explanations: ExplanationsByLanguage;
  numbersVerified: boolean;
}

/**
 * Validates that numbers in an explanation string match allowed numbers from the score calculation.
 * Reject hallucinations per prompt rule:
 * "explanation la irukkura numbers, score function oda output oda match aaganum. Match aagala na reject."
 */
export function verifyExplanationNumbers(text: string, scoreResult: ScoreResult): boolean {
  // Extract all digit sequences from text
  const matches = text.match(/\d+(?:,\d+)*(?:\.\d+)?/g);
  if (!matches) return true; // No numbers to hallucinate

  const allowedNumbers = new Set<number>([
    scoreResult.score,
    scoreResult.maxScore,
    Math.round(scoreResult.onTimeRate),
    scoreResult.onTimeRateBps,
    scoreResult.recommendedLimitINR,
    scoreResult.metrics.totalAttestations,
    scoreResult.metrics.onTimeCount,
    scoreResult.metrics.lateCount,
    scoreResult.metrics.missedCount,
    scoreResult.metrics.tenureDays,
    scoreResult.metrics.distinctAttesters,
    scoreResult.metrics.streak,
    scoreResult.breakdown.timelinessPoints,
    scoreResult.breakdown.consistencyPoints,
    scoreResult.breakdown.diversityPoints,
    scoreResult.breakdown.tenurePoints,
    1, // single attester / base digits often in language
    2,
    3, // tiers
  ]);

  for (const rawNum of matches) {
    const cleaned = Number(rawNum.replace(/,/g, ""));
    if (isNaN(cleaned)) continue;

    // Check if cleaned number is in allowed list
    if (!allowedNumbers.has(cleaned)) {
      console.warn(`[Explainer Number Guard] Hallucinated or mismatched number found: "${cleaned}" in "${text}"`);
      return false;
    }
  }

  return true;
}

/**
 * Generates verified, deterministic explanations in English, Tanglish, and Hindi.
 */
export function generateScoreExplanations(scoreResult: ScoreResult): ExplainerOutput {
  const { onTimeCount, totalAttestations, tenureDays, streak } = scoreResult.metrics;
  const limitFormatted = `₹${scoreResult.recommendedLimitINR.toLocaleString("en-IN")}`;
  const rateRounded = Math.round(scoreResult.onTimeRate);

  // Deterministic multilingual templates
  const enExplanations: string[] = [];
  const taExplanations: string[] = [];
  const hiExplanations: string[] = [];

  if (totalAttestations === 0) {
    enExplanations.push("No on-chain credit attestations found. Build your history with pilot platform payouts.");
    taExplanations.push("On-chain la attestations illa. Platform payouts moolam unga credit history ah start pannunga.");
    hiExplanations.push("Abhi tak koi on-chain attestation nahi hai. Payouts ke saath apna record banayein.");
  } else {
    // 1. Core summary (matches Tanglish prompt requirement directly)
    if (scoreResult.recommendedLimitINR > 0) {
      enExplanations.push(`You have completed ${onTimeCount} on-time payouts, so your credit limit is ${limitFormatted}.`);
      taExplanations.push(`Nee ${onTimeCount} on-time payout pannirukka, adhunaala limit ${limitFormatted}.`);
      hiExplanations.push(`Aapne ${onTimeCount} on-time payout poore kiye hain, isliye aapki limit ${limitFormatted} hai.`);
    } else {
      enExplanations.push(`You have ${onTimeCount} on-time out of ${totalAttestations} payouts (${rateRounded}% on-time rate).`);
      taExplanations.push(`${totalAttestations} payouts la ${onTimeCount} on-time irukku (${rateRounded}% on-time rate).`);
      hiExplanations.push(`${totalAttestations} mein se ${onTimeCount} payout samay par hain (${rateRounded}% on-time rate).`);
    }

    // 2. Consistency & streak
    if (streak >= 3) {
      enExplanations.push(`Active streak of ${streak} consecutive on-time payouts over ${tenureDays} days.`);
      taExplanations.push(`${tenureDays} naatkalil thodarchiyaana ${streak} on-time payouts.`);
      hiExplanations.push(`${tenureDays} dino mein lagatar ${streak} on-time payouts.`);
    }

    // 3. Score & decision reason
    enExplanations.push(`Calculated score is ${scoreResult.score}/${scoreResult.maxScore} under ${scoreResult.tier}.`);
    taExplanations.push(`Unga credit assessment score ${scoreResult.score}/${scoreResult.maxScore}.`);
    hiExplanations.push(`Aapka credit assessment score ${scoreResult.score}/${scoreResult.maxScore} hai.`);
  }

  // Validate all generated lines against the number checker
  const allLines = [...enExplanations, ...taExplanations, ...hiExplanations];
  const allVerified = allLines.every((line) => verifyExplanationNumbers(line, scoreResult));

  return {
    score: scoreResult.score,
    maxScore: scoreResult.maxScore,
    onTimeRate: scoreResult.onTimeRate,
    recommendedLimitINR: scoreResult.recommendedLimitINR,
    decision: scoreResult.decision,
    tier: scoreResult.tier,
    explanations: {
      en: enExplanations,
      ta: taExplanations,
      hi: hiExplanations,
    },
    numbersVerified: allVerified,
  };
}

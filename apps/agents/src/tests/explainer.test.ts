import { describe, expect, it } from "bun:test";
import { calculateCreditScore } from "shared";
import {
  generateScoreExplanations,
  verifyExplanationNumbers,
} from "../services/explainer.js";

describe("Explainer Agent", () => {
  it("generates faithful explanations in English, Tanglish, and Hindi", () => {
    const scoreResult = calculateCreditScore({
      totalAttestations: 6,
      onTimeCount: 6,
      tenureDays: 60,
      distinctAttesters: 1,
    });

    const output = generateScoreExplanations(scoreResult);

    expect(output.numbersVerified).toBe(true);
    expect(output.recommendedLimitINR).toBe(3000);

    // English
    expect(output.explanations.en[0]).toContain("6 on-time payouts");
    expect(output.explanations.en[0]).toContain("₹3,000");

    // Tanglish
    expect(output.explanations.ta[0]).toBe(
      "Nee 6 on-time payout pannirukka, adhunaala limit ₹3,000."
    );

    // Hindi
    expect(output.explanations.hi[0]).toContain(
      "Aapne 6 on-time payout poore kiye hain"
    );
    expect(output.explanations.hi[0]).toContain("₹3,000");
  });

  it("rejects hallucinated numbers that don't match score result", () => {
    const scoreResult = calculateCreditScore({
      totalAttestations: 6,
      onTimeCount: 6,
      tenureDays: 60,
      distinctAttesters: 1,
    });

    // Valid sentence with true score number
    const validText = `Your calculated score is ${scoreResult.score} based on 6 payouts.`;
    expect(verifyExplanationNumbers(validText, scoreResult)).toBe(true);

    // Hallucinated sentence with wrong numbers (e.g. 99999 or 42)
    const fakeText = "We calculated a fake limit of ₹99,999 and 42 missed loans.";
    expect(verifyExplanationNumbers(fakeText, scoreResult)).toBe(false);
  });
});

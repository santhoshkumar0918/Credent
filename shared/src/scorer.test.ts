import { describe, expect, it } from "bun:test";
import {
  calculateCreditScore,
  computeOnChainScore,
  integerLog2,
} from "./scorer.js";

describe("pure scorer", () => {
  it("computes integerLog2 correctly", () => {
    expect(integerLog2(0)).toBe(0);
    expect(integerLog2(1)).toBe(0);
    expect(integerLog2(2)).toBe(1);
    expect(integerLog2(3)).toBe(1);
    expect(integerLog2(4)).toBe(2);
    expect(integerLog2(7)).toBe(2);
    expect(integerLog2(8)).toBe(3);
    expect(integerLog2(31)).toBe(4);
    expect(integerLog2(32)).toBe(5);
  });

  it("computes on-chain MockLendingPool score correctly", () => {
    // 100% on time (10000 bps), 31 days tenure (log2(32) = 5), 1 attester out of 10 attestations (diversity = 1000)
    // (10000 * 5 * 1000) / 10000000 = 50000000 / 10000000 = 5
    const score = computeOnChainScore(10000, 31, 1, 10);
    expect(score).toBe(5);
  });

  it("matches Tanglish requirement: 6 on-time payouts gives recommendedLimit ₹3,000", () => {
    const result = calculateCreditScore({
      totalAttestations: 6,
      onTimeCount: 6,
      tenureDays: 60,
      distinctAttesters: 1,
    });

    expect(result.onTimeRate).toBe(100);
    expect(result.metrics.onTimeCount).toBe(6);
    expect(result.recommendedLimitINR).toBe(3000);
    expect(result.decision).toBe("APPROVED");
    expect(result.score).toBeGreaterThan(600);
  });

  it("handles zero attestations safely without division by zero", () => {
    const result = calculateCreditScore({
      totalAttestations: 0,
      onTimeCount: 0,
      tenureDays: 0,
      distinctAttesters: 0,
    });

    expect(result.score).toBe(300);
    expect(result.onTimeRate).toBe(0);
    expect(result.recommendedLimitINR).toBe(0);
    expect(result.decision).toBe("INSUFFICIENT_HISTORY");
  });

  it("penalizes late/missed payments appropriately", () => {
    const result = calculateCreditScore({
      totalAttestations: 10,
      onTimeCount: 5,
      missedCount: 5,
      tenureDays: 90,
      distinctAttesters: 1,
    });

    expect(result.onTimeRate).toBe(50);
    expect(result.decision).toBe("DENIED");
    expect(result.recommendedLimitINR).toBe(0);
  });
});

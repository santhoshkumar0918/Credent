import { describe, expect, it } from "bun:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { hashCommitment, parseAmount } from "shared";
import { verifyAttestation } from "../services/verifier.js";
import { getWebhookPayloadHash } from "../services/collector.js";

describe("Verifier Agent", () => {
  it("rejects when disclosed values do not match commitment hash (HASH_MISMATCH)", async () => {
    const wrongHash = "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

    const result = await verifyAttestation({
      commitmentHash: wrongHash,
      subjectPseudonym: "0x2222222222222222222222222222222222222222222222222222222222222222" as const,
      eventType: "GIG_PAYOUT",
      amount: "25000.00",
      outcome: "ON_TIME",
      timestamp: 1717000000,
      salt: "0x3333333333333333333333333333333333333333333333333333333333333333" as const,
      platformAttester: "0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d" as const,
      proofTier: 2,
    });

    expect(result.valid).toBe(false);
    expect(result.code).toBe("HASH_MISMATCH");
    expect(result.failureReason).toContain("HASH_MISMATCH");
  });

  it("validates hash recomputation client-side", async () => {
    const subjectPseudonym = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
    const salt = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
    const timestamp = 1717000000;

    const correctHash = hashCommitment({
      subjectPseudonym,
      eventType: "GIG_PAYOUT",
      amount: parseAmount("25000.00", 2),
      onTime: true,
      timestamp: BigInt(timestamp),
      salt,
    });

    // Check with the live deployed AttesterRegistry address
    const result = await verifyAttestation({
      commitmentHash: correctHash,
      subjectPseudonym,
      eventType: "GIG_PAYOUT",
      amount: "25000.00",
      outcome: "ON_TIME",
      timestamp,
      salt,
      platformAttester: "0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d" as const,
      proofTier: 2,
    });

    expect(result.checks.hashValid).toBe(true);
  });
});

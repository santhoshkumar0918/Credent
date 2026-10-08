import { describe, expect, it } from "bun:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  getWebhookPayloadHash,
  processCollectorWebhook,
  verifyPlatformSignature,
} from "../services/collector.js";
import { hashCommitment, parseAmount, pseudonymFor } from "shared";

describe("Collector Agent", () => {
  it("verifies platform signature and generates commitment hash", async () => {
    const privKey = generatePrivateKey();
    const account = privateKeyToAccount(privKey);
    const platformAttester = account.address;

    const basePayload = {
      workerId: "worker_9821",
      platformAttester,
      eventType: "GIG_PAYOUT" as const,
      amount: "25000.00",
      currency: "INR" as const,
      outcome: "ON_TIME" as const,
      timestamp: 1717000000,
      proofTier: 2 as const,
    };

    const payloadHash = getWebhookPayloadHash(basePayload);
    const signature = await account.sign({ hash: payloadHash });

    const fullPayload = {
      ...basePayload,
      platformSignature: signature,
      salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as const,
    };

    // 1. Verify signature check directly
    const isValid = await verifyPlatformSignature(fullPayload);
    expect(isValid).toBe(true);

    // 2. Process webhook
    const result = await processCollectorWebhook(fullPayload);
    expect(result.success).toBe(true);
    expect(result.onTime).toBe(true);
    expect(result.amountBaseUnits).toBe("2500000"); // 2 decimals for INR

    // 3. Compare with direct hashCommitment
    const expectedCommitment = hashCommitment({
      subjectPseudonym: result.subjectPseudonym,
      eventType: "GIG_PAYOUT",
      amount: parseAmount("25000.00", 2),
      onTime: true,
      timestamp: 1717000000n,
      salt: fullPayload.salt,
    });

    expect(result.commitmentHash).toBe(expectedCommitment);
    expect(result.preparedTx.functionName).toBe("attest");
    expect(result.preparedTx.args[2]).toBe(expectedCommitment);
  });

  it("rejects forged or corrupted platform signature", async () => {
    const privKey = generatePrivateKey();
    const account = privateKeyToAccount(privKey);

    const badPayload = {
      workerId: "worker_9821",
      platformAttester: account.address,
      eventType: "GIG_PAYOUT" as const,
      amount: "25000.00",
      currency: "INR" as const,
      outcome: "ON_TIME" as const,
      timestamp: 1717000000,
      proofTier: 2 as const,
      platformSignature: "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" as const,
    };

    expect(processCollectorWebhook(badPayload)).rejects.toThrow(
      "INVALID_PLATFORM_SIGNATURE"
    );
  });
});

import { describe, expect, it } from "bun:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { buildApp } from "../index.js";
import { getWebhookPayloadHash } from "../services/collector.js";

describe("Agents API Server Endpoints", () => {
  const app = buildApp();

  it("GET /health returns ok", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toContain("Autonomous Agents");
  });

  it("GET /status returns all Member 3 endpoint definitions", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/status",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.endpoints.collector).toBe("POST /collector/webhook");
    expect(body.endpoints.verifier).toBe("POST /verifier/check");
    expect(body.endpoints.score).toBe("GET /score/:pseudonym");
    expect(body.endpoints.watcher).toBe("POST /watcher/scan");
    expect(body.endpoints.notify).toBe("POST /notify");
    expect(body.endpoints.anomaly).toBe("GET /anomaly/flags");
  });

  it("POST /collector/webhook processes signed payload and returns hashes", async () => {
    const privKey = generatePrivateKey();
    const account = privateKeyToAccount(privKey);

    const basePayload = {
      workerId: "worker_9821",
      platformAttester: account.address,
      eventType: "GIG_PAYOUT" as const,
      amount: "25000.00",
      currency: "INR" as const,
      outcome: "ON_TIME" as const,
      timestamp: 1717000000,
      proofTier: 2 as const,
    };

    const hash = getWebhookPayloadHash(basePayload);
    const signature = await account.sign({ hash });

    const res = await app.inject({
      method: "POST",
      url: "/collector/webhook",
      payload: {
        ...basePayload,
        platformSignature: signature,
        salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.commitmentHash).toBeDefined();
    expect(body.evidenceHash).toBeDefined();
    expect(body.subjectPseudonym).toBeDefined();
    expect(body.preparedTx.functionName).toBe("attest");
  });

  it("GET /score/:pseudonym returns score, limit ₹3,000, and Tanglish explanations", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/score/0x5f2e01ab43?onTime=6&total=6",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.pseudonym).toBe("0x5f2e01ab43");
    expect(body.recommendedLimitINR).toBe(3000);
    expect(body.onTimeRate).toBe(100);
    expect(body.explanations.ta[0]).toContain("Nee 6 on-time payout pannirukka, adhunaala limit ₹3,000.");
    expect(body.numbersVerified).toBe(true);
  });

  it("POST /notify dispatches notification and returns status", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/notify",
      payload: {
        event: "LIMIT_INCREASED",
        channel: "IN_APP",
        phone: "+919876543210",
        data: { limit: 3000 },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.notification.message).toContain("₹3,000");
  });

  it("GET /anomaly/flags returns anomaly analysis report", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/anomaly/flags",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalAttestationsScanned).toBeGreaterThanOrEqual(1);
    expect(body.summary).toBeDefined();
  });
});

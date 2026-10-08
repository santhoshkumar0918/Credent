import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { processCollectorWebhook } from "../services/collector.js";
import { recordAttestationForAnomalyScan } from "../services/anomaly.js";

const CollectorWebhookSchema = z.object({
  workerId: z.string(),
  platformAttester: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  eventType: z.enum([
    "RENT",
    "BNPL_INSTALLMENT",
    "GIG_PAYOUT",
    "P2P_LOAN_REPAYMENT",
    "UTILITY_BILL",
  ]),
  amount: z.string(),
  currency: z.enum(["INR", "USD", "MON"]).default("INR"),
  outcome: z.enum(["ON_TIME", "LATE", "MISSED"]),
  timestamp: z.number(),
  evidenceHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  proofTier: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  platformSignature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  subjectAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  subjectPseudonym: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  salt: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  submitOnChain: z.boolean().optional(),
  platformPrivateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

export async function collectorRoutes(fastify: FastifyInstance) {
  fastify.post("/collector/webhook", async (req, reply) => {
    try {
      const parsed = CollectorWebhookSchema.parse(req.body);
      const result = await processCollectorWebhook(parsed as any);

      // Record for anomaly analysis
      recordAttestationForAnomalyScan({
        id: result.commitmentHash.slice(0, 10),
        attester: parsed.platformAttester,
        subjectPseudonym: result.subjectPseudonym,
        eventType: parsed.eventType,
        amount: parseFloat(parsed.amount) || 0,
        timestamp: parsed.timestamp,
      });

      return reply.status(200).send(result);
    } catch (err: any) {
      if (err.name === "ZodError") {
        return reply.status(400).send({
          error: "Invalid webhook payload schema",
          issues: err.errors,
          code: "VALIDATION_ERROR",
        });
      }

      if (err.message && err.message.startsWith("INVALID_PLATFORM_SIGNATURE")) {
        return reply.status(401).send({
          error: err.message,
          code: "INVALID_PLATFORM_SIGNATURE",
        });
      }

      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || "Failed to process collector webhook",
        code: "COLLECTOR_ERROR",
      });
    }
  });
}

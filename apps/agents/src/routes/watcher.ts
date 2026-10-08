import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { scanAttestationForFraud } from "../services/watcher.js";

const WatcherScanSchema = z.object({
  attestationId: z.union([z.number(), z.string()]),
  disclosedValues: z
    .object({
      subjectPseudonym: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
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
      salt: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    })
    .optional(),
  expectedEvidenceHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  autoChallengeIfFraud: z.boolean().optional(),
  challengerPrivateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

export async function watcherRoutes(fastify: FastifyInstance) {
  fastify.post("/watcher/scan", async (req, reply) => {
    try {
      const parsed = WatcherScanSchema.parse(req.body);
      const result = await scanAttestationForFraud(parsed as any);

      return reply.status(200).send({
        success: true,
        audit: result,
      });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return reply.status(400).send({
          error: "Invalid watcher scan payload schema",
          issues: err.errors,
          code: "VALIDATION_ERROR",
        });
      }

      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || "Failed to execute watcher scan",
        code: "WATCHER_ERROR",
      });
    }
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyAttestation } from "../services/verifier.js";

const VerifierCheckSchema = z.object({
  attestationId: z.union([z.number(), z.string()]).optional(),
  commitmentHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
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
  evidenceHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  proofTier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  platformAttester: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  platformSignature: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
  workerId: z.string().optional(),
});

export async function verifierRoutes(fastify: FastifyInstance) {
  fastify.post("/verifier/check", async (req, reply) => {
    try {
      const parsed = VerifierCheckSchema.parse(req.body);
      const result = await verifyAttestation(parsed as any);

      if (!result.valid) {
        return reply.status(400).send({
          success: false,
          verification: result,
        });
      }

      return reply.status(200).send({
        success: true,
        verification: result,
      });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return reply.status(400).send({
          error: "Invalid verifier check payload schema",
          issues: err.errors,
          code: "VALIDATION_ERROR",
        });
      }

      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || "Failed to execute verifier check",
        code: "VERIFIER_ERROR",
      });
    }
  });
}

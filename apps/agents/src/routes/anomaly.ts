import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analyzeAnomalies } from "../services/anomaly.js";

const CustomDetectSchema = z.object({
  records: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      attester: z.string(),
      subjectPseudonym: z.string(),
      eventType: z.string(),
      amount: z.number(),
      timestamp: z.number(),
    })
  ),
});

export async function anomalyRoutes(fastify: FastifyInstance) {
  // GET /anomaly/flags (Primary endpoint for Member 2)
  fastify.get("/anomaly/flags", async (req, reply) => {
    try {
      const report = analyzeAnomalies();
      return reply.status(200).send(report);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || "Failed to analyze anomalies",
        code: "ANOMALY_ERROR",
      });
    }
  });

  // POST /anomaly/detect (Batch scan endpoint)
  fastify.post("/anomaly/detect", async (req, reply) => {
    try {
      const parsed = CustomDetectSchema.parse(req.body);
      const report = analyzeAnomalies(parsed.records);
      return reply.status(200).send(report);
    } catch (err: any) {
      if (err.name === "ZodError") {
        return reply.status(400).send({
          error: "Invalid anomaly detect payload schema",
          issues: err.errors,
          code: "VALIDATION_ERROR",
        });
      }

      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || "Failed to run anomaly detection",
        code: "ANOMALY_ERROR",
      });
    }
  });
}

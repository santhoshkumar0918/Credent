import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendNotification } from "../services/notifier.js";

const NotifySchema = z.object({
  event: z.enum([
    "LIMIT_INCREASED",
    "ACCESS_REQUESTED",
    "REPAYMENT_RECORDED",
    "CHALLENGE_OPENED",
    "SLASH_EXECUTED",
    "CUSTOM",
  ]),
  phone: z.string().optional(),
  channel: z.enum(["SMS", "WHATSAPP", "IN_APP"]).default("IN_APP"),
  data: z.record(z.any()).optional(),
  message: z.string().optional(),
});

export async function notifyRoutes(fastify: FastifyInstance) {
  fastify.post("/notify", async (req, reply) => {
    try {
      const parsed = NotifySchema.parse(req.body);
      const result = await sendNotification(parsed);

      return reply.status(200).send({
        success: true,
        notification: result,
      });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return reply.status(400).send({
          error: "Invalid notify payload schema",
          issues: err.errors,
          code: "VALIDATION_ERROR",
        });
      }

      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || "Failed to dispatch notification",
        code: "NOTIFY_ERROR",
      });
    }
  });
}

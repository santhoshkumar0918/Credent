import type { FastifyInstance } from "fastify";
import { z } from "zod";
import twilio from "twilio";

const NotifySchema = z.object({
  phone: z.string().optional(),
  channel: z.enum(["SMS", "WHATSAPP", "IN_APP"]).default("IN_APP"),
  message: z.string(),
});

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFromPhone = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = twilioSid && twilioAuthToken ? twilio(twilioSid, twilioAuthToken) : null;

export async function notifyRoutes(fastify: FastifyInstance) {
  fastify.post("/api/notify/send", async (req, reply) => {
    const body = NotifySchema.parse(req.body);

    if (body.channel !== "IN_APP" && twilioClient && body.phone && twilioFromPhone) {
      try {
        const messageRes = await twilioClient.messages.create({
          body: body.message,
          from: body.channel === "WHATSAPP" ? `whatsapp:${twilioFromPhone}` : twilioFromPhone,
          to: body.channel === "WHATSAPP" ? `whatsapp:${body.phone}` : body.phone,
        });

        return {
          status: "sent",
          channel: body.channel,
          sid: messageRes.sid,
        };
      } catch (err: any) {
        console.warn("Twilio send failed, falling back to mock delivery:", err.message);
      }
    }

    // Mock in-app/dev fallback delivery
    return {
      status: "delivered_mock",
      channel: body.channel,
      phone: body.phone || "+919876543210",
      message: body.message,
      timestamp: new Date().toISOString(),
    };
  });
}

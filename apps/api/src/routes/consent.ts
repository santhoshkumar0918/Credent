import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyAuthToken } from "../middleware/auth";
import { memoryStore } from "../db";

const IssueConsentTokenSchema = z.object({
  pseudonymHex: z.string().startsWith("0x"),
  viewerAddress: z.string().startsWith("0x"),
  scopeTags: z.array(z.string()),
  expiry: z.number(),
  encryptedKeyHex: z.string().optional(),
});

export async function consentRoutes(fastify: FastifyInstance) {
  // Issue consent token (called by subject after signing grant)
  fastify.post("/api/consent/tokens", { preHandler: [verifyAuthToken] }, async (req, reply) => {
    const body = IssueConsentTokenSchema.parse(req.body);
    const tokenId = crypto.randomUUID();

    const tokenRecord = {
      id: tokenId,
      pseudonymHex: body.pseudonymHex,
      viewerAddress: body.viewerAddress,
      scopeTags: body.scopeTags,
      expiry: body.expiry,
      encryptedKeyHex: body.encryptedKeyHex || "0x0123456789abcdef",
      revoked: false,
      createdAt: new Date().toISOString(),
    };

    memoryStore.consentTokens.set(tokenId, tokenRecord);

    return {
      status: "issued",
      tokenId,
      consentToken: tokenRecord,
    };
  });

  // Verify consent token (called by lender)
  fastify.get("/api/consent/tokens/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const token = memoryStore.consentTokens.get(id);

    if (!token) {
      return reply.status(404).send({ error: "Consent token not found" });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (token.revoked) {
      return reply.status(403).send({ error: "Consent grant has been revoked by subject", code: "REVOKED" });
    }
    if (token.expiry < nowSec) {
      return reply.status(403).send({ error: "Consent grant has expired", code: "EXPIRED" });
    }

    return {
      valid: true,
      token,
    };
  });
}

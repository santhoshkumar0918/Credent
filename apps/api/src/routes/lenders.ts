import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyAuthToken } from "../middleware/auth";
import { memoryStore } from "../db";

const RegisterKeySchema = z.object({
  publicKeyHex: z.string().startsWith("0x"),
});

export async function lenderRoutes(fastify: FastifyInstance) {
  fastify.post("/api/lenders/register-key", { preHandler: [verifyAuthToken] }, async (req, reply) => {
    const body = RegisterKeySchema.parse(req.body);
    const user = req.user!;
    memoryStore.lenderKeys.set(user.privyDid, body.publicKeyHex);

    return {
      status: "registered",
      lender: user.privyDid,
      publicKeyHex: body.publicKeyHex,
      registeredAt: new Date().toISOString(),
    };
  });
}

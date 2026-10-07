import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { submitRelayedTransaction } from "../relayer/gas-relayer";

const RelayerSubmitSchema = z.object({
  targetContract: z.string().startsWith("0x"),
  functionName: z.enum(["grantAccess", "revokeAccess"]),
  args: z.array(z.any()),
  userSignature: z.string().startsWith("0x"),
});

export async function relayerRoutes(fastify: FastifyInstance) {
  fastify.post("/api/relayer/submit", async (req, reply) => {
    const body = RelayerSubmitSchema.parse(req.body);

    try {
      const result = await submitRelayedTransaction({
        targetContract: body.targetContract as `0x${string}`,
        functionName: body.functionName,
        args: body.args,
        userSignature: body.userSignature as `0x${string}`,
      });

      return {
        status: "submitted",
        txHash: result.txHash,
        chainId: 10143,
        functionName: body.functionName,
      };
    } catch (err: any) {
      reply.status(400).send({ error: err.message || "Failed to submit relayed transaction" });
    }
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { memoryStore } from "../db";

const FastForwardSchema = z.object({
  cycles: z.number().default(1),
});

export async function demoRoutes(fastify: FastifyInstance) {
  fastify.post("/api/demo/reset", async (req, reply) => {
    memoryStore.consentTokens.clear();
    memoryStore.demoState.clear();
    memoryStore.demoState.set("cycle", 1);
    memoryStore.demoState.set("lastResetAt", new Date().toISOString());

    return {
      status: "reset",
      message: "Demo seed state reset successfully.",
      currentCycle: 1,
      resetAt: new Date().toISOString(),
    };
  });

  fastify.post("/api/demo/fast-forward", async (req, reply) => {
    const body = FastForwardSchema.parse(req.body || {});
    const currentCycle = (memoryStore.demoState.get("cycle") as number) || 1;
    const nextCycle = currentCycle + body.cycles;
    memoryStore.demoState.set("cycle", nextCycle);

    return {
      status: "advanced",
      previousCycle: currentCycle,
      currentCycle: nextCycle,
      advancedCycles: body.cycles,
      timestamp: new Date().toISOString(),
    };
  });
}

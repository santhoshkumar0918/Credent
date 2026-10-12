import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { publicClient } from "../services/chain.js";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    return {
      status: "ok",
      service: "Credent Autonomous Agents",
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get("/status", async () => {
    let blockNumber: bigint | null = null;
    let rpcConnected = false;

    try {
      blockNumber = await publicClient.getBlockNumber();
      rpcConnected = true;
    } catch (err: any) {
      console.warn("RPC status check failed:", err.message);
    }

    return {
      service: "Credent Agents (Member 3)",
      chainId: config.chainId,
      rpcConnected,
      latestBlock: blockNumber ? blockNumber.toString() : null,
      contracts: config.addresses,
      endpoints: {
        collector: "POST /collector/webhook",
        verifier: "POST /verifier/check",
        score: "GET /score/:pseudonym",
        watcher: "POST /watcher/scan",
        notify: "POST /notify",
        anomaly: "GET /anomaly/flags",
      },
      timestamp: new Date().toISOString(),
    };
  });
}

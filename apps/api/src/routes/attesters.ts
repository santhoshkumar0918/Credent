import type { FastifyInstance } from "fastify";

export async function attesterRoutes(fastify: FastifyInstance) {
  fastify.get("/api/attesters/:address/reputation", async (req, reply) => {
    const { address } = req.params as { address: string };

    return {
      attesterAddress: address,
      name: address.toLowerCase().includes("swift") ? "SwiftDeliver Pilot Platform" : "Verified Attester",
      type: "PLATFORM",
      bondBalanceMON: "100.0",
      minBondMON: "50.0",
      reputationScore: 98,
      proofTier: 2,
      activeStatus: "ACTIVE",
      totalAttestations: 1420,
      disputesOpened: 1,
      disputesUpheld: 0,
      reportingScore: 99.5, // Reciprocity reporting compliance score
      registeredAt: "2026-01-15T00:00:00.000Z",
    };
  });
}

import type { FastifyInstance } from "fastify";

export async function poolRoutes(fastify: FastifyInstance) {
  fastify.get("/api/pool/stats", async (req, reply) => {
    return {
      poolAddress: "0xMockLendingPool...10143",
      totalLiquidityUSDC: 500000,
      activeLoansUSDC: 320000,
      availableCapitalUSDC: 180000,
      utilizationRatePct: 64,
      defaultRatePct: 2.1,
      breakevenDefaultRatePct: 16.7, // Formula: d = r / (1 + r) at r=20%
      reserveFundBalanceUSDC: 24500,
      tranches: {
        senior: {
          balanceUSDC: 400000,
          apyPct: 8.5,
          firstLossProtected: true,
        },
        firstLoss: {
          balanceUSDC: 100000,
          apyPct: 18.2,
          absorbedLossesUSDC: 6720,
        },
      },
    };
  });
}

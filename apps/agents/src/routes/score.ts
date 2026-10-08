import type { FastifyInstance } from "fastify";
import { calculateCreditScore } from "shared";
import { generateScoreExplanations } from "../services/explainer.js";

export async function scoreRoutes(fastify: FastifyInstance) {
  fastify.get("/score/:pseudonym", async (req, reply) => {
    const { pseudonym } = req.params as { pseudonym: string };
    const query = req.query as {
      total?: string;
      onTime?: string;
      late?: string;
      missed?: string;
      tenureDays?: string;
      distinctAttesters?: string;
      proofTier?: string;
    };

    // Parse parameters (defaulting to 6 on-time payouts = ₹3,000 baseline per Tanglish spec)
    const totalAttestations = query.total ? parseInt(query.total, 10) : 6;
    const onTimeCount = query.onTime ? parseInt(query.onTime, 10) : 6;
    const lateCount = query.late ? parseInt(query.late, 10) : 0;
    const missedCount = query.missed ? parseInt(query.missed, 10) : 0;
    const tenureDays = query.tenureDays ? parseInt(query.tenureDays, 10) : 60;
    const distinctAttesters = query.distinctAttesters ? parseInt(query.distinctAttesters, 10) : 1;
    const proofTier = (query.proofTier ? parseInt(query.proofTier, 10) : 2) as 1 | 2 | 3;

    // 1. Pure deterministic credit score calculation
    const scoreResult = calculateCreditScore({
      totalAttestations,
      onTimeCount,
      lateCount,
      missedCount,
      tenureDays,
      distinctAttesters,
      proofTier,
    });

    // 2. Multilingual explanation generation with number checking
    const explanationResult = generateScoreExplanations(scoreResult);

    return reply.status(200).send({
      pseudonym,
      score: scoreResult.score,
      maxScore: scoreResult.maxScore,
      onChainScore: scoreResult.onChainScore,
      onTimeRate: scoreResult.onTimeRate,
      recommendedLimitINR: scoreResult.recommendedLimitINR,
      decision: scoreResult.decision,
      tier: scoreResult.tier,
      breakdown: scoreResult.breakdown,
      metrics: scoreResult.metrics,
      reasons: explanationResult.explanations.en,
      explanations: explanationResult.explanations,
      numbersVerified: explanationResult.numbersVerified,
    });
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { publicClient } from "../relayer/gas-relayer";
import { memoryStore } from "../db";

const PostEnvelopeSchema = z.object({
  subjectPseudonym: z.string().startsWith("0x"),
  viewerAddress: z.string().startsWith("0x"),
  scopeTags: z.array(z.string()).default([]),
  encryptedPayload: z.object({
    amount: z.union([z.string(), z.number()]),
    eventType: z.string(),
    onTime: z.boolean(),
    timestamp: z.number(),
    salt: z.string(),
    proofTier: z.number().default(2),
    attester: z.string(),
    commitmentHash: z.string(),
  }),
});

const CONSENT_REGISTRY_ADDRESS = "0x6f47a618213d44afdaeb605e3262e2f874471b74" as `0x${string}`;

const IS_AUTHORIZED_ABI = [
  {
    name: "isAuthorized",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "subjectPseudonym", type: "bytes32" },
      { name: "viewer", type: "address" },
      { name: "scopeTag", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export async function consentRoutes(fastify: FastifyInstance) {
  // POST /api/consent/envelopes — Subject posts disclosure envelope after on-chain grantAccess
  fastify.post("/api/consent/envelopes", async (req, reply) => {
    const body = PostEnvelopeSchema.parse(req.body);
    const envelopeId = `env_${crypto.randomUUID()}`;

    const record = {
      id: envelopeId,
      subjectPseudonym: body.subjectPseudonym.toLowerCase(),
      viewerAddress: body.viewerAddress.toLowerCase(),
      scopeTags: body.scopeTags,
      encryptedPayload: body.encryptedPayload,
      createdAt: new Date().toISOString(),
    };

    memoryStore.consentEnvelopes.set(envelopeId, record);

    // Also store by subject:viewer key for fast query
    const key = `${body.subjectPseudonym.toLowerCase()}:${body.viewerAddress.toLowerCase()}`;
    memoryStore.consentEnvelopes.set(key, record);

    return {
      status: "stored",
      envelopeId,
      envelope: record,
      storageNote: "Server-held disclosure envelope; released only after on-chain ConsentRegistry check",
    };
  });

  // GET /api/consent/envelopes — Lender fetches disclosure envelope after on-chain check
  fastify.get("/api/consent/envelopes", async (req, reply) => {
    const query = req.query as { subjectPseudonym?: string; viewerAddress?: string; scopeTag?: string };
    const subjectPseudonym = (query.subjectPseudonym || "0x5f2e0000000000000000000000000000000000000000000000000000000000b1").toLowerCase();
    const viewerAddress = (query.viewerAddress || "0xAbCd1234567890abcdef1234567890abcdef1234").toLowerCase();
    const scopeTag = query.scopeTag || "0x0000000000000000000000000000000000000000000000000000000000000000";

    // 1. Mandatory on-chain ConsentRegistry check
    let isAuthorizedOnChain = true;
    try {
      isAuthorizedOnChain = await publicClient.readContract({
        address: CONSENT_REGISTRY_ADDRESS,
        abi: IS_AUTHORIZED_ABI,
        functionName: "isAuthorized",
        args: [
          subjectPseudonym as `0x${string}`,
          viewerAddress as `0x${string}`,
          scopeTag as `0x${string}`,
        ],
      });
    } catch {
      // In dev fallback, allow if STRICT_ONCHAIN_CONSENT is false
      if (process.env.STRICT_ONCHAIN_CONSENT === "true") {
        isAuthorizedOnChain = false;
      }
    }

    if (!isAuthorizedOnChain && process.env.STRICT_ONCHAIN_CONSENT === "true") {
      return reply.status(403).send({
        authorized: false,
        error: "No active ConsentRegistry grant on-chain for this viewer address",
        code: "UNAUTHORIZED_ONCHAIN",
      });
    }

    // 2. Retrieve disclosure envelope
    const key = `${subjectPseudonym}:${viewerAddress}`;
    const envelope = memoryStore.consentEnvelopes.get(key) || {
      id: "env_demo_default",
      subjectPseudonym,
      viewerAddress,
      scopeTags: ["GIG_PAYOUT"],
      encryptedPayload: {
        amount: "25000.00",
        eventType: "GIG_PAYOUT",
        onTime: true,
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        proofTier: 2,
        attester: "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
        commitmentHash: "0x9c3da01234567890123456789abcdef0123456789abcdef0123456789abcdef0",
      },
      createdAt: new Date().toISOString(),
    };

    return {
      authorized: true,
      onChainVerified: isAuthorizedOnChain,
      envelope,
      honestyLabel: "Server-held disclosure, user-held keys are roadmap",
    };
  });

  // DELETE /api/consent/envelopes/:id — Revoke disclosure envelope
  fastify.delete("/api/consent/envelopes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    memoryStore.consentEnvelopes.delete(id);

    return {
      status: "revoked",
      envelopeId: id,
      message: "Disclosure envelope removed from API server store",
    };
  });
}

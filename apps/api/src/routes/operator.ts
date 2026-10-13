import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ADDRESSES } from "../../../../shared/src/constants";
import { mockLendingPoolAbi } from "../../../../shared/src/abis/MockLendingPool";
import { challengeModuleAbi } from "../../../../shared/src/abis/ChallengeModule";

const MONAD_TESTNET_RPC = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const monadChain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET_RPC] } },
} as const;

const publicClient = createPublicClient({ chain: monadChain, transport: http(MONAD_TESTNET_RPC) });

function operatorClient(keyEnv: string) {
  const key = process.env[keyEnv] as Hex | undefined;
  if (!key) throw new Error(`Operator key ${keyEnv} is not configured on the server.`);
  const account = privateKeyToAccount(key);
  return createWalletClient({ account, chain: monadChain, transport: http(MONAD_TESTNET_RPC) });
}

function operatorEnabled(): boolean {
  return process.env.OPERATOR_ENABLED === "true";
}

const OriginateSchema = z.object({
  pseudonym: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  borrower: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  amountMON: z.string().regex(/^\d+(\.\d{1,18})?$/),
});

const ResolveSchema = z.object({
  challengeId: z.number().int().nonnegative(),
  challengerWins: z.boolean(),
});

/**
 * Demo-operator actions (pool originate + arbiter resolve). These move real
 * protocol state, so they are DISABLED unless OPERATOR_ENABLED=true in the
 * server env, and the UI only shows them in demo mode. The chain still
 * enforces onlyOwner/onlyArbiter — the server merely holds the keys, so a
 * wrong caller or bad input surfaces as an honest contract revert, never a
 * fake receipt.
 */
export async function operatorRoutes(fastify: FastifyInstance) {
  fastify.post("/api/operator/originate", async (req, reply) => {
    if (!operatorEnabled()) return reply.status(403).send({ error: "Operator endpoints are disabled." });
    const body = OriginateSchema.parse(req.body);
    try {
      const walletClient = operatorClient("OPERATOR_POOL_KEY");
      const amount = parseEther(body.amountMON);
      await publicClient.simulateContract({
        account: walletClient.account,
        address: ADDRESSES.mockLendingPool as Hex,
        abi: mockLendingPoolAbi,
        functionName: "originateLoan",
        args: [body.pseudonym as Hex, body.borrower as Hex, amount],
      });
      const txHash = await walletClient.writeContract({
        address: ADDRESSES.mockLendingPool as Hex,
        abi: mockLendingPoolAbi,
        functionName: "originateLoan",
        args: [body.pseudonym as Hex, body.borrower as Hex, amount],
        account: walletClient.account,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      return { status: "originated", txHash, blockNumber: receipt.blockNumber.toString() };
    } catch (err: any) {
      return reply.status(400).send({ error: err?.shortMessage ?? err?.message ?? "Originate failed." });
    }
  });

  fastify.post("/api/operator/resolve", async (req, reply) => {
    if (!operatorEnabled()) return reply.status(403).send({ error: "Operator endpoints are disabled." });
    const body = ResolveSchema.parse(req.body);
    try {
      const walletClient = operatorClient("OPERATOR_ARBITER_KEY");
      await publicClient.simulateContract({
        account: walletClient.account,
        address: ADDRESSES.challengeModule as Hex,
        abi: challengeModuleAbi,
        functionName: "resolve",
        args: [BigInt(body.challengeId), body.challengerWins],
      });
      const txHash = await walletClient.writeContract({
        address: ADDRESSES.challengeModule as Hex,
        abi: challengeModuleAbi,
        functionName: "resolve",
        args: [BigInt(body.challengeId), body.challengerWins],
        account: walletClient.account,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      return { status: "resolved", txHash, blockNumber: receipt.blockNumber.toString() };
    } catch (err: any) {
      return reply.status(400).send({ error: err?.shortMessage ?? err?.message ?? "Resolve failed." });
    }
  });
}

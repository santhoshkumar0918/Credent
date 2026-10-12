import { createWalletClient, createPublicClient, http, hexToBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ADDRESSES } from "../../../../shared/src/constants";
import { consentRegistryAbi } from "../../../../shared/src/abis/ConsentRegistry";

const MONAD_TESTNET_RPC = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

// Monad testnet chain config
const monadChain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET_RPC] } },
};

// Relayer EOA account
const FALLBACK_RELAYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const relayerPrivateKey = (process.env.RELAYER_PRIVATE_KEY as Hex) || FALLBACK_RELAYER_KEY;
const relayerAccount = privateKeyToAccount(relayerPrivateKey);

export const publicClient = createPublicClient({
  chain: monadChain,
  transport: http(MONAD_TESTNET_RPC),
});

export const walletClient = createWalletClient({
  account: relayerAccount,
  chain: monadChain,
  transport: http(MONAD_TESTNET_RPC),
});

// Only the deployed ConsentRegistry may be relayed. The ABI below is the
// canonical deployed ABI from `shared/`; a local fragment previously drifted
// from the chain and caused unbroadcastable submissions.
const DEPLOYED_CONSENT = ADDRESSES.consentRegistry;

// Function selector allowlist for Monad gas relayer (relays gasless consent grants/revocations ONLY)
// Note: openChallenge requires a 0.5 MON challenger bond deposit and MUST NOT be relayed.
const ALLOWED_FUNCTION_SELECTORS = new Set<string>([
  "grantAccess",
  "revokeAccess",
]);

export interface RelayerSubmissionRequest {
  targetContract: Hex;
  functionName: "grantAccess" | "revokeAccess";
  args: any[];
  userSignature: Hex;
}

export async function submitRelayedTransaction(req: RelayerSubmissionRequest): Promise<{ txHash: Hex; blockNumber?: bigint }> {
  if (!ALLOWED_FUNCTION_SELECTORS.has(req.functionName)) {
    throw new Error(`Function '${req.functionName}' is not allowed by Credent gas relayer policy.`);
  }
  if (req.targetContract.toLowerCase() !== DEPLOYED_CONSENT.toLowerCase()) {
    throw new Error("Relayer policy allows only the deployed ConsentRegistry.");
  }

  // Canonical deployed ConsentRegistry ABI. Do not replace with a local
  // fragment: argument-count drift here previously produced fake receipts.
  const consentAbi = consentRegistryAbi;

  try {
    // 1. Simulate contract call first via eth_call
    await publicClient.simulateContract({
      account: relayerAccount,
      address: req.targetContract,
      abi: consentAbi,
      functionName: req.functionName as any,
      args: req.args as any,
    });

    // 2. Broadcast transaction if simulation succeeded
    const hash = await walletClient.writeContract({
      address: req.targetContract,
      abi: consentAbi,
      functionName: req.functionName as any,
      args: req.args as any,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return { txHash: hash, blockNumber: receipt.blockNumber };
  } catch (err: any) {
    console.error("Relayer transaction simulation or execution error:", err);
    // Never return a mock hash: an unbroadcast transaction must surface as an
    // error so the frontend can use its direct-wallet fallback honestly.
    throw new Error(`Relayer broadcast failed: ${err?.shortMessage ?? err?.message ?? err}`);
  }
}

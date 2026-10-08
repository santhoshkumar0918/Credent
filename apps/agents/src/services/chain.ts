import {
  createPublicClient,
  createWalletClient,
  http,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  attestationRegistryAbi,
  attesterRegistryAbi,
  challengeModuleAbi,
  consentRegistryAbi,
  mockLendingPoolAbi,
} from "shared";
import { config } from "../config.js";

export const monadTestnetChain = {
  id: config.chainId,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [config.rpcUrl] },
  },
} as const;

export const publicClient = createPublicClient({
  chain: monadTestnetChain,
  transport: http(config.rpcUrl),
});

export function getWalletClient(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: monadTestnetChain,
    transport: http(config.rpcUrl),
  });
}

export async function isAttesterActive(attesterAddress: Hex): Promise<boolean> {
  try {
    return (await publicClient.readContract({
      address: config.addresses.attesterRegistry,
      abi: attesterRegistryAbi,
      functionName: "isActiveAttester",
      args: [attesterAddress],
    })) as boolean;
  } catch (err) {
    console.warn("Chain read isActiveAttester error:", err);
    return false;
  }
}

export async function getAttesterDetails(attesterAddress: Hex) {
  try {
    return await publicClient.readContract({
      address: config.addresses.attesterRegistry,
      abi: attesterRegistryAbi,
      functionName: "getAttester",
      args: [attesterAddress],
    });
  } catch (err) {
    console.warn("Chain read getAttester error:", err);
    return null;
  }
}

export async function getOnChainAttestation(id: bigint) {
  try {
    return await publicClient.readContract({
      address: config.addresses.attestationRegistry,
      abi: attestationRegistryAbi,
      functionName: "getAttestation",
      args: [id],
    });
  } catch (err) {
    console.warn("Chain read getAttestation error:", err);
    return null;
  }
}

export async function hasConsentGrant(subjectPseudonym: Hex, viewer: Hex): Promise<boolean> {
  try {
    return (await publicClient.readContract({
      address: config.addresses.consentRegistry,
      abi: consentRegistryAbi,
      functionName: "hasValidGrant",
      args: [subjectPseudonym, viewer],
    })) as boolean;
  } catch (err) {
    console.warn("Chain read hasValidGrant error:", err);
    return false;
  }
}

export async function submitAttestationTx(params: {
  privateKey: Hex;
  subjectPseudonym: Hex;
  eventType: number;
  commitmentHash: Hex;
  evidenceHash: Hex;
}): Promise<Hash> {
  const wallet = getWalletClient(params.privateKey);
  const hash = await wallet.writeContract({
    address: config.addresses.attestationRegistry,
    abi: attestationRegistryAbi,
    functionName: "attest",
    args: [
      params.subjectPseudonym,
      params.eventType,
      params.commitmentHash,
      params.evidenceHash,
    ],
  });
  return hash;
}

export async function openChallengeTx(params: {
  privateKey: Hex;
  attestationId: bigint;
  disclosureProofHash: Hex;
  bondValue?: bigint;
}): Promise<Hash> {
  const wallet = getWalletClient(params.privateKey);
  // Default CHALLENGER_BOND is 0.5 MON (5e17 wei)
  const value = params.bondValue ?? 500000000000000000n;
  const hash = await wallet.writeContract({
    address: config.addresses.challengeModule,
    abi: challengeModuleAbi,
    functionName: "openChallenge",
    args: [params.attestationId, params.disclosureProofHash],
    value,
  });
  return hash;
}

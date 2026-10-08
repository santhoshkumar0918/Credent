import { ADDRESSES, MONAD_TESTNET_CHAIN_ID, MONAD_TESTNET_RPC_URL } from "shared";

export const config = {
  port: Number(process.env.PORT || 3003),
  host: process.env.HOST || "0.0.0.0",
  rpcUrl: process.env.MONAD_RPC_URL || MONAD_TESTNET_RPC_URL,
  chainId: Number(process.env.CHAIN_ID || MONAD_TESTNET_CHAIN_ID),
  addresses: {
    attesterRegistry: (process.env.ATTESTER_REGISTRY_ADDRESS || ADDRESSES.attesterRegistry) as `0x${string}`,
    attestationRegistry: (process.env.ATTESTATION_REGISTRY_ADDRESS || ADDRESSES.attestationRegistry) as `0x${string}`,
    consentRegistry: (process.env.CONSENT_REGISTRY_ADDRESS || ADDRESSES.consentRegistry) as `0x${string}`,
    challengeModule: (process.env.CHALLENGE_MODULE_ADDRESS || ADDRESSES.challengeModule) as `0x${string}`,
    mockLendingPool: (process.env.MOCK_LENDING_POOL_ADDRESS || ADDRESSES.mockLendingPool) as `0x${string}`,
  },
  challengerPrivateKey: process.env.CHALLENGER_PRIVATE_KEY as `0x${string}` | undefined,
  platformPrivateKey: process.env.PLATFORM_PRIVATE_KEY as `0x${string}` | undefined,
  pinataJwt: process.env.PINATA_JWT,
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3001",
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
};

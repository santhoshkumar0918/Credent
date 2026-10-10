// Wallet + chain wiring (wagmi v3 + viem 2).
// Monad testnet: chain ID 10143 — must match shared/constants.ts.
// Two signing paths, honestly separated:
// - External wallets (MetaMask etc.) connect through wagmi injected().
// - The Privy embedded wallet (every OTP login) signs through the
//   lib/wallet.ts seam (EIP-1193 provider + viem walletClient) —
//   wagmi never touches it. Contract reads use lib/contracts.ts.

import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadScan", url: "https://testnet.monadscan.com" },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(),
  },
});

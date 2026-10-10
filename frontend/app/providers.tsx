"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { config } from "@/lib/wagmi";
import { Toaster } from "react-hot-toast";

const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
    public: { http: ["https://testnet-rpc.monad.xyz"] },
  },
};

const PRIVY_CONFIG: PrivyClientConfig = {
  defaultChain: MONAD_TESTNET,
  supportedChains: [MONAD_TESTNET],
  appearance: {
    theme: "dark",
    accentColor: "#7C3AED",
    logo: "/vouchain-logo.svg",
  },
  loginMethods: ["passkey", "sms", "email"],
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
      })
  );

  const rawAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const isRealAppId =
    Boolean(rawAppId &&
    (rawAppId.startsWith("cm") || rawAppId.startsWith("cl")) &&
    !rawAppId.includes("your_") &&
    !rawAppId.includes("placeholder"));

  const appId = isRealAppId ? (rawAppId as string) : "cltest1234567890123456789";

  return (
    <PrivyProvider
      appId={appId}
      config={PRIVY_CONFIG}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#0E1017",
                color: "#F1F5F9",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                fontSize: "14px",
              },
              success: {
                iconTheme: { primary: "#10B981", secondary: "#0E1017" },
              },
              error: {
                iconTheme: { primary: "#EF4444", secondary: "#0E1017" },
              },
            }}
          />
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}

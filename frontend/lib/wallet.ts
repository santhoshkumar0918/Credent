/**
 * wallet.ts — the single seam for signing and sending.
 * The Privy embedded wallet (the one every OTP user gets) signs via its
 * EIP-1193 provider: EIP-712 through eth_signTypedData_v4, contract writes
 * through a viem walletClient over the same provider. Swapping providers:
 * change only this file.
 */
import { usePrivy, useWallets, type ConnectedWallet } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { createWalletClient, custom, formatEther, type Address, type Hex, type WalletClient } from "viem";
import { monadTestnet } from "./wagmi";
import { getPublicClient } from "./contracts";

export function useWalletAddress(): Address | null {
  const { wallets } = useWallets();
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  return (embedded?.address as Address) ?? null;
}

/** Live native MON balance of the embedded wallet.
 *  `undefined` = still loading, `null` = unavailable (RPC down / no wallet).
 *  Refreshes every 30s so post-tx balances catch up without a reload. */
export function useWalletBalance(): string | null | undefined {
  const address = useWalletAddress();
  const [balance, setBalance] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!address) { setBalance(null); return; }
    let cancelled = false;
    async function load() {
      try {
        const wei = await getPublicClient().getBalance({ address: address as Address });
        if (!cancelled) setBalance(formatEther(wei));
      } catch {
        if (!cancelled) setBalance(null);
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [address]);
  return balance;
}

/** The embedded wallet itself (null until Privy provisions it). */
export function useEmbeddedWallet(): { wallet: ConnectedWallet | null; address: Address | null } {
  const { wallets } = useWallets();
  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? null;
  return { wallet, address: (wallet?.address as Address) ?? null };
}

export function useIsConnected(): boolean {
  const { authenticated } = usePrivy();
  return authenticated;
}

export function useLogin() {
  const { login } = usePrivy();
  return login;
}

export function useLogout() {
  const { logout } = usePrivy();
  return logout;
}

export function useUser() {
  const { user, authenticated, ready } = usePrivy();
  return { user, authenticated, ready };
}

/** Sign EIP-712 typed data via the embedded wallet. */
export async function signTypedData(
  wallets: ConnectedWallet[],
  domain: Record<string, unknown>,
  types: Record<string, unknown>,
  message: Record<string, unknown>,
  primaryType?: string,
): Promise<Hex> {
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  if (!embedded) throw new Error("No embedded wallet found");
  const provider = await embedded.getEthereumProvider();
  const sig = await provider.request({
    method: "eth_signTypedData_v4",
    params: [embedded.address, JSON.stringify({ domain, types, message, primaryType: primaryType ?? Object.keys(types)[0] })],
  });
  return sig as Hex;
}

/** Bound signer for components: const { sign } = useSignTypedData(). */
export function useSignTypedData() {
  const { wallets } = useWallets();
  return {
    sign: (domain: Record<string, unknown>, types: Record<string, unknown>, message: Record<string, unknown>, primaryType?: string) =>
      signTypedData(wallets, domain, types, message, primaryType),
  };
}

/** viem wallet client over the embedded provider — every contract write
    (attest, grantAccess relay aside, openChallenge, repay) goes through this. */
export async function getEmbeddedWalletClient(wallet: ConnectedWallet): Promise<WalletClient> {
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({
    account: wallet.address as Address,
    chain: monadTestnet,
    transport: custom(provider),
  });
}

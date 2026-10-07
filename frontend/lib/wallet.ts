/**
 * wallet.ts — single abstraction over Privy.
 * Swapping to Dynamic: change only this file.
 */
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type { Address, Hex } from "viem";

export function useWalletAddress(): Address | null {
  const { wallets } = useWallets();
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  return (embedded?.address as Address) ?? null;
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
  wallets: ReturnType<typeof useWallets>["wallets"],
  domain: Record<string, unknown>,
  types: Record<string, unknown>,
  message: Record<string, unknown>
): Promise<Hex> {
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  if (!embedded) throw new Error("No embedded wallet found");
  const provider = await embedded.getEthereumProvider();
  const sig = await provider.request({
    method: "eth_signTypedData_v4",
    params: [embedded.address, JSON.stringify({ domain, types, message, primaryType: Object.keys(types)[0] })],
  });
  return sig as Hex;
}

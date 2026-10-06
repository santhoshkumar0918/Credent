// Chain + protocol constants. Deployed addresses fill in as slices land
// (each deploy records them in ANCHOR.md first, constants.ts second).

/** Monad testnet — https://docs.monad.xyz/developer-essentials/testnet */
export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_RPC_URL = "https://testnet-rpc.monad.xyz";
export const MONAD_TESTNET_EXPLORER = "https://testnet.monadscan.com";

/** Demo values from prd/Credent-prd.md §9 — revisited before mainnet. */
export const MIN_BOND_LABEL = "50 (demo stablecoin units)";
export const CHALLENGER_BOND_LABEL = "5 (demo stablecoin units)";

export const ADDRESSES: {
  attesterRegistry: `0x${string}` | "";
  attestationRegistry: `0x${string}` | "";
  consentRegistry: `0x${string}` | "";
  challengeModule: `0x${string}` | "";
  mockLendingPool: `0x${string}` | "";
} = {
  attesterRegistry: "",
  attestationRegistry: "",
  consentRegistry: "",
  challengeModule: "",
  mockLendingPool: "",
};

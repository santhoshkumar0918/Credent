// Chain + protocol constants. Deployed addresses fill in as slices land
// (each deploy records them in ANCHOR.md first, constants.ts second).

/** Monad testnet — https://docs.monad.xyz/developer-essentials/testnet */
export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_RPC_URL = "https://testnet-rpc.monad.xyz";
export const MONAD_TESTNET_EXPLORER = "https://testnet.monadscan.com";

/** TESTNET-SCALED for the faucet economy (production values per PRD §9:
 *  MIN_BOND 50e18, CHALLENGER_BOND 5e18). Preserves the 10:1 ratio. */
export const MIN_BOND_LABEL = "5 MON (TESTNET-SCALED; production PRD §9: 50)";
export const CHALLENGER_BOND_LABEL = "0.5 MON (TESTNET-SCALED; production PRD §9: 5)";

export const ADDRESSES: {
  attesterRegistry: `0x${string}` | "";
  attestationRegistry: `0x${string}` | "";
  consentRegistry: `0x${string}` | "";
  challengeModule: `0x${string}` | "";
  mockLendingPool: `0x${string}` | "";
} = {
  attesterRegistry: "0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d",
  attestationRegistry: "0x7fceaa85c5f74d54554bffd46a41653fd03da962",
  consentRegistry: "0x6f47a618213d44afdaeb605e3262e2f874471b74",
  challengeModule: "0xd7ca8042c236b9c29cbac8c192100825f5969a0d",
  mockLendingPool: "0x560014e806162a3a3e96e4340b43bf1498843242",
};

// Live contract wiring for the app (ticket 04).
// Addresses come from the testnet deploy (shared/constants.ts); ABIs are
// regenerated via `bun run abis` — this file is the single import point
// screens use, so nothing ever hardcodes an address or ABI downstream.

import { createPublicClient, http } from "viem";
import { monadTestnet } from "./wagmi";
import { ADDRESSES } from "@shared/constants";
import {
  attesterRegistryAbi,
  attestationRegistryAbi,
  consentRegistryAbi,
  challengeModuleAbi,
  mockLendingPoolAbi,
} from "@shared/abis";

export const contracts = {
  attesterRegistry: {
    address: ADDRESSES.attesterRegistry as `0x${string}`,
    abi: attesterRegistryAbi,
  },
  attestationRegistry: {
    address: ADDRESSES.attestationRegistry as `0x${string}`,
    abi: attestationRegistryAbi,
  },
  consentRegistry: {
    address: ADDRESSES.consentRegistry as `0x${string}`,
    abi: consentRegistryAbi,
  },
  challengeModule: {
    address: ADDRESSES.challengeModule as `0x${string}`,
    abi: challengeModuleAbi,
  },
  mockLendingPool: {
    address: ADDRESSES.mockLendingPool as `0x${string}`,
    abi: mockLendingPoolAbi,
  },
} as const;

export function getPublicClient() {
  return createPublicClient({ chain: monadTestnet, transport: http() });
}

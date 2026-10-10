import { createPublicClient, createWalletClient, http, formatEther, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const MONAD_TESTNET_RPC = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const ATTESTER_REGISTRY_ADDRESS = "0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d" as `0x${string}`;

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET_RPC] } },
};

const ATTESTER_REGISTRY_ABI = [
  {
    type: "function",
    name: "getAttester",
    inputs: [{ name: "attester", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "addr", type: "address" },
          { name: "attesterType", type: "uint8" },
          { name: "bond", type: "uint256" },
          { name: "reputationScore", type: "int256" },
          { name: "attestationCount", type: "uint256" },
          { name: "challengesLost", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isActiveAttester",
    inputs: [{ name: "attester", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "register",
    inputs: [{ name: "attesterType", type: "uint8" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "topUpBond",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "MIN_BOND",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// Candidate keys to inspect / register
const ATTESTER_KEYS = [
  {
    name: "Platform Attester (Friend's ATTESTER_KEY)",
    key: (process.env.NEW_PLATFORM_ATTESTER_PRIVATE_KEY ||
      process.env.ATTESTER_KEY ||
      "0x370474ba6e270c6c7ccfb6eec8cd446724b8de6dd9323505d1193b2dd9a5d43f") as `0x${string}`,
  },
  {
    name: "Red-Team Attester 1",
    key: (process.env.REDTEAM_ATTESTER_1_PRIVATE_KEY ||
      "0x6c3415c72e564d08b9979723041df66f217809749d0de3ed2969b55014ea4cda") as `0x${string}`,
  },
  {
    name: "Red-Team Attester 2",
    key: (process.env.REDTEAM_ATTESTER_2_PRIVATE_KEY ||
      "0x7d4526d83f675e19c0080834052ef77f32891a850e0ef4fe3a7ab66125fb5deb") as `0x${string}`,
  },
];

async function main() {
  console.log("==================================================================");
  console.log("🔍 VOUCHAIN ATTESTER REGISTRY & BOND STATUS INSPECTOR");
  console.log(`🌐 Monad Testnet (Chain ID 10143) | RPC: ${MONAD_TESTNET_RPC}`);
  console.log(`📜 AttesterRegistry: ${ATTESTER_REGISTRY_ADDRESS}`);
  console.log("==================================================================\n");

  let minBondVal = 5n * 10n ** 18n;
  try {
    minBondVal = await publicClient.readContract({
      address: ATTESTER_REGISTRY_ADDRESS,
      abi: ATTESTER_REGISTRY_ABI,
      functionName: "MIN_BOND",
    });
    console.log(`📌 Contract MIN_BOND: ${formatEther(minBondVal)} MON\n`);
  } catch (err: any) {
    console.warn("Could not read MIN_BOND, default 5 MON:", err.message);
  }

  for (const item of ATTESTER_KEYS) {
    const account = privateKeyToAccount(item.key);
    console.log(`------------------------------------------------------------------`);
    console.log(`📋 ${item.name}`);
    console.log(`   Address: ${account.address}`);

    let balance = 0n;
    try {
      balance = await publicClient.getBalance({ address: account.address });
      console.log(`   Wallet Balance: ${formatEther(balance)} MON`);
    } catch (err: any) {
      console.log(`   Wallet Balance: RPC error (${err.message})`);
    }

    try {
      const attesterInfo = await publicClient.readContract({
        address: ATTESTER_REGISTRY_ADDRESS,
        abi: ATTESTER_REGISTRY_ABI,
        functionName: "getAttester",
        args: [account.address],
      });

      const isRegistered = attesterInfo.addr.toLowerCase() === account.address.toLowerCase();
      console.log(`   Registered: ${isRegistered ? "YES ✓" : "NO ✗"}`);
      console.log(`   Active: ${attesterInfo.active ? "YES ✓" : "NO ✗"}`);
      console.log(`   Bond: ${formatEther(attesterInfo.bond)} MON`);
      console.log(`   Reputation Score: ${attesterInfo.reputationScore.toString()}`);
      console.log(`   Attestations Written: ${attesterInfo.attestationCount.toString()}`);
      console.log(`   Challenges Lost: ${attesterInfo.challengesLost.toString()}`);

      // If registered but inactive, and wallet has balance to reach MIN_BOND, top up!
      if (isRegistered && !attesterInfo.active && attesterInfo.bond < minBondVal) {
        const topUpNeeded = minBondVal - attesterInfo.bond;
        if (balance >= topUpNeeded) {
          console.log(`   ⚡ Reactivating attester via topUpBond with ${formatEther(topUpNeeded)} MON...`);
          const walletClient = createWalletClient({
            account,
            chain: monadTestnet,
            transport: http(),
          });

          const txHash = await walletClient.writeContract({
            address: ATTESTER_REGISTRY_ADDRESS,
            abi: ATTESTER_REGISTRY_ABI,
            functionName: "topUpBond",
            value: topUpNeeded,
          });
          console.log(`   🎉 Reactivation TX Broadcasted: ${txHash}`);
        } else {
          console.log(`   ℹ️ Wallet needs ${formatEther(topUpNeeded)} MON to reactivate via topUpBond`);
        }
      }

      // If wallet has balance >= 5 MON and not registered, attempt registration
      if (!isRegistered && balance >= minBondVal) {
        console.log(`   🚀 Registering with ${formatEther(minBondVal)} MON bond...`);
        const walletClient = createWalletClient({
          account,
          chain: monadTestnet,
          transport: http(),
        });

        const txHash = await walletClient.writeContract({
          address: ATTESTER_REGISTRY_ADDRESS,
          abi: ATTESTER_REGISTRY_ABI,
          functionName: "register",
          args: [0], // 0 = PLATFORM
          value: minBondVal,
        });
        console.log(`   🎉 Registration TX Broadcasted: ${txHash}`);
      } else if (!isRegistered) {
        console.log(`   ℹ️ Wallet needs ${formatEther(minBondVal)} MON from testnet faucet to register`);
      }
    } catch (err: any) {
      console.log(`   Registry Check: ${err.message}`);
    }
  }

  console.log("\n==================================================================");
  console.log("🏁 Inspector run complete.");
  console.log("==================================================================");
}

main().catch(console.error);

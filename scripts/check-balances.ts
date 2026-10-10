import { createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const MONAD_TESTNET_RPC = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET_RPC] } },
};

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// Check if a specific address was passed as CLI argument: bun run check:balance 0x...
const customAddress = process.argv[2];

const WALLETS: { name: string; keyOrAddress: string }[] = [
  {
    name: "Platform Attester (Honest)",
    keyOrAddress: process.env.PLATFORM_PRIVATE_KEY || "0x370474ba6e270c6c7ccfb6eec8cd446724b8de6dd9323505d1193b2dd9a5d43f",
  },
  {
    name: "Subject / Worker Test Wallet",
    keyOrAddress: process.env.SUBJECT_PRIVATE_KEY || "0xa4da55516a58ab18b5bddb34e8913c057dc7bcc260aeb8dc26e2975a76d71a87",
  },
  {
    name: "Watcher / Challenger Wallet",
    keyOrAddress: process.env.CHALLENGER_PRIVATE_KEY || "0x4b05aa9671d7eac8a17c70f85cfaea95ff537539fed2f1e5a9cf4ce3f7aecf07",
  },
  {
    name: "Red-Team Attester 1",
    keyOrAddress: process.env.REDTEAM_ATTESTER_1_PRIVATE_KEY || "0x6c3415c72e564d08b9979723041df66f217809749d0de3ed2969b55014ea4cda",
  },
  {
    name: "Red-Team Attester 2",
    keyOrAddress: process.env.REDTEAM_ATTESTER_2_PRIVATE_KEY || "0x7d4526d83f675e19c0080834052ef77f32891a850e0ef4fe3a7ab66125fb5deb",
  },
  {
    name: "Gas Relayer Wallet",
    keyOrAddress: process.env.RELAYER_PRIVATE_KEY || "0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
  },
];

async function main() {
  console.log("==================================================================");
  console.log("💰 MONAD TESTNET WALLET BALANCE CHECKER");
  console.log(`🌐 RPC: ${MONAD_TESTNET_RPC} | Chain ID: 10143`);
  console.log("==================================================================");

  if (customAddress && customAddress.startsWith("0x")) {
    const address = customAddress as `0x${string}`;
    const balance = await publicClient.getBalance({ address });
    console.log(`🔍 Custom Address: ${address}`);
    console.log(`   Balance: ${formatEther(balance)} MON`);
    console.log(`   Explorer: https://testnet.monadscan.com/address/${address}`);
    console.log("==================================================================");
    return;
  }

  for (const item of WALLETS) {
    let address: `0x${string}`;
    if (item.keyOrAddress.startsWith("0x") && item.keyOrAddress.length === 66) {
      address = privateKeyToAccount(item.keyOrAddress as `0x${string}`).address;
    } else {
      address = item.keyOrAddress as `0x${string}`;
    }

    try {
      const balance = await publicClient.getBalance({ address });
      console.log(`📋 ${item.name}`);
      console.log(`   Address:  ${address}`);
      console.log(`   Balance:  ${formatEther(balance)} MON`);
      console.log(`   Explorer: https://testnet.monadscan.com/address/${address}`);
      console.log("------------------------------------------------------------------");
    } catch (err: any) {
      console.log(`📋 ${item.name} (${address}): Error reading balance: ${err.message}`);
    }
  }

  console.log("💡 Tip: You can check any address anytime by running:");
  console.log("   bun scripts/check-balances.ts <0x_YOUR_ADDRESS>");
  console.log("==================================================================");
}

main().catch(console.error);

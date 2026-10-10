import { createPublicClient, createWalletClient, http, keccak256, toHex, stringToBytes, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ADDRESSES, MONAD_TESTNET_CHAIN_ID, MONAD_TESTNET_RPC_URL } from "../shared/src/constants";
import { hashCommitment } from "../shared/src/commitments";
import { EVENT_TYPE_INDEX } from "../shared/src/types";

const MONAD_TESTNET_CHAIN = {
  id: MONAD_TESTNET_CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET_RPC_URL] } },
};

const ATTEST_ABI = [
  {
    type: "function",
    name: "attest",
    inputs: [
      { name: "subjectPseudonym", type: "bytes32" },
      { name: "eventType", type: "uint8" },
      { name: "commitmentHash", type: "bytes32" },
      { name: "evidenceHash", type: "bytes32" },
    ],
    outputs: [{ name: "attestationId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "nextAttestationId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

async function main() {
  console.log("==================================================================");
  console.log("🚀 TRACING LIVE PAYOUT -> CHAIN -> ATTESTATION (Monad Testnet)");
  console.log("==================================================================");

  const privateKey = (process.env.NEW_PLATFORM_ATTESTER_PRIVATE_KEY ||
    process.env.ATTESTER_KEY ||
    process.env.PLATFORM_PRIVATE_KEY) as `0x${string}`;

  if (!privateKey) {
    throw new Error("Missing ATTESTER_KEY or PLATFORM_PRIVATE_KEY");
  }

  const account = privateKeyToAccount(privateKey);
  console.log(`Attester Address: ${account.address}`);

  const publicClient = createPublicClient({
    chain: MONAD_TESTNET_CHAIN,
    transport: http(MONAD_TESTNET_RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: MONAD_TESTNET_CHAIN,
    transport: http(MONAD_TESTNET_RPC_URL),
  });

  const nextIdBefore = await publicClient.readContract({
    address: ADDRESSES.attestationRegistry as `0x${string}`,
    abi: ATTEST_ABI,
    functionName: "nextAttestationId",
  });
  console.log(`Current Next Attestation ID: ${nextIdBefore}`);

  // Construct worker and payout details
  const subjectAddress = "0x944115Eb0Ad1A2c86b0FBDB4918930C220ffde28"; // Subject wallet
  const pseudonym = keccak256(
    toHex(stringToBytes(`${subjectAddress.toLowerCase()}:${account.address.toLowerCase()}`))
  );
  
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const amount = parseEther("0.025"); // 25,000 INR equivalent / demo amount
  const salt = keccak256(toHex(stringToBytes(`SALT_${Date.now()}_SWIFT_DELIVER`)));
  const onTime = true;
  const eventType = "GIG_PAYOUT";
  const eventTypeIndex = EVENT_TYPE_INDEX[eventType];

  const commitmentHash = hashCommitment({
    subjectPseudonym: pseudonym,
    eventType,
    amount,
    onTime,
    timestamp,
    salt,
  });

  const evidenceHash = keccak256(toHex(stringToBytes(`EVIDENCE_RECEIPT_SWIFT_DELIVER_${timestamp}`)));

  console.log("\n📦 Payload constructed:");
  console.log(`   Event Type: ${eventType} (${eventTypeIndex})`);
  console.log(`   Pseudonym: ${pseudonym}`);
  console.log(`   Commitment Hash: ${commitmentHash}`);
  console.log(`   Evidence Hash: ${evidenceHash}`);
  console.log(`   Timestamp: ${timestamp}`);

  console.log("\n📡 Broadcasting attest() to AttestationRegistry...");
  const txHash = await walletClient.writeContract({
    address: ADDRESSES.attestationRegistry as `0x${string}`,
    abi: ATTEST_ABI,
    functionName: "attest",
    args: [pseudonym, eventTypeIndex, commitmentHash, evidenceHash],
  });

  console.log(`✓ Broadcast successful! Tx Hash: ${txHash}`);
  console.log("⏳ Awaiting transaction receipt on Monad Testnet...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`🎉 Confirmed in block #${receipt.blockNumber}! Status: ${receipt.status}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`   MonadScan URL: https://testnet.monadscan.com/tx/${txHash}`);

  const nextIdAfter = await publicClient.readContract({
    address: ADDRESSES.attestationRegistry as `0x${string}`,
    abi: ATTEST_ABI,
    functionName: "nextAttestationId",
  });
  console.log(`   Assigned Attestation ID: ${nextIdAfter - 1n}`);
  console.log("==================================================================");
}

main().catch(console.error);

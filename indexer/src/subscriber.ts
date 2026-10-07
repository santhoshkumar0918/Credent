// Live event subscription: Monad testnet → Postgres graph (ticket I1).
// Polls eth_getLogs from the deploy cursor, decodes with the shared ABIs,
// persists the four graph tables. Read-only: never originates chain state.
//
// Reorg safety: only blocks CONFIRMATIONS deep are ingested; the cursor
// advances only after a batch persists. Pool demo events (underwriting /
// loans) are logged and skipped — loan tables arrive with a later slice.

import {
  createPublicClient,
  decodeEventLog,
  http,
  type Address,
  type Log,
  type PublicClient,
} from "viem";
import type { Pool } from "pg";
import {
  ADDRESSES,
  attesterRegistryAbi,
  attestationRegistryAbi,
  consentRegistryAbi,
  challengeModuleAbi,
} from "shared";
import {
  getCursor,
  insertAttestation,
  refreshAttester,
  refreshChallenge,
  revokeConsent,
  setCursor,
  updateAttestationStatus,
  upsertConsent,
} from "./db.js";

export const START_BLOCK = 68939906n; // Deploy block, chain 10143.
const CONFIRMATIONS = 10n; // ~4s at 400ms blocks; finality is ~800ms.
const RANGE = 100n; // Monad public RPC caps eth_getLogs at a 100-block range.
const POLL_MS = 2000;
const ERROR_BACKOFF_MS = 5000;

const EVENT_TYPES = ["RENT", "BNPL_INSTALLMENT", "GIG_PAYOUT", "P2P_LOAN_REPAYMENT", "UTILITY_BILL"];
const ATTESTATION_STATUSES = ["ACTIVE", "CHALLENGED", "SLASHED", "DISPUTED_BY_SUBJECT"];
const CHALLENGE_STATUSES = ["OPEN", "ATTESTER_WON", "CHALLENGER_WON"];

const CONTRACTS = [
  { address: ADDRESSES.attesterRegistry as Address, abi: attesterRegistryAbi },
  { address: ADDRESSES.attestationRegistry as Address, abi: attestationRegistryAbi },
  { address: ADDRESSES.consentRegistry as Address, abi: consentRegistryAbi },
  { address: ADDRESSES.challengeModule as Address, abi: challengeModuleAbi },
] as const;

export interface SubscriberConfig {
  rpcUrl: string;
  pool: Pool;
}

async function refreshAttesterRow(client: PublicClient, pool: Pool, address: Address): Promise<void> {
  const a = (await client.readContract({
    address: ADDRESSES.attesterRegistry as Address,
    abi: attesterRegistryAbi,
    functionName: "getAttester",
    args: [address],
  })) as unknown as {
    attesterType: number;
    bond: bigint;
    reputationScore: bigint;
    attestationCount: bigint;
    challengesLost: bigint;
    active: boolean;
  };
  await refreshAttester(pool, address, {
    attesterType: a.attesterType,
    bond: a.bond,
    reputationScore: a.reputationScore,
    attestationCount: a.attestationCount,
    challengesLost: a.challengesLost,
    active: a.active,
  });
}

async function refreshChallengeRow(client: PublicClient, pool: Pool, id: bigint): Promise<void> {
  // Public mapping getters return positional tuples.
  const c = (await client.readContract({
    address: ADDRESSES.challengeModule as Address,
    abi: challengeModuleAbi,
    functionName: "challenges",
    args: [id],
  })) as unknown as readonly [
    attestationId: bigint,
    challenger: Address,
    challengerBond: bigint,
    disclosureProofHash: string,
    defenseEvidenceHash: string,
    windowEnds: bigint,
    status: number,
    claimed: boolean,
  ];
  await refreshChallenge(pool, {
    id,
    attestationId: c[0],
    challenger: c[1],
    challengerBond: c[2],
    windowEnds: c[5],
    status: CHALLENGE_STATUSES[c[6]] ?? "OPEN",
  });
}

async function handleLog(client: PublicClient, pool: Pool, log: Log): Promise<void> {
  if (log.blockNumber == null || log.transactionHash == null) return; // pending log — skip
  const contract = CONTRACTS.find((c) => c.address.toLowerCase() === log.address.toLowerCase());
  if (!contract) return;
  let decoded: { eventName: string; args: Record<string, unknown> };
  try {
    decoded = decodeEventLog({
      abi: contract.abi,
      data: log.data,
      topics: log.topics,
    }) as { eventName: string; args: Record<string, unknown> };
  } catch {
    return; // Unknown event (e.g. wiring events) — ignore.
  }
  const args = decoded.args;
  switch (decoded.eventName) {
    case "AttesterRegistered":
    case "AttesterSlashed":
    case "AttesterReputationChanged":
    case "BondToppedUp":
      await refreshAttesterRow(client, pool, args["attester"] as Address);
      break;
    case "AttestationWritten":
      await insertAttestation(pool, {
        id: args["id"] as bigint,
        attester: args["attester"] as string,
        subjectPseudonym: args["subjectPseudonym"] as string,
        eventType: EVENT_TYPES[args["eventType"] as number] ?? "UNKNOWN",
        commitmentHash: args["commitmentHash"] as string,
        evidenceHash: args["evidenceHash"] as string,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
      });
      break;
    case "AttestationStatusChanged":
      await updateAttestationStatus(
        pool,
        args["id"] as bigint,
        ATTESTATION_STATUSES[args["newStatus"] as number] ?? "ACTIVE"
      );
      break;
    case "AccessGranted": {
      const tags = (args["scopeTags"] as string[] | undefined) ?? [];
      await upsertConsent(pool, {
        subjectPseudonym: args["subjectPseudonym"] as string,
        viewer: args["viewer"] as string,
        scopeTags: tags,
        expiry: new Date(Number(args["expiry"] as bigint) * 1000),
      });
      break;
    }
    case "AccessRevoked":
      await revokeConsent(pool, args["subjectPseudonym"] as string, args["viewer"] as string);
      break;
    case "ChallengeOpened":
      await refreshChallengeRow(client, pool, args["challengeId"] as bigint);
      break;
    case "ChallengeResolved":
      await refreshChallengeRow(client, pool, args["challengeId"] as bigint);
      break;
    default:
      break; // DefenseSubmitted, claims, wiring, pool events — out of scope for I1.
  }
}

/// @notice Sync once from cursor to the safe head. Returns blocks ingested.
export async function syncOnce(config: SubscriberConfig): Promise<bigint> {
  const client = createPublicClient({ transport: http(config.rpcUrl) });
  const head = await client.getBlockNumber();
  const safe = head - CONFIRMATIONS;
  let cursor = await getCursor(config.pool, START_BLOCK);
  let ingested = 0n;
  while (cursor <= safe) {
    const to = cursor + RANGE - 1n <= safe ? cursor + RANGE - 1n : safe;
    for (const contract of CONTRACTS) {
      const logs = await client.getLogs({
        address: contract.address,
        fromBlock: cursor,
        toBlock: to,
      });
      for (const log of logs) {
        await handleLog(client, config.pool, log);
      }
    }
    await setCursor(config.pool, to + 1n);
    ingested += to - cursor + 1n;
    cursor = to + 1n;
  }
  return ingested;
}

/// @notice Long-running poll loop. RPC failures back off and retry —
/// the cursor advances only after a batch persists, so nothing is lost.
export async function runSubscriber(config: SubscriberConfig, signal?: AbortSignal): Promise<void> {
  for (;;) {
    if (signal?.aborted) return;
    try {
      await syncOnce(config);
    } catch (err) {
      console.error("sync failed, backing off:", err instanceof Error ? err.message : err);
      await new Promise((resolve) => setTimeout(resolve, ERROR_BACKOFF_MS));
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

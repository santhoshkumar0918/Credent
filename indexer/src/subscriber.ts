// Slice 3 — event subscription plan (spec, not yet wired).
// Polls `eth_getLogs` from a pinned block (public RPC rate limits: 20–50 rps),
// reorg-aware: commitments served as settled only after N confirmations.

import type { PublicClient } from "viem";

export const SUBSCRIBED_EVENTS = [
  "AttesterRegistered",
  "AttesterSlashed",
  "AttesterReputationChanged",
  "AttestationWritten",
  "AttestationStatusChanged",
  "AccessGranted",
  "AccessRevoked",
  "ChallengeOpened",
  "ChallengeResolved",
] as const;

export type SubscribedEvent = (typeof SUBSCRIBED_EVENTS)[number];

export interface SubscriberConfig {
  client: PublicClient;
  fromBlock: bigint;
  confirmations: number;
}

// TODO(slice-3): startSubscriber(config) → materialize into Postgres per schema.sql.
export function subscriptionPlan(config: SubscriberConfig): {
  events: readonly SubscribedEvent[];
  fromBlock: bigint;
} {
  return { events: SUBSCRIBED_EVENTS, fromBlock: config.fromBlock };
}

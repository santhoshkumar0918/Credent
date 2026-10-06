---
name: attestation-indexing
description: JSON-RPC event subscription, Postgres materialized attestation graph, public summary stats, consent-token gating, IPFS evidence schema. Use when working on anything in indexer/.
---

## Indexer principle

Read-only mirror, never a source of truth. The service subscribes to
chain events and materializes them for fast querying — it never
originates state, and lenders can always recompute from the chain.

## Events → Postgres

Subscribe: `AttestationWritten`, `AttestationStatusChanged`,
`AccessGranted/Revoked`, `ChallengeOpened/Resolved`,
`AttesterRegistered/Slashed`, `AttesterReputationChanged`. Index by
`(subjectPseudonym, eventType, attester)` — the queryable
attestation graph. Reorg-aware: confirmations before serving a
commitment as settled.

## CreditAggregator API (PRD section 11)

```
GET  /subjects/:pseudonym/summary   (X-Consent-Token required)
  → { onTimeRate, attestationCount, attesterDiversity,
      tenureDays, disputeCount }
POST /consent/verify   { subjectPseudonym, viewer, scopeTag }
  → { authorized, expiry }
GET  /attesters/:address/reputation
  → { reputationScore, bond, attestationCount, challengesLost }
```

- Summary methodology is public and re-computable — document the
  formula next to the endpoint, never a black-box number.
- Every summary/disclosure checks `ConsentRegistry` live first:
  no valid non-expired scope-matching grant → 403 naming the missing
  scope. Redis caches consent-tokens/sessions only, never attestation
  data, and revalidates against the chain.
- `CHALLENGED` rows are excluded from new underwriting summaries;
  `SLASHED` rows remain visible as history with status intact.

## IPFS evidence (PRD sections 10–11)

```
{ type: "receipt | contract | screenshot",
  attesterNote, fileHash (sha256 of original), pinnedAt }
```

Pinned via the pinning service (Pinata / web3.storage for hackathon
reliability); only the content hash is committed on-chain. Treat the
blob as the attester's defense exhibit in challenges.

## What to skip

No custom score/rank ("Vouchain Score"), no cross-pseudonym joining,
no persisted plaintext amounts. If asked, flag against PRD section 11
first.

---
name: solidity-commitment-attestation
description: Commitment-hash construction/verification, subject-pseudonym discipline, no-plaintext storage, bond/slash accounting, attester lifecycle. Use when writing or reviewing anything in contracts/src/AttesterRegistry.sol, AttestationRegistry.sol, or ConsentRegistry.sol.
---

## Commitment principle

The chain proves a record existed and who signed it — never the
contents. `AttestationRegistry` stores `subjectPseudonym`,
`commitmentHash`, `evidenceHash` only (PRD sections 9–10). Any new
storage field holding a raw value is an AGENTS.md rule-1 violation,
not a shortcut.

## Commitment construction

```
commitmentHash = keccak256(abi.encode(
  subjectPseudonym, eventType, amount, onTime, timestamp, salt))
```

- Field order and encoding are canonical and shared: the exact same
  order lives in ONE `shared/` helper for the client and in the
  contract — never reimplemented ad hoc per screen or per test.
- `salt` is 256-bit fresh randomness per attestation, generated
  client-side at log-a-payment time; it is delivered only inside the
  scoped disclosure, never on-chain, never in logs.
- `eventType` is the enum (`RENT`, `BNPL_INSTALLMENT`, `GIG_PAYOUT`,
  `P2P_LOAN_REPAYMENT`, `UTILITY_BILL`) — nothing else until a design
  note against the PRD adds one.

## Pseudonym discipline

- `subjectPseudonym` is a per-relationship identifier derived from the
  subject's key — NOT the raw wallet address. The registry must never
  be a public ledger of "who paid what, when."
- Never join pseudonym → wallet on-chain or in the indexer. The
  mapping lives only in the subject's own signed disclosures.

## Bond / reputation / slash accounting

- `register()` requires `msg.value >= MIN_BOND`, reverts if already
  registered; bond below `MIN_BOND` after `slash` deactivates the
  attester (`active = false`), and `attest()` checks active status.
- `slash` and `adjustReputation` are `onlyChallengeModule` — no
  owner path, no attester self-adjustment.
- Reputation starts at 0 (neutral); it moves only on challenge
  outcomes, never on attestation volume (volume is gameable,
  survival is not).

## What to skip

No plaintext convenience fields ("just for the demo UI"), no
unbonded attester tiers, no sixth event type without a PRD design
note. If asked, flag against `../prd/Credent-prd.md` section 9 first.

---
name: vouchain-dev
description: Whole-project map for Vouchain — PRD sections to code locations, event types, trust spine, demo script, build/test/deploy commands. Load at the start of any builder session.
---

## What this project is

Vouchain (Credent) — permissionless on-chain credit-attestation layer
on Monad. Verifiers attest to real payment behavior as signed
commitments; users grant scoped disclosures; lenders underwrite on
re-verified evidence. Evidence layer, not a score, not a lender, not
KYC. Source of truth: `../prd/Credent-prd.md` (read-only).

## PRD → code map

| PRD | Code |
|---|---|
| §9 `AttesterRegistry` | `contracts/src/AttesterRegistry.sol` → `attestation-contracts-agent` |
| §9 `AttestationRegistry` | `contracts/src/AttestationRegistry.sol` → `attestation-contracts-agent` |
| §9 `ConsentRegistry` | `contracts/src/ConsentRegistry.sol` → `attestation-contracts-agent` |
| §9 `ChallengeModule` | `contracts/src/ChallengeModule.sol` → `challenge-lending-agent` |
| §9 `MockLendingPool` (demo) | `contracts/src/MockLendingPool.sol` → `challenge-lending-agent` |
| §10 schemas | `shared/` types + canonical hash helper |
| §11 indexer + API | `indexer/` → `indexer-aggregator-agent` |
| §14 six screens | `frontend/` → `frontend-agent` |
| §15 demo script (<3 min) | `qa-e2e-agent` rehearsal |
| §17 MVP scope | the build order: registries → challenge+pool → indexer → frontend → demo |
| §20 open risks | never claim solved — see `attestation-trust-review` |

## Trust spine (memorize)

Attester signs → commitment (not plaintext) → registry → consented
co-signed disclosure → lender re-verifies hash → challenge window →
slash on loss. Subject's say-so decides nothing.

## Event types (closed set)

`RENT`, `BNPL_INSTALLMENT`, `GIG_PAYOUT`, `P2P_LOAN_REPAYMENT`,
`UTILITY_BILL`. Consent scopes are `keccak256(eventType)`.

## Commands

```bash
cd contracts && forge build          # contracts compile, warning-free
cd contracts && forge test           # contract tests, green
cd contracts && forge script script/Deploy.s.sol --rpc-url $MONAD_RPC_URL --broadcast
cd indexer && bun test               # indexer/API tests (once built)
cd frontend && bun run build         # frontend build, clean
```

## Session start checklist

1. Read `AGENTS.md` routing + `ANCHOR.md` state (mandatory).
2. Load this skill for the map; load your agent's skills from the
   AGENTS.md §4 table.
3. Confirm which slice ANCHOR.md says is next — don't start a
   different one without flagging.

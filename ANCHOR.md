# ANCHOR — Current Project State (Vouchain / Credent)

> This file is context, not instructions. Rules and routing live in
> AGENTS.md. It answers "where are we right now" and is updated at the
> end of every work session so a fresh agent can resume from it alone.

**Last updated:** 2026-10-06 — workflow scaffolding landed: AGENTS.md
routing + 8 subagents + 11 skills under `.opencode/`. No product code
exists yet; contracts/, indexer/, frontend/, shared/ are all unbuilt.

## Latest pushed changes — read this when you pull

Nothing is pushed yet (AGENTS.md §10: do not push until asked).

## What is true now (verified)

- Product source of truth: `../prd/Credent-prd.md` (v3, read-only).
  Build specs live in PRD §§9–16; MVP scope in §17; demo script in §15.
- Workflow layer (this change, uncommitted):
  - `AGENTS.md` — routing, 11 non-negotiable rules, 8-agent roster,
    11-skill roster, coding standards, done/escalation/git rules.
  - `.opencode/agents/` — 5 builders
    (`attestation-contracts-agent`, `challenge-lending-agent`,
    `indexer-aggregator-agent`, `frontend-agent`, `qa-e2e-agent`) + 3
    support (`research-agent`, `code-review-agent`, `git-commit-agent`).
  - `.opencode/skills/` — 6 Vouchain domain skills
    (`solidity-commitment-attestation`, `consent-disclosure-eip712`,
    `challenge-slashing`, `attestation-indexing`,
    `attestation-trust-review`, `vouchain-dev`) + 5 shared
    (`research-lookup-protocol`, `code-review-checklist`,
    `git-commit-conventions`, `ui-ux-pro-max`, `to-tickets`).
- Target chain: Monad testnet. Target contracts toolchain: Foundry +
  Solidity + OpenZeppelin (`AccessControl`, `ReentrancyGuard`).
- Nothing else is verified — no contracts written, nothing deployed,
  no tests exist.

## Current phase

Phase 0 — scaffolding. Next is the first vertical slice: the
commitment-based attestation core on-chain
(`AttesterRegistry` + `AttestationRegistry` + deploy + forge tests on
Monad testnet), per PRD §9 and AGENTS.md §4.

## In progress right now

None — scaffolding is written but not yet reviewed or committed.

## Blocked / waiting on

- Santhosh to confirm: (1) Monad testnet RPC + faucet access for the
  deployer wallet; (2) whether `contracts/` should start as Foundry-only
  or with an existing template; (3) go-ahead to run `code-review-agent`
  → `git-commit-agent` on this scaffolding as the first commit.

## Next task

1. Review this scaffolding (`code-review-agent`), commit it
   (`git-commit-agent`), update this file with the commit hash.
2. Then start the contracts slice: `attestation-contracts-agent` builds
   `AttesterRegistry.sol` + `AttestationRegistry.sol` (+ `ConsentRegistry.sol`)
   per PRD §9, `forge test` green, deployed + verified on Monad testnet,
   addresses recorded here.
3. Only after (2): `challenge-lending-agent` (`ChallengeModule` +
   `MockLendingPool`), then `indexer-aggregator-agent`, then
   `frontend-agent`, with `qa-e2e-agent` rehearsing the PRD §15 demo
   (happy path + live-slash climax) last.

Stack/completion notes for whoever resumes:
- PRD is at `../prd/Credent-prd.md` — read-only, never edited by agents.
- Load skill `vouchain-dev` at session start for the project map.
- `to-tickets` runs only when the user says "tickets" / `/to-tickets`.
- Load `ui-ux-pro-max` for every frontend slice.
- Do not push until explicitly asked (AGENTS.md §10).

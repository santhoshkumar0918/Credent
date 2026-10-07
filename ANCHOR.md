# ANCHOR — Current Project State (Vouchain / Credent)

> This file is context, not instructions. Rules and routing live in
> AGENTS.md. It answers "where are we right now" and is updated at the
> end of every work session so a fresh agent — or a teammate pulling
> cold — resumes from this file alone, without re-deriving anything.

**Last updated:** 2026-10-07 — contract track 5/5 COMPLETE and pushed
(live on Monad testnet, slash proven on-chain). Indexer track raised
(I1–I3); I1 in progress. Test suite: 52 forge tests green.
Deployer key retired; 3 demo wallets funded, keys in gitignored
`contracts/.env.demo` (deleted after ticket 05 — see history).

## Start here (fresh agent or teammate pull)

Read in this order: (1) this file, (2) `AGENTS.md` (rules + which
subagent owns what), (3) `README.md` (product + diagrams), (4) skill
`vouchain-dev` (project map), (5) `../prd/Credent-prd.md` (source of
truth, read-only). Then check `git log --oneline` against "Latest
pushed changes" below — if they match, you are current.

## Where things live (file guide — what was built, and in which commit)

- `contracts/src/` — 5 Solidity contracts (Foundry, solc 0.8.28).
  `AttesterRegistry` + `AttestationRegistry` + `ConsentRegistry`
  (`88f4909`), `ChallengeModule` (`7482912`), `MockLendingPool`
  (`d2ede33`). Deps as git submodules: `lib/forge-std v1.17.0`,
  `lib/openzeppelin-contracts v5.7.0` (pinned tag). Tests in
  `contracts/test/` — 52 green (`ee5be89`, `09ac15b`, `d269a64`).
  Deploy + prove scripts in `contracts/script/`
  (`Deploy.s.sol`, `ProveSlash.s.sol`).
- `contracts/foundry.toml` — solc/cancun, `monad_testnet` (chain 10143)
  + `anvil` RPC endpoints. Broadcast artifacts under
  `contracts/broadcast/` (gitignored).
- `shared/src/` — canonical TS package: `types.ts` (EventType + index
  order matching the `.sol` enum), `commitments.ts` (THE hasher —
  `encodeAbiParameters`, never `encodePacked`), `eip712.ts` (grant /
  disclosure types + `scopeTag()`), `constants.ts` (chain 10143 + live
  deployed addresses), `abis.ts` + `abis/*.ts` (regenerated via
  `bun run abis`, ticket 04).
- `frontend/` — Next 16.3.8 + React 19 + Tailwind v4 (official
  `create-next-app`), wagmi v3 + viem 2 + react-query 5.
  `lib/wagmi.ts` (Monad testnet chain), `lib/contracts.ts` (live
  addresses + ABIs, single import point), home + 6 placeholder routes.
  `bun run build` green.
- `indexer/` — Node/TS service (skeleton `34bf536`, now being built):
  `subscriber.ts`, `db.ts`, `api.ts`, `consent.ts`, `ipfs.ts`,
  `schema.sql` (attesters/attestations/consents/challenges/cursor).
- `.opencode/agents/` — 8 subagents (5 builders + 3 support).
  `.opencode/skills/` — 11 skills (6 Vouchain domain + 5 shared).
- `docs/<track>/issues/` — working ticket files (GITIGNORED, never
  pushed). Ticket *summaries* live in this file (below) — that is the
  committed record.
- `contracts/.env.demo` — demo-wallet keys, chmod 600, GITIGNORED.
  Deleted after use. Real `.env` never exists in git (rule 6).

## Latest pushed changes — read this when you pull

Everything below is on `origin/main`. Commit messages are
`<scope>: <what>` (scope = subagent minus `-agent`, or `workflow:`/`docs:`).

- `a6349c5` → `c9aa92a` — workflow scaffolding: root `.gitignore`,
  `AGENTS.md` + `ANCHOR.md`, 8 subagents, 6 domain skills, shared
  skills incl. canonical `ui-ux-pro-max` (via `npx skills add`).
- `215e829` — `README.md` (architecture + 5 mermaid diagrams + codebase
  blueprint). `6cc102f`, `c851338` — ANCHOR checkpoints.
- `ba5f290` — boilerplate monorepo: `forge init contracts`,
  root Bun workspaces, `shared/` (types/hasher/eip712/constants),
  Next.js frontend skeleton. Toolchain installed here: Foundry v1.8.5,
  Bun v1.3.14, OZ v5.7.0.
- `34bf536` — indexer skeleton + workspace wiring + graph schema.
- `88f4909` / `ee5be89` — slice 1: 3 registries + 31 tests. Includes
  the pseudonym-binding mechanism fix (grants/disputes prove
  `keccak256(subject, attester)` on-chain; PRD §9 divergences documented
  in code, not silent).
- `7482912` / `09ac15b` — ticket 01: ChallengeModule + 10 tests (41 total).
- `d2ede33` / `d269a64` — ticket 02: MockLendingPool + 11 tests (52 total).
- `419ae4e` — TESTNET-SCALED bonds (MIN_BOND 5 / CHALLENGER_BOND 0.5 MON,
  10:1 ratio kept; production PRD §9: 50 / 5); tests read constants.
- `4840924` — ticket 03: testnet deploy record (addresses below).
- `02b113b` — ticket 04: ABI export pipeline + frontend wiring.
- `34c1a3d` — ticket 05: ProveSlash script.
- `addea2f` — ticket 05 executed: SLASH PROVEN on testnet.
- `99bf5af` — demo wallets + ANCHOR checkpoint (pushed).

## What is true now (verified)

- Toolchain: Foundry v1.8.5, Bun v1.3.14, Next 16.3.8 / React 19 /
  Tailwind v4, wagmi 3 + viem 2.57.3 + react-query 5.104, OZ v5.7.0,
  forge-std v1.17.0. `forge build` warning-free, 52/52 `forge test`
  green, `shared` + `indexer` `tsc` clean, `next build` green.
- Testnet deployment (2026-10-07, chain 10143, deploy block 68939906,
  Sourcify `perfect` ×5). Explorer: `testnet.monadscan.com/address/<addr>`.

| Contract | Address |
|---|---|
| AttesterRegistry | `0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d` |
| AttestationRegistry | `0x7fceaa85c5f74d54554bffd46a41653fd03da962` |
| ConsentRegistry | `0x6f47a618213d44afdaeb605e3262e2f874471b74` |
| ChallengeModule | `0xd7ca8042c236b9c29cbac8c192100825f5969a0d` |
| MockLendingPool | `0xf2e79aa5f3344992fca9f4ff5a4736716114e0d7` |

- Pool funded (7 MON in, 5 bonded, ~2 loan capital, active attester).
  Deployer `0x9f60…C22900` holds ~1.6 MON; key retired.
- Ticket 05 proven on-chain: attestation 0 SLASHED, attester bond
  4.5 MON, reputation −10 (tx hashes in
  `docs/contract-track/issues/05-live-slash-proof.md`, gitignored).
- Demo wallets (keys ONLY in gitignored `contracts/.env.demo`):
  attester `0xDCBd…b2Ed2D` (10 MON), subject `0x9441…de28` (5 MON),
  challenger `0xC3e9…847f6` (10 MON).
- Product source of truth: `../prd/Credent-prd.md` (v3, read-only).

## Tracks and tickets (summaries — working files under `docs/`, gitignored)

Contract track — COMPLETE (01 challenge, 02 pool, 03 deploy, 04 ABIs,
05 live slash; hashes in "Latest pushed" above).

Indexer track — frontier is **I1** (in progress, this session):

- [ ] `I1-live-subscription` — poll the 5 live contracts from block
  68939906 into Postgres, reorg-aware (10 confirmations); proof = local
  tables already contain attestation 0 + challenge 1
- [ ] `I2-credit-api` ← I1 — 3 PRD §11 routes with LIVE on-chain consent
  checks (Redis caches tokens only); grant → data, no grant → 403
- [ ] `I3-evidence-pinning` — parallel, no blockers — Pinata adapter
  behind `EvidenceBlob`; builds keyless, runs on `PINATA_JWT`

## In progress right now

I1 (indexer-aggregator-agent): real `subscriber.ts` + `db.ts` against
local Postgres (`docker compose up`), then prove ingestion of the live
chain history.

## Blocked / waiting on

- Nothing code-blocking. Next external need: `PINATA_JWT` for I3
  runtime (build needs no key) and Santhosh's browser-testing account
  for the frontend slice.

## Next task

1. Finish I1 (prove rows), commit, then I2 (API), I3 parallel.
2. Then: frontend track tickets (slice 4 — 6 screens on live contracts),
   then qa-e2e rehearsal of the PRD §15 demo.

Standing notes for whoever resumes:
- PRD is at `../prd/Credent-prd.md` — read-only, never edited by agents.
- Load skill `vouchain-dev` at session start for the project map.
- `to-tickets` runs only when the user says "tickets" / `/to-tickets`.
- Load `ui-ux-pro-max` for every frontend slice.
- Do not push until explicitly asked (AGENTS.md §10).
- Testnet keys: env vars or gitignored files only — never chat logs
  beyond first receipt, never committed. Retire after use.

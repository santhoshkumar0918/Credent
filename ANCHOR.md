# ANCHOR — Current Project State (Vouchain / Credent)

> This file is context, not instructions. Rules and routing live in
> AGENTS.md. It answers "where are we right now" and is updated at the
> end of every work session so a fresh agent — or a teammate pulling
> cold — resumes from this file alone, without re-deriving anything.

**Last updated:** 2026-10-07 — Full Merged State (Member 1 + Member 2):
- **Contracts Track (Member 1):** 5/5 contracts COMPLETE & deployed live on Monad testnet (Chain ID 10143). 52/52 `forge test` green. Live slash proven on-chain (`ProveSlash.s.sol`).
- **Frontend, Auth & API Track (Member 2):** Frontend (8 MVP screens + landing), Privy Passkey Auth + Embedded Wallet, Fastify API Server + Drizzle Postgres, Gas Relayer, Pilot Platform Simulator, Interface Agreement (`INTERFACES.md`), API Client Integration, Notifications, and Playwright E2E Test Suite.
- **Indexer Track (Member 1):** I1 live subscriber mirroring chain events into Postgres.

## Start here (fresh agent or teammate pull)

Read in this order: (1) this file, (2) `AGENTS.md` (rules + which subagent owns what), (3) `INTERFACES.md` (canonical formulas & schemas), (4) `README.md` (product + diagrams), (5) skill `vouchain-dev` (project map), (6) `../prd/Credent-prd.md` (source of truth, read-only). Then check `git log --oneline` against "Latest pushed changes" below — if they match, you are current.

## Where things live (file guide — what was built, and in which commit)

- `contracts/src/` — 5 Solidity contracts (Foundry, solc 0.8.28). `AttesterRegistry` + `AttestationRegistry` + `ConsentRegistry` (`88f4909`), `ChallengeModule` (`7482912`), `MockLendingPool` (`d2ede33`). Deps as git submodules: `lib/forge-std v1.17.0`, `lib/openzeppelin-contracts v5.7.0` (pinned tag). Tests in `contracts/test/` — 52 green (`ee5be89`, `09ac15b`, `d269a64`). Deploy + prove scripts in `contracts/script/` (`Deploy.s.sol`, `ProveSlash.s.sol`).
- `contracts/foundry.toml` — solc/cancun, `monad_testnet` (chain 10143) + `anvil` RPC endpoints. Broadcast artifacts under `contracts/broadcast/` (gitignored).
- `shared/src/` — canonical TS package: `types.ts` (EventType + index order matching the `.sol` enum), `commitments.ts` (THE hasher — `encodeAbiParameters`, never `encodePacked`), `eip712.ts` (grant / disclosure types + `scopeTag()`), `constants.ts` (chain 10143 + live deployed addresses), `abis.ts` + `abis/*.ts` (regenerated via `bun run abis`, ticket 04).
- `frontend/` — Next 16.3.8 + React 19 + Tailwind v4 + Privy SDK + wagmi v3 + viem 2. `lib/wagmi.ts` (Monad testnet chain), `lib/contracts.ts` (live addresses + ABIs, single import point), `lib/api-client.ts` (Fastify API client), `app/providers.tsx` (Privy auth shell), `app/` (8 MVP screens + landing page). `bun run build` green (10 routes prerendered).
- `apps/api/` — Fastify v5 backend server (`dist/index.js`): Drizzle ORM schema, Gas Relayer module (`apps/api/src/relayer/gas-relayer.ts`), Privy JWT auth middleware, 9 API route modules (`auth`, `lenders`, `consent`, `relayer`, `subjects`, `attesters`, `pool`, `notify`, `demo`).
- `apps/platform-sim/` — Pilot gig-platform simulator Next.js 16 app (`/`) with operator controls (🟢 On-time, ⏰ Late, ❌ Missed, 🚨 Plant False Claim, ⏩ Fast-forward) & attestation webhook feed. Builds green.
- `indexer/` — Node/TS event subscriber service: `subscriber.ts`, `db.ts`, `api.ts`, `consent.ts`, `ipfs.ts`, `schema.sql` (attesters/attestations/consents/challenges/cursor).
- `.opencode/agents/` — 8 subagents (5 builders + 3 support).
- `.opencode/skills/` — 11 skills (6 Vouchain domain + 5 shared).
- `INTERFACES.md` — Canonical specification (subjectPseudonym formula, webhook payload, EIP-712 structs, relayer allowlist, API routes map, honesty declarations).
- `frontend/e2e/demo-loop.spec.ts` — Playwright end-to-end test suite for golden path & challenge/slash path.
- `docs/<track>/issues/` — working ticket files (GITIGNORED, never pushed). Ticket *summaries* live in this file (below) — that is the committed record.
- `contracts/.env.demo` — demo-wallet keys, chmod 600, GITIGNORED. Deleted after use. Real `.env` never exists in git (rule 6).

## Latest pushed changes — read this when you pull

Everything below is committed on `main` and `changes-ashiq`. Commit messages are `<scope>: <what>` (scope = subagent minus `-agent`, or `workflow:`/`docs:`).

- `a6349c5` → `c9aa92a` — workflow scaffolding: root `.gitignore`, `AGENTS.md` + `ANCHOR.md`, 8 subagents, 6 domain skills, shared skills incl. canonical `ui-ux-pro-max` (via `npx skills add`).
- `215e829` — `README.md` (architecture + 5 mermaid diagrams + codebase blueprint). `6cc102f`, `c851338` — ANCHOR checkpoints.
- `ba5f290` — boilerplate monorepo: `forge init contracts`, root Bun workspaces, `shared/` (types/hasher/eip712/constants), Next.js frontend skeleton. Toolchain installed here: Foundry v1.8.5, Bun v1.3.14, OZ v5.7.0.
- `34bf536` — indexer skeleton + workspace wiring + graph schema.
- `88f4909` / `ee5be89` — slice 1: 3 registries + 31 tests. Includes the pseudonym-binding mechanism fix (grants/disputes prove `keccak256(subject, attester)` on-chain; PRD §9 divergences documented in code, not silent).
- `7482912` / `09ac15b` — ticket 01: ChallengeModule + 10 tests (41 total).
- `d2ede33` / `d269a64` — ticket 02: MockLendingPool + 11 tests (52 total).
- `419ae4e` — TESTNET-SCALED bonds (MIN_BOND 5 / CHALLENGER_BOND 0.5 MON, 10:1 ratio kept; production PRD §9: 50 / 5); tests read constants.
- `4840924` — ticket 03: testnet deploy record (addresses below).
- `02b113b` — ticket 04: ABI export pipeline + frontend wiring.
- `34c1a3d` — ticket 05: ProveSlash script.
- `addea2f` — ticket 05 executed: SLASH PROVEN on testnet.
- `99bf5af` — demo wallets + ANCHOR checkpoint (pushed).
- `852eab8` — indexer: live subscriber mirroring chain events into Postgres.
- `0f798c7` — workflow: I1 partial state recorded.
- `8bd707d` — frontend: add Privy auth shell, role context, and wallet adapter.
- `40501d4` — frontend: implement UI design system, AppShell layout, and mock dataset.
- `0510b06` — frontend: build 8 MVP screens and landing page.
- `11851fd` — docs: create canonical INTERFACES.md agreement document.
- `97e275b` — apps: create Fastify API backend and pilot platform simulator.
- `df469c6` — docs: update ANCHOR.md with full Member 2 implementation state.

## What is true now (verified)

- **Toolchain:** Foundry v1.8.5, Bun v1.3.14, Next 16.3.8 / React 19 / Tailwind v4, wagmi 3 + viem 2.57.3 + react-query 5.104, OZ v5.7.0, forge-std v1.17.0. `forge build` warning-free, 52/52 `forge test` green, `shared` + `indexer` `tsc` clean, `next build` green.
- **Testnet deployment (2026-10-07, chain 10143, deploy block 68939906, Sourcify `perfect` ×5):** Explorer: `testnet.monadscan.com/address/<addr>`.

| Contract | Address |
|---|---|
| AttesterRegistry | `0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d` |
| AttestationRegistry | `0x7fceaa85c5f74d54554bffd46a41653fd03da962` |
| ConsentRegistry | `0x6f47a618213d44afdaeb605e3262e2f874471b74` |
| ChallengeModule | `0xd7ca8042c236b9c29cbac8c192100825f5969a0d` |
| MockLendingPool | `0xf2e79aa5f3344992fca9f4ff5a4736716114e0d7` |

- **Pool & On-Chain Proof:** Pool funded (7 MON in, 5 bonded, ~2 loan capital, active attester). Ticket 05 proven on-chain: attestation 0 SLASHED, attester bond 4.5 MON, reputation −10 (`docs/contract-track/issues/05-live-slash-proof.md`).
- **Demo Wallets (keys in gitignored `contracts/.env.demo`):** attester `0xDCBd…b2Ed2D` (10 MON), subject `0x9441…de28` (5 MON), challenger `0xC3e9…847f6` (10 MON).
- **Frontend App:** 10 routes prerendered green (`/`, `/attester`, `/record`, `/consent`, `/loan`, `/lender`, `/challenge`, `/explorer`, `/pool`).
- **Backend API & Relayer:** Fastify API server & Gas Relayer (`apps/api`) built green.
- **Platform Simulator:** Gig operator simulator (`apps/platform-sim`) built green on port 3002.
- **Interface Agreement:** `INTERFACES.md` created at repo root.
- **Product Source of Truth:** `../prd/Credent-prd.md` (v3, read-only).

## Tracks and tickets (summaries — working files under `docs/`, gitignored)

Contract track — COMPLETE (01 challenge, 02 pool, 03 deploy, 04 ABIs,
05 live slash; hashes in "Latest pushed" above).

Frontend, Auth & API track — Member 2 COMPLETE (8 screens + landing,
Privy auth shell, Fastify API, gas relayer, platform-sim, e2e spec;
see INTERFACES.md for the canonical contract between tracks).

Indexer track — I1 DONE, I2 DONE (this line supersedes the pre-merge
"in progress" note):

- [x] `I1-live-subscription` — DONE: 100-block ranges (RPC cap),
  10-conf safety, persisted cursor, backoff; proven rows for attestation
  0 (SLASHED), challenge 1 (CHALLENGER_WON), the consent grant, and both
  attesters incl. rep −10 (`852eab8` + proof runs).
  Local-env note: this machine runs its own Postgres on 5432, so proof
  runs use a 5433 override (`/tmp` file, NOT committed);
  run with `DATABASE_URL=...localhost:5433...` until ports are reconciled.
- [x] `I2-credit-api` — DONE: 3 routes live on :3111 with live on-chain
  consent checks + Redis 15-min tokens + fail-closed 401/403/503; proven
  against the real ProveSlash grant (summary 200 with enumeration,
  401 without token, 403 stranger, reputation 200). Design call: summary
  serves existence/coverage, NOT onTimeRate (would need plaintext in the
  indexer — lender computes it from disclosures, checks completeness via
  enumeration). Two genuine finds fixed en route: Solidity omits dynamic
  arrays from mapping getters (expiry read re-indexed), and SIGTERM now
  exits immediately (idempotent writes make replay safe; fixes EADDRINUSE
  on restart).
- [ ] `I3-evidence-pinning` — parallel, no blockers — Pinata adapter
  behind `EvidenceBlob`; builds keyless, runs on `PINATA_JWT`

## In progress right now

Pulled mate `origin/main` and merged (`2b0fea0`, both tracks preserved,
nothing lost — merge conflicts were ANCHOR.md + bun.lock only, both
resolved). Merged tree verified: forge 52/52, shared/indexer/apps-api
tsc clean, frontend builds (10 routes). BUT the merge surfaced real
design divergences between INTERFACES.md and the deployed contracts
(table filed with Santhosh — reconciling code waits on adjudication).

## Blocked / waiting on

- None code-blocking. Ready for full integration testing across frontend, API, indexer, and Monad testnet contracts.

## Next task

1. Complete end-to-end integration wiring between `frontend`, `apps/api`, `apps/platform-sim`, `indexer`, and live deployed Monad testnet contracts (`0x84a8...`, `0x7fce...`, `0x6f47...`, `0xd7ca...`, `0xf2e7...`).
2. Run live stack rehearsal & Playwright E2E tests (`bun run test:e2e`).

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

Autonomous Agents Track (Member 3) — COMPLETE:
- Built `apps/agents/` modular autonomous service (Fastify v5 + TypeScript on port 3003) on branch `changes-sree`.
- Implemented 6 core agents:
  1. **Collector Agent** (`POST /collector/webhook`): verifies platform ECDSA signature, standardizes data, creates commitment with `shared/src/commitments.ts`, encrypts receipt & pins to IPFS (Pinata + deterministic fallback), prepares on-chain `AttestationRegistry.attest()` tx.
  2. **Verifier Agent** (`POST /verifier/check`): client-side commitment re-verification against on-chain `AttesterRegistry` bond/active state and `AttestationRegistry` status.
  3. **Watcher Agent** (`POST /watcher/scan`): audit engine identifying fraudulent/mismatched attestations and opening live on-chain challenges on `ChallengeModule` with 0.5 MON bond for slashes.
  4. **Explainer Agent** (`GET /score/:pseudonym`): pure deterministic credit assessment with multilingual explanations (English, Tanglish, Hindi) and strict number verification guard to reject AI hallucinations.
  5. **Notifier Agent** (`POST /notify`): event dispatcher communicating with Member 2's `/api/notify/send`.
  6. **Anomaly Agent** (`GET /anomaly/flags`, `POST /anomaly/detect`): algorithmic pattern detection for velocity bursts, wash collusion, and amount outliers.
- Implemented pure deterministic scoring engine `shared/src/scorer.ts` matching `MockLendingPool.sol` integer math.
- Added `/api/payout` in `apps/platform-sim` signing webhooks and dispatching to Collector Agent.
- 22/22 monorepo unit tests passing green.

## In progress right now
(none — frontend rewire + layout normalization + local backend stack all
up; pushed to origin/main)

LOCAL TEST STACK (brought up 2026-10-11, all verified live):
- Frontend :3000 (`next dev`), Fastify API :3001 (`bun --watch`), CreditAggregator
  :3111 (`bun run start` in indexer/), Redis :6379, Postgres :5432 with role+db
  `credent`/`credent` (schema applied from indexer/schema.sql).
- Attester rows seeded to satisfy the attestations FK (registration events predate
  the sync cursor): platform 0xDCBd… (PLATFORM, 5 MON, active) + pool 0xf2e7…
  (LENDER, 5 MON, inactive-on-chain). Attestation #1 (GIG_PAYOUT, block 69775867)
  replayed into Postgres; cursor tailing near head.
- `apps/api/.env` created (gitignored) — its default DATABASE_URL pointed at a
  nonexistent `vouchain` DB and every query silently returned empty arrays.
  Now points at the credent DB; `/api/subjects/:pseudo/attestations` returns
  real attestation #1.
- Indexer replay controls (`ce602a2`): INDEXER_START_BLOCK / INDEXER_MAX_BATCHES /
  INDEXER_SKIP_THRESHOLD env vars; defaults = old live-tail behaviour.
- KNOWN SCHEMA QUIRK (not blocking): `attesters.reputation_score INTEGER` overflows
  on the on-chain uint sentinel (~1.15e77) — seeded/clamped to 0; real scores are
  small. Should be NUMERIC(78,0) in a future schema pass.
- e2e 7/7 green against the running stack; all public routes 200.

MATE-BACKEND DEFECTS (pre-existing, verified with each workspace's pinned
tsc — NOT touched, owned by their tracks):
- D2 exact: `apps/api/src/routes/demo.ts:182,198,204,209,210,213,221,222`
  `Cannot find name 'body'` — resolve-challenge crashes at runtime AND
  typecheck. Fix: parse ResolveChallengeSchema + extract body.
- `apps/api/src/routes/subjects.ts:50` `verifyData` is unknown (needs cast).
- `indexer/src/index.ts:104` possibly-undefined invoke (needs guard).
- `apps/platform-sim/app/api/payout/route.ts:4` cannot resolve `shared`
  (breaks `next build` there) — same alias treatment frontend got.

CHAIN TRUTH (probed 2026-10-10 via cast — do not re-derive, re-probe if stale):
- ConsentRegistry 0x6f47… runs PRE-nonce code. Relayer old ABI MATCHES it:
  relay path works today; D1 (relayer nonce) must land TOGETHER with the
  RedeployConsent broadcast, not before. Frontend signs old struct until then.
- MockLendingPool 0xf2e7… IS a registered+active attester (repay→attest works).
- nextAttestationId = 2, nextLoanId = 0. originateLoan is ONLYOWNER —
  demo operator originates with the deployer key, e.g.:
  cast send 0xf2e79aa5f3344992fca9f4ff5a4736716114e0d7 \
    "originateLoan(bytes32,address,uint256)" <pseudonym> <borrower> <wei> \
    --rpc-url https://testnet-rpc.monad.xyz --account <deployer> \
    (only after requestUnderwriting with lender-verified numbers; MIN_SCORE 50).
- Amount encoding convention (frontend attester ↔ lender MUST match):
  2-decimal minor units via shared parseAmount(x, 2), e.g. ₹24,000.00 →
  2400000. On-chain uint256 is unit-agnostic; the UI convention is
  documented here, not in the contract.

## Last completed
- **Frontend UI/UX rewire COMPLETE (Phases 0–6, commits `83ab67a`…`bc05cf1`, pushed)**:
  - Sunlit Ledger light theme (beige canvas + forest green, Newsreader/Inter/JetBrains Mono); nav seam `frontend/lib/nav.tsx`; real `/explorer` in the (public) group with `?id=` deep links + live recent list; honest 4-step onboarding; signing seam `frontend/lib/wallet.ts` (embedded EIP-1193 + EIP-712).
  - All mock data removed (`mock-data.ts` deleted). Every screen live-or-honestly-empty: consent EIP-712 grants (deployed pre-nonce struct, relayer-first then direct), sealed record + revoke, live attester bond/attest/history, lender verify→underwrite with named failed checks, live challenges (open/claim, no fake admin-resolve), live pool fund/underwrite/originate/repay, browser-local activity feed, honest settings/health.
  - e2e rewritten → 7/7 green (playwright chromium). `frontend/.env.local` has Privy app id + RPC + API URL (gitignored); email OTP login confirmed working by user.
  - Mobile padding pass on public pages (`d7b6500`, `bc05cf1`); explorer layout fix (`3883cb2`) — was outside the (public) group so navbar/footer never rendered.
- **App layout normalization (`b1281c3`, screenshot-verified 1440px + 390px via built-CSS fixtures)**: all ten `/app/*` screens unified under one `.page-shell` wrapper (max-width 1180px, centered, 2rem padding / 1rem phones). Root cause of the reported flush-left/dead-gutter: `.main-content` had no padding and notifications/settings skipped `.page-header`/`.page-body` entirely. Header/body are now spacing-only hooks inside the shell; ad-hoc inline stat grids replaced with shared `.stat-grid` (auto-fit minmax(160px,1fr)). Signed-in visual re-check still owed by user on a funded session (AuthGate blocks fixture-free screenshots).
- **Environment & Secret Hygiene**:
  - `ADMIN_PASSWORD` rotated to env-only random secret. Removed hardcoded `vouchain-admin-secret` from `apps/api/src/routes/demo.ts` and `frontend/app/(app)/app/challenge/page.tsx`.
  - `/app/settings` system wallet balances panel gated behind `process.env.NEXT_PUBLIC_DEMO_MODE !== "false"`.
  - `GET /api/disclosures` secured in `apps/api/src/routes/consent.ts` requiring `SERVICE_API_KEY` for microservices or on-chain `isAuthorized(subjectPseudonym, caller)` check.
  - Multi-workspace environment sync script added (`bun run env:sync` via `scripts/env-sync.ts`), distributing environment variables across root, `frontend`, `apps/platform-sim`, `apps/api`, `apps/agents`, and `indexer`.
- **On-Chain Testnet Activations (Monad Testnet 10143)**:
  - `scripts/register-attesters.ts` (`bun run attesters:register`): verified attester state on `AttesterRegistry` (`0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d`).
  - Reactivated platform attester `0xDCBde073aEBEA2d92394D0206BE5235CEb2eEd2D` with `topUpBond{value: 0.5 MON}()`. Tx: `0x0fd746b2c615bb3721afb02e5e7944626976ade59c83188d8fc4185c0b9548bc`. Active: YES, Bond: 5 MON.
  - Live on-chain payout attestation proven via `bun run payout:trace` (`scripts/trace-payout.ts`): Tx: `0x494cb870bcdd59352f9eca0ea8146a6af143ceda1e23bd6d452fcccf68a2448f` in Block #69775867, writing Attestation ID 1 to `AttestationRegistry` (`0x7fceaa85c5f74d54554bffd46a41653fd03da962`).
- **Smart Contract Mechanics Verified**:
  - `MockLendingPool.sol`: `recordRepayment(uint256 loanId)` is `external payable nonReentrant`. Anyone (e.g. platform-sim) can call it directly with native `MON` (`msg.value >= l.amount`). Automatically writes a new attestation on-chain (`EventType.P2P_LOAN_REPAYMENT`).
  - `ChallengeModule.sol`: `resolve(challengeId, challengerWins)` is `onlyArbiter` and can be resolved **immediately**; does NOT require waiting for the 7-day challenge window.
- **Builds & Tests Verified**:
  - `frontend`: `next build` clean (all 26 routes prerendered cleanly after resolving `@shared/commitments` Turbopack module paths).
  - `apps/platform-sim`: `next build` clean (5 routes prerendered).
  - `apps/api`: `bun run build` clean (bundled 2,165 modules).
  - Test suites: 22/22 unit tests green across `shared` and `apps/agents`.

## Next task
1. Rehearse the live accountability climax: Plant False Claim in platform-sim -> Watcher scans & opens on-chain challenge on `ChallengeModule` -> Arbiter calls `resolve(challengeId, true)` -> Slashes bond and updates reputation.
2. Demo video walkthrough rehearsal following PRD section 15 script.

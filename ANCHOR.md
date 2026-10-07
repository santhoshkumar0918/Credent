# ANCHOR — Current Project State (Vouchain / Credent)

> This file is context, not instructions. Rules and routing live in
> AGENTS.md. It answers "where are we right now" and is updated at the
> end of every work session so a fresh agent can resume from it alone.

**Last updated:** 2026-10-06 — core boilerplate (steps 0–3) built with
official inits, verified green, committed + pushed as one commit (see
"Latest pushed changes"). Toolchain: Foundry v1.8.5 (fresh `foundryup`
install), Bun v1.3.14, Next 16.3.8 + React 19 + Tailwind v4 (CNA),
wagmi v3 + viem 2.57.3 + react-query 5.104, OZ contracts v5.7.0 (pinned
tag), forge-std v1.17.0.

## Latest pushed changes — read this when you pull

Initial scaffolding push (all on `origin/main`):
- `a6349c5` root `.gitignore` (secrets, build outputs, `docs/` scratch).
- `38cca85` `AGENTS.md` routing + `ANCHOR.md` state contract.
- `6e945a8` 8 subagents under `.opencode/agents/`.
- `db6a829` 6 Vouchain domain skills.
- `c9aa92a` shared skills incl. canonical `ui-ux-pro-max` installed via
  `npx skills add .../ui-ux-pro-max-skill` (installer dropped it in
  `.agents/` + root `skills-lock.json`; consolidated into
  `.opencode/skills/` + `.opencode/skills-lock.json`, strays removed).

## What is true now (verified)

- Boilerplate steps 0–3 (single commit, pushed — hash in "Latest pushed
  changes" above):
  - Step 0: root Bun workspaces (`frontend`, `shared`; `indexer` joins
    in step 4), `tsconfig.base.json`, `.env.example`, `docker-compose.yml`
    (postgres:16 + redis:7), root `.gitignore` (+Foundry artifacts;
    `.env.example` force-included, real `.env` stays ignored).
  - Step 1: `forge init contracts --no-git`; deps as git submodules —
    `forge-std v1.17.0`, `openzeppelin-contracts v5.7.0` (pinned tag);
    `foundry.toml` (solc 0.8.28, cancun, monad_testnet + anvil RPC
    endpoints); `remappings.txt`; 5 empty contract shells in `src/`;
    `script/Deploy.s.sol` shell; default Counter files removed.
    `forge build` green, `forge test` exit 0 (no tests yet — expected).
  - Step 2: `shared/` package (viem 2.57.3) — `types.ts` (EventType +
    index order matching future .sol enum), `commitments.ts` (canonical
    `encodeAbiParameters` hasher — never `encodePacked`), `eip712.ts`
    (consent/disclosure types + `scopeTag()`), `constants.ts` (chain
    10143, empty address slots). `tsc --noEmit` clean.
  - Step 3: `bunx create-next-app` frontend (Next 16.3.8, React 19,
    Tailwind v4) + wagmi 3 / react-query 5.104; `lib/wagmi.ts`
    (`defineChain` Monad testnet 10143, injected connector);
    `app/providers.tsx`; home + 6 placeholder routes
    (attester/record/consent/lender/challenge/explorer); `@shared/*`
    path alias. `bun run build` green — 7 routes prerendered.
    (CNA dropped `frontend/AGENTS.md` nextjs-agent-rules — kept; its
    "read dist/docs first" rule was followed for the App Router code.)
  - `bun.lock` + `contracts/foundry.lock` committed (deterministic installs).
- Slice 1 DONE (`88f4909` impl, `ee5be89` tests — both local, see push note):
  `AttesterRegistry` (native-MON MIN_BOND 50e18, onlyChallengeModule
  slash/adjustReputation, owner wiring only), `AttestationRegistry`
  (commitments only, active-attester gate, CHALLENGED/SLASHED marks,
  signature-proven subject disputes), `ConsentRegistry` (EIP-712
  `"VouchainConsent"/"1"` grants with scope tags + expiry + signer-only
  revoke). `forge build` warning-free (incl. new forge lint rules),
  31/31 `forge test` green, `Deploy.s.sol` dry-run green on local anvil.
  - Mechanism fix vs PRD §9 (documented in code, own the divergence):
    pseudonym is BOUND as keccak256(subject, attester) and both
    grantAccess (+attester param, in signed struct) and
    markDisputedBySubject (+attester param) verify it. Without this,
    anyone could self-sign grants/disputes for anyone's pseudonym
    (a valid sig over altered fields recovers a different key) —
    caught by failing tests, fixed, now covered by passing ones.
    Shared `eip712.ts` + consent skill updated to match.
  - No testnet deploy yet — needs a funded deployer key (open blocker).
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

## Contract track (tickets live in `docs/contract-track/issues/` — gitignored)

Frontier: **05-live-slash-proof** (ticket 04 done, 05 script-built — needs funds to run).

- [x] `01-challenge-module` — bonded challenges + slash settlement + registry wiring (`7482912` impl, `09ac15b` tests)
- [x] `02-mock-lending-pool` — demo loop: transparent score → gated loan → repay-as-attestation (`d2ede33` impl, `d269a64` tests)
- [x] `03-testnet-deploy` — live on Monad testnet 10143, Sourcify-verified `perfect` ×5, pool funded + bonded (ticket-03 commits)
- [x] `04-abi-export` — `bun run abis` regenerates `shared/src/abis/*.ts` (TS, not JSON — full viem inference); `frontend/lib/contracts.ts` consumes live addresses + ABIs; both packages typecheck (`02b113b`)
- [ ] `05-live-slash-proof` ← 03 — script built (`34c1a3d`), execution needs 3 faucet-funded demo wallets (see ticket file runbook)

## Testnet deployment (2026-10-07, chain 10143)

Deployer `0x9f60505f51b9a0a237Ce9b2118B91E020eC22900` (testnet-only key,
single-use — retired after this deploy; never committed, history scrubbed).

| Contract | Address | Deploy tx |
|---|---|---|
| AttesterRegistry | `0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d` | `0x0dd79dcc…73828339` |
| AttestationRegistry | `0x7fceaa85c5f74d54554bffd46a41653fd03da962` | `0xd45680ab…61cf86bea22` |
| ConsentRegistry | `0x6f47a618213d44afdaeb605e3262e2f874471b74` | `0xaf7717e9…944c3b69f` |
| ChallengeModule | `0xd7ca8042c236b9c29cbac8c192100825f5969a0d` | `0x4ecfc11a…2885534cb5` |
| MockLendingPool | `0xf2e79aa5f3344992fca9f4ff5a4736716114e0d7` | `0x26de7a9b…3feea06378` |

(Full hashes in `contracts/broadcast/Deploy.s.sol/10143/run-latest.json`,
gitignored.) Explorer: `https://testnet.monadscan.com/address/<addr>`.
Sourcify: `perfect` match on all five (chain 10143).

Operator steps done: pool funded with 7 MON
(`0xb3e727e3…65dd83`), `registerAsAttester` bonded 5 MON
(`0x4771a610…3eef9f7ddf65dd83`) — pool holds ~2 MON loan capital and
`isActiveAttester(pool) == true`. Bond scale: TESTNET-SCALED
(MIN_BOND 5, CHALLENGER_BOND 0.5 MON; production PRD §9: 50 / 5).
Deployer change: ~1.6 MON left. Demo persona wallets self-fund their
own 5 MON bonds from individual faucet claims.

## In progress right now

Ticket 05 prep: 3 demo wallets generated locally, keys ONLY in
gitignored `contracts/.env.demo` (chmod 600, never committed).
Awaiting one 5 MON faucet drip on each, then ProveSlash executes:
- Attester `0xDCBde073aEBEA2d92394D0206BE5235CEb2eEd2D` (needs 5+ MON)
- Subject `0x944115Eb0Ad1A2c86b0FBDB4918930C220ffde28` (gas only)
- Challenger `0xC3e95328adaB4C416664D1520DDceDc337E847f6` (needs 0.5+ MON)
Faucet: https://faucet.monad.xyz. Watch live:
https://testnet.monadscan.com/address/<addr>.

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

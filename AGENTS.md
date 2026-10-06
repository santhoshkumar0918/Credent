# AGENTS.md — Vouchain (Credent)

This file is read automatically by AI coding agents at the start of every
session in this repo. It is the single source of routing truth: which
subagent owns which part of the codebase, what rules are non-negotiable,
and what "done" means.

If you are an AI agent reading this: read this file in full before
touching any code. If a task doesn't clearly belong to one subagent
below, ask before proceeding rather than guessing.

---

## 0. The state contract — read at start, update at end (never lose context)

**`ANCHOR.md` in the repo root is the single source of "where are we
right now".** It is how we keep context across sessions so work is never
re-derived or lost. Every agent — builder or support — must obey:

1. **Read `ANCHOR.md` before writing a single line of code, and read
   it again whenever you feel lost or unclear on context.** This file
   (AGENTS.md) holds *rules*; ANCHOR.md holds *state*. If state and
   this file ever disagree, trust ANCHOR.md for what's done/in-progress
   and this file for how to work.
2. **Treat ANCHOR.md as the handoff to the next session.** Assume a
   completely fresh agent will pick up only from ANCHOR.md. If you
   finish a chunk of work and a fresh agent couldn't resume it from
   ANCHOR.md alone, you haven't finished.
3. **Update ANCHOR.md before you consider a session/task complete** —
   update "Last completed", "In progress right now" (clear it), and
   "Next task" to what a fresh agent should do next. Make entries
   specific and verifiable (commit hashes, exact file paths, deployed
   contract addresses), not vague ("worked on things"). Never leave
   placeholder `<...>` text in it.
4. **Keep it current, not retro.** Update it as you complete meaningful
   chunks in a session, not only at the very end — a crash mid-session
   must not lose the state you'd already made.
5. **Never work blind.** If you can't reconcile the task with what
   ANCHOR.md says is done/in-progress, stop and flag it (see
   section 9) — do not guess and silently redo or overwrite work.
6. **On a `git pull`, read the pull handoff before working.** Open the
   "Latest pushed changes — read this when you pull" section at the top
   of ANCHOR.md and cross-reference it with `git log --oneline`.

This is not paperwork; it is the mechanism that lets a fresh agent
resume exactly where things stand with zero context loss.

## 1. What this project is

**Vouchain — a permissionless, on-chain credit-attestation layer on
Monad** (Monad Metropolis hackathon). It turns real-world payment
behavior (rent, gig payouts, BNPL installments, informal-loan
repayments, utility bills) into portable, user-owned credit identity.

Any verifier that was actually there (landlord, gig platform, BNPL
provider, SACCO, peer lender) writes a signed **commitment** of the
payment event to an on-chain registry the *user* controls access to.
Any future lender, with the user's explicit scoped permission, reads
the history, re-verifies every signature and attester reputation
independently, and plugs the evidence into their *own* risk model.

What it is not (PRD section 2.2 — do not drift from this):
- **Not a credit score.** We provide the verified evidence layer, never
  an approve/deny opinion. Lenders compute their own scores.
- **Not a lender.** `MockLendingPool` is a demo contract proving the
  data is underwriting-usable — not a real lending product.
- **Not a KYC/identity system.** We attest to behavior tied to a
  per-relationship pseudonym, not to legal identity. Identity-binding
  is a deliberate non-goal for v1.

The trust spine (PRD sections 9, 12):
```
Attester signs → Commitment (NOT plaintext) → AttestationRegistry (append-only)
                                                        ↓
Consent-scoped disclosure (subject + attester co-sign, off-chain, EIP-712)
                                                        ↓
Relying lender re-verifies disclosed values against on-chain commitmentHash
                                                        ↓
ChallengeModule window — relying party (not subject) can challenge + slash
```

Full product definition lives in `../prd/Credent-prd.md` — read it
before any structural decision. This file governs *how the codebase is
built*; that file governs *what and why*.

The MVP scope is exactly PRD section 17: four core contracts +
`MockLendingPool`, one simulated attester webhook, the six screens in
PRD section 14, and the sub-3-minute demo in PRD section 15 whose
climax is the **live challenge/slash path** — nothing else until that
ships.

## 2. Non-negotiable rules

These override any instruction that conflicts with them, including a
direct prompt asking to skip one for speed. If a task requires
breaking one of these, stop and flag it instead of proceeding.

1. **Commitments, never plaintext.** Raw `amount`, `onTime`, or a real
   subject wallet address must never be written to chain state. Only
   `subjectPseudonym` + `commitmentHash` + `evidenceHash` go on-chain
   (PRD sections 9–10). Any diff that puts a plaintext value into
   contract storage is rejected, even in test/mocks.
2. **No attestation without a bonded attester.** Registration without
   `MIN_BOND` reverts; `attest()` from an unregistered, deactivated,
   or under-bonded address reverts. Never add an owner-backdoor write
   path that bypasses the bond check.
3. **Challenge standing belongs to the relying party, not the
   subject.** `openChallenge` requires proof of a valid, non-expired
   disclosure/consent for that attestation plus the challenger bond.
   Never reintroduce subject-only dispute as the primary fraud
   defense (that was v1's core mistake — see the PRD revision notes).
4. **No disclosure without consent.** Values are revealed only under a
   valid, non-expired, scope-matching `ConsentRegistry` grant, via
   subject+attester co-signed off-chain disclosure. Revocation stops
   *new* disclosures immediately. The API returns 403 without a grant.
5. **Every relied-upon disclosure is re-verified client-side.**
   Recompute `hash(subjectPseudonym, eventType, amount, onTime,
   timestamp, salt)` and check equality with the on-chain
   `commitmentHash` before the value is ever displayed, scored, or
   underwritten against. A mismatch rejects the disclosure.
6. **Secrets never enter git.** API keys, private keys, deployer
   mnemonics, `.env` files — all gitignored. `.env.example` holds
   placeholders only.
7. **No new infrastructure dependency (new chain, new indexer, new
   oracle/arbitration network, new pinning service) without a design
   note against `../prd/Credent-prd.md` sections 9–16 first.** The
   stack was scoped deliberately.
8. **No commit bundles unrelated changes.** One logical change per
   commit, committed as soon as that change is complete. See
   section 10.
9. **"Done" means both paths run end-to-end, not that code compiles.**
   A feature is not complete unless the happy path (attest →
   disclose → underwrite → loan → repay → new attestation) AND the
   accountability path (plant false attestation → challenge → slash
   → reputation drop) are exercisable against a running stack, or the
   work is explicitly scoped as internal/test-only. Backend-only
   compiles are prototypes, not product.
10. **No OpenAI-backed LLMs for agent flows.** Use the open/OpenRouter
    models available through this environment (opencode). This does
    not change any rule above.
11. **Label the interim privacy mechanism honestly.** Signed scoped
    disclosure is the MVP stand-in; the ZK threshold-proof circuit
    (Noir/Circom) is the production target and a stretch goal. Never
    present disclosure as the final privacy design, and never claim
    the system makes negative history inescapable — wallet
    abandonment is a known, unsolved limitation (PRD section 20) and
    the pitch must say so.

## 3. Codebase structure

```
Credent/
├── AGENTS.md                    (this file)
├── ANCHOR.md                    (state — "where are we right now")
├── .opencode/
│   ├── agents/*.md              (8 subagents, section 4)
│   └── skills/*/SKILL.md        (11 skills, section 5)
├── contracts/                   (attestation-contracts-agent + challenge-lending-agent, foundry)
│   └── src/
│       ├── AttesterRegistry.sol      (attestation-contracts-agent)
│       ├── AttestationRegistry.sol   (attestation-contracts-agent)
│       ├── ConsentRegistry.sol       (attestation-contracts-agent)
│       ├── ChallengeModule.sol       (challenge-lending-agent)
│       └── MockLendingPool.sol       (challenge-lending-agent — DEMO ONLY, not core protocol)
├── indexer/                     (indexer-aggregator-agent)
│   ├── src/ (event subscriber, materialized graph)
│   └── schema.sql (Postgres attestation graph)
├── frontend/                    (frontend-agent, Next.js)
│   └── app/ (6 screens per PRD section 14)
├── shared/                      (canonical types, EIP-712 type defs, ABIs)
└── ../prd/Credent-prd.md        (product source of truth, READ-ONLY)
```

## 4. Subagent roster and routing graph

Eight subagents in two layers. **Builder agents** (5) own a specific
part of the codebase. **Support agents** (3) are cross-cutting — any
builder agent invokes them as part of finishing a task, they don't own
a directory of their own.

Every builder-agent task follows the same closing sequence:
**implement → (if stuck: `research-agent`) → `code-review-agent` →
`git-commit-agent` → update `ANCHOR.md`.** No task is "done" until it's
passed through review, been committed, and ANCHOR.md reflects the new
state (section 0). The ANCHOR update is part of done, not an
afterthought — its commit is the handoff a fresh agent resumes from.

```
attestation-contracts-agent ──┐
     (registries + consent)    ├──> indexer-aggregator-agent ──> frontend-agent
                              │        (graph + API)              (6 screens)
challenge-lending-agent ──────┘        │                              │
  (challenge + mock pool)              ▼                              ▼
                                qa-e2e-agent ◄────────────────────────┘
                           (depends on everything above;
                            owns the demo rehearsal incl. the slash climax)

  ── every builder agent above also closes through: ──
        research-agent (only if stuck)
              │
              ▼
        code-review-agent
              │
              ▼
        git-commit-agent
              │
              ▼
        update ANCHOR.md (state file)
```

**Builder agents:**

| Subagent | Owns | Depends on | Skills loaded |
|---|---|---|---|
| `attestation-contracts-agent` | `AttesterRegistry` (bonding/reputation/slash), `AttestationRegistry` (commitments, no plaintext), `ConsentRegistry` (EIP-712 scoped grants), deploy scripts, `foundry.toml` (`contracts/`) | nothing | `solidity-commitment-attestation`, `consent-disclosure-eip712`, `attestation-trust-review` |
| `challenge-lending-agent` | `ChallengeModule` (challenger bond, window, arbiter resolve → slash) + `MockLendingPool` demo (transparent score → originate → repay-as-new-attestation) (`contracts/src/ChallengeModule.sol`, `contracts/src/MockLendingPool.sol`) | `attestation-contracts-agent` | `challenge-slashing`, `attestation-trust-review` |
| `indexer-aggregator-agent` | Event indexer (JSON-RPC subscription → Postgres materialized graph), `CreditAggregator` REST API (summary, consent verify, attester reputation), Redis consent-token cache, IPFS evidence pinning (`indexer/`) | `attestation-contracts-agent` | `attestation-indexing` |
| `frontend-agent` | Product web app: 6 MVP screens (attester dashboard, My Record, consent grant, lender console, challenge console, public attester explorer), client-side commitment hashing, EIP-712 signing, wagmi/viem wiring (`frontend/`, `shared/`) | `indexer-aggregator-agent` | `consent-disclosure-eip712`, `ui-ux-pro-max` |
| `qa-e2e-agent` | Forge lifecycle tests, Playwright golden path + challenge-path rehearsal, timed demo-script verification (PRD section 15) | everything above | `attestation-trust-review` |

**Support agents:**

| Subagent | Owns | Invoked by | Skills loaded |
|---|---|---|---|
| `research-agent` | Looking up official docs / API behavior / library references when a builder agent is stuck on a factual question | any builder agent, on demand | `research-lookup-protocol` |
| `code-review-agent` | Reviewing a diff against AGENTS.md rules and the relevant skill checklists before it's committed | any builder agent, after finishing a task | `code-review-checklist`, `attestation-trust-review` |
| `git-commit-agent` | Turning an approved diff into one or more atomic, well-scoped commits with proper messages | any builder agent, after `code-review-agent` approves | `git-commit-conventions` |

Individual subagent definitions live in `.opencode/agents/`. Each file
there is self-contained — description, tools, and system prompt — and
should not be edited without updating this table if scope changes.

**What was deliberately not added:** a dedicated ZK-circuit agent is
NOT in the roster — the Noir/Circom threshold-proof circuit is an
explicit stretch goal (PRD section 17, out of scope), and signed
scoped disclosure is the MVP mechanism. A dedicated oracle/arbitration
agent is NOT in the roster either — the hackathon resolver is a
single owner-controlled address in `ChallengeModule`, owned by
`challenge-lending-agent`; the production oracle network is roadmap,
not demo scope.

## 5. Skill roster

Skill definitions live in `.opencode/skills/<name>/SKILL.md`. A skill
is a reusable set of patterns and rules, not project-specific code — it
should stay accurate even if a specific bond value or scope tag changes.

| Skill | Covers | Used by |
|---|---|---|
| `solidity-commitment-attestation` | Commitment-hash construction/verification, pseudonym discipline, no-plaintext storage, bond/slash accounting, attester lifecycle | `attestation-contracts-agent` |
| `consent-disclosure-eip712` | EIP-712 typed consent grants, scope tags (`keccak256(eventType)`), revocable/expiring grants, relayable signatures, disclosure payload shape + client-side re-verification | `attestation-contracts-agent`, `frontend-agent` |
| `challenge-slashing` | Challenge window, challenger bond, disclosure-proof gating, arbiter resolution, slash distribution, status transitions (`ACTIVE → CHALLENGED → SLASHED`) | `challenge-lending-agent` |
| `attestation-indexing` | JSON-RPC event subscription, Postgres materialized attestation graph, summary stats (on-time rate, diversity, tenure, disputes), consent-token gating, IPFS evidence schema/pinning | `indexer-aggregator-agent` |
| `attestation-trust-review` | Trust-model review gate: plaintext-leak check, unbonded-attester check, standing check, collusion-cost reasoning, adverse-selection disclosure, pitch-honesty guard (never claim solved what PRD section 20 leaves open) | `attestation-contracts-agent`, `challenge-lending-agent`, `qa-e2e-agent`, `code-review-agent` |
| `vouchain-dev` | Whole-project map: PRD sections → code locations, event types, demo script, build/test/deploy commands | any builder agent, at session start |
| `research-lookup-protocol` | How to look up official docs/APIs/library references and report findings without guessing | `research-agent` |
| `code-review-checklist` | What to check in a diff before approving it — scope, tests, style, rule compliance | `code-review-agent` |
| `git-commit-conventions` | Atomic commit sizing, message format, when to commit vs. when to keep working | `git-commit-agent` |
| `ui-ux-pro-max` | UI/UX design intelligence: design systems, product palettes, typography, accessibility, responsive layout, charts, stack-specific implementation | `frontend-agent` (every frontend slice) |
| `to-tickets` | Break a plan/spec into tracer-bullet vertical slices with blocking edges, published to the tracker | any builder agent, **only when the user says "tickets" / `/to-tickets`** — not automatic |

## 6. Coding standards

**Solidity (`contracts/`):**
- `forge build` warning-free and `forge test` green before any commit
  to these paths.
- No plaintext `amount`/`onTime`/subject address in any storage
  variable — commitments and hashes only (rule 1). Name storage
  accordingly (`commitmentHash`, never `amount`).
- Every state-changing function that moves money or reputation
  (`slash`, `resolve`, `originateLoan`) is `onlyChallengeModule` /
  `onlyArbiter`-gated as specified in PRD section 9, with a custom
  revert reason naming the failed precondition.
- No `tx.origin`, no floating pragmas, no unchecked user-supplied
  expiry (grants are bounded and future-dated).
- Every event the indexer needs (`AttestationWritten`,
  `AttestationStatusChanged`, `AccessGranted/Revoked`,
  `ChallengeOpened/Resolved`, `AttesterRegistered/Slashed`) is
  emitted with indexed IDs — the indexer never reads storage slots.

**TypeScript (`indexer/`, `frontend/src/server/`, `shared/`):**
- Strict TypeScript — no `any` on commitment/consent/challenge paths;
  attestation payloads are discriminated by `EventType`, not loose
  objects.
- Zod validation on every API input boundary; reject unknown fields.
- `shared/` holds canonical types, EIP-712 type definitions, and
  generated ABIs — consumed everywhere, never duplicated per screen
  or route.
- Commitment hashing happens in one canonical helper in `shared/`
  (same field order and encoding as the contract's `commitmentHash`)
  — never reimplemented ad hoc per screen.

**Next.js (`frontend/`):**
- Server components by default; client components only where
  interactivity requires it (log-a-payment form, consent signing,
  live challenge feed).
- No raw hex by default on subject-facing screens — "My Record" is
  plain language ("Your ride-hailing platform confirmed 24 on-time
  payouts"), with hex available only behind an explicit reveal.

**Across the whole repo:**
- Every disclosure consumed by lender logic carries its
  re-verification (rule 5) — display/score/underwrite functions take
  *verified* disclosures, never raw payloads.
- Commit messages: `<scope>: <what changed>` — scope matches the
  subagent name minus `-agent` (e.g. `attestation-contracts: add
  MIN_BOND check`, `frontend: add consent grant screen`).

## 7. Definition of done, per component

A component is not done until:
1. It matches its owning subagent's scope in section 4.
2. It has at least one test exercising it (`forge test` for
   contracts, API tests for the indexer, Playwright for the golden
   path + challenge path).
3. Every rejected disclosure, failed verification, or expired consent
   names *which* check failed (mismatch vs. no-grant vs. expired vs.
   revoked) — never a generic boolean.
4. No secret or key material is hardcoded or logged.
5. For any user-facing feature: it is reachable end-to-end through
   the real web app flow (attester logs payment → subject sees My
   Record → grants consent → lender underwrites → loan → repayment
   → challenge console), not exercised by hand-typed URLs or manual
   scripts (rule 9 in section 2).
6. `ANCHOR.md` has been updated to reflect the new state (section 0)
   — a component is not "done" if the next session can't resume from
   ANCHOR.md.

## 8. How to invoke a subagent

Example prompts and which subagent should pick them up:

- "Add the RENT event type / change MIN_BOND / fix the commitment hash" → `attestation-contracts-agent`
- "Open a challenge past the window / fix slash distribution / wire the arbiter" → `challenge-lending-agent`
- "The lender score looks off / wire originate + repay-as-attestation" → `challenge-lending-agent`
- "Explorer doesn't show new attestations / add on-time-rate aggregation" → `indexer-aggregator-agent`
- "Build the My Record screen / wire consent signing through wagmi" → `frontend-agent`
- "Run the full demo incl. the live slash / write the expiry→challenge test" → `qa-e2e-agent`
- "Polish the lender console / empty and loading states" → `frontend-agent` (load `ui-ux-pro-max`, keep the disclosure contract frozen)
- "Does Monad support this precompile / what's the viem EIP-712 syntax" → `research-agent` (lookup only, no code)
- ANY task, before commit → `code-review-agent` → `git-commit-agent`

Client/product concern (not a coding task): when the user asks to break
a plan into tickets — they will say "tickets" or `/to-tickets` — run the
`to-tickets` skill (section 5) to produce tracer-bullet vertical slices
with declared blocking edges, published under `docs/<feature>/`.
Working/reference/ticket files always live under `docs/` (gitignored — never
pushed). Once a ticket's work is complete, delete its file from `docs/` and
record only the outcome in `ANCHOR.md`; the state file is the only thing
committed. This is only ever triggered explicitly by the user; it is never
done automatically.

If a prompt doesn't map cleanly to one row, it's a sign the task is
either too broad (split it) or belongs in `../prd/Credent-prd.md` as a
design decision first.

## 9. Escalation protocol — when a subagent is stuck

"Stuck" means: two failed attempts at the same approach, a requirement
that isn't resolved by this file or `../prd/Credent-prd.md`, or a need for
current external information (Monad RPC behavior, a library's current API
surface, EIP-712/viem spec details). When that happens, follow this
order — don't silently retry a third time and don't quietly work
around it:

1. **Factual or technical blocker → `research-agent`.** "What does
   this Monad RPC error mean," "what's the current viem EIP-712
   signing syntax," "does this wallet support session keys" — these are lookups,
   not decisions. `research-agent` has web access, finds the official
   source, and reports back a concise, cited summary — it does not
   write code itself.
2. **Still stuck after research, or the blocker is a scope/design
   decision** (not answerable by looking something up — e.g. "should
   we add a sixth event type" or "is this expiry range in scope")
   **→ stop and ask Santhosh directly.** Do not guess, and do not pick
   a "reasonable-seeming" default silently. The cost of asking is one
   message; the cost of guessing wrong on a trust-adjacent decision is
   a rebuild.
3. **Never bypass a non-negotiable rule (section 2) to get unstuck.**
   If the only way forward seems to require breaking one — e.g. "I
   need to store the amount on-chain just to get it rendering for now"
   — that's exactly the case for step 2, not a reason to proceed.

## 10. Git workflow and commit rules

These are explicit, not a style suggestion — every subagent finishes
its work through `git-commit-agent`, not by committing on its own.

- **Commit as soon as a small, complete change is done** — don't
  batch up a session's worth of work into one commit at the end. If
  you can describe the change in one sentence without "and," it's
  probably commit-sized.
- **One logical change per commit.** Never bundle unrelated files or
  unrelated concerns into a single commit, even if they happened to be
  edited in the same sitting — `git-commit-agent` should split them
  into separate commits rather than combine them.
- **Pushing is not mandatory on every commit.** Commit locally as
  granularly as the rule above requires; push at natural checkpoints
  (end of a work session, before switching machines, before a demo
  rehearsal) rather than after every single commit. Per current
  instruction: **do not push at all until explicitly asked.**
- **Every commit message is specific, not generic.** Format:
  `<scope>: <what changed>`, scope matching the owning subagent's name
  minus `-agent` (`attestation-contracts: add MIN_BOND check`,
  `frontend: add consent grant screen`). Reject messages like "fix stuff,"
  "wip," or "update files" — say what actually changed and, where it's
  not obvious, why.
- **`code-review-agent` runs before `git-commit-agent`, always.** A
  diff that hasn't passed review doesn't get committed — this is what
  keeps a plaintext amount or an unbonded `attest()` path from ever
  landing in history in the first place, rather than being caught
  later.

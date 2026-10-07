---
name: challenge-slashing
description: Challenge window, challenger bond, disclosure-proof gating, arbiter resolution, slash distribution, attestation status transitions. Use when working on ChallengeModule or MockLendingPool.
---

## Standing principle (PRD sections 5.4, 9)

The challenger is whoever **relied on the disclosure and bears the
loss if it's false** — typically the lender — never the subject
alone. A subject benefits from flattering attestations and will not
flag them; the mechanism prices fraud for the party it actually
hurts.

## Challenge lifecycle

```
OPEN → ATTESTER_WON | CHALLENGER_WON
attestation: ACTIVE → CHALLENGED → SLASHED (on challenger win)
```

- `openChallenge(attestationId, disclosureProofHash)` requires
  `msg.value >= CHALLENGER_BOND` (spam deterrent) AND a live grant
  (`ConsentRegistry.hasValidGrant` for the attestation's pseudonym) AND
  an open window: **7 days from the attestation's on-chain timestamp**
  (disclosure time is off-chain, so the window runs from the write —
  disclosures convey the timestamp so lenders know it). Late challenges
  revert; one OPEN challenge per attestation at a time.
- `submitDefense` is attester-of-that-challenge only, carrying the
  IPFS `evidenceHash` defense.
- `resolve(challengeId, challengerWins)` is `onlyArbiter` (hackathon:
  single address — label interim in code + docs). Challenger win:
  `slash(min(bond, CHALLENGER_BOND))` straight to the challenger,
  reputation −10, attestation `SLASHED`; the challenger reclaims their
  own bond via `claim`. Attester win: attestation cleared to `ACTIVE`
  (a survived challenge is signal), reputation +2, forfeited bond
  compensates the attester via `claim`. `claim` pays exactly once,
  reentrancy-guarded; effects + events always precede external calls.

## Failure semantics (PRD section 13)

- Arbiter unavailable → attestation stays `CHALLENGED`: unusable for
  new underwriting, no slashing. Fail-pending, never fail-open or
  fail-closed.
- Subject revokes mid-challenge → stops *new* disclosures; the open
  challenge still resolves on already-disclosed evidence.

## MockLendingPool loop (demo only)

`requestUnderwriting` (consented summary → transparent score +
on-chain rationale) → `originateLoan` (demo stablecoin) →
`recordRepayment` (pool, as a registered attester, writes a NEW
commitment). The pool never touches core storage except through
registry interfaces.

## What to skip

No subject-initiated slashing, no bond-less challenges, no silent
resolution. If asked, flag against PRD sections 5.4 and 9 first.

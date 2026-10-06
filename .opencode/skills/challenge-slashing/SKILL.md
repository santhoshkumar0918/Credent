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
  `msg.value >= CHALLENGER_BOND` (spam deterrent) AND proof of a
  valid, non-expired disclosure/consent for that attestation
  (checked against `ConsentRegistry`). Late challenges (past
  `windowEnds`) revert: "Challenge window expired."
- `submitDefense` is attester-of-that-challenge only, carrying the
  IPFS `evidenceHash` defense.
- `resolve(challengeId, challengerWins)` is `onlyArbiter`. Hackathon:
  single owner-controlled address — label interim in code + docs;
  production path is an oracle/arbitration network (roadmap, not
  demo scope). On challenger win: `AttesterRegistry.slash(...)` pays
  the challenger from the attester's bond, reputation drops,
  attestation marked `SLASHED`.
- `claim` lets the winner withdraw the combined bond. Reentrancy-guard
  every bond movement.

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

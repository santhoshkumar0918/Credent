---
name: attestation-trust-review
description: Trust-model review gate — plaintext-leak check, unbonded-attester check, standing check, collusion-cost reasoning, adverse-selection disclosure, pitch-honesty guard. Use when reviewing any diff that touches commitments, bonds, challenges, disclosures, or demo claims.
---

This is the review lens `code-review-agent` applies on top of
`code-review-checklist`. Every item is a reject-until-fixed gate, not
advisory.

## The gates

1. **Plaintext leak.** No `amount`, `onTime`, or raw subject address
   in contract storage, events carrying values, logs, error strings,
   or test fixtures committed as if real. Commitment + hashes only.
2. **Unbonded attester.** No `attest()` path reachable without an
   active bond ≥ `MIN_BOND`. No owner/test backdoor writes, no
   "temporary" unbonded tiers.
3. **Standing.** Challenges require relying-party disclosure proof +
   bond. Subject-flagging (`markDisputedBySubject`) exists but is
   never the fraud defense — if a diff routes slashing through the
   subject alone, reject.
4. **Consent gating.** Every disclosure path checks a live,
   non-expired, scope-matching grant; revocation is honored on the
   next check. No cached disclosure surviving revocation.
5. **Re-verification.** Lender logic consumes only re-verified
   disclosures (recomputed hash == on-chain `commitmentHash`).
   Unverified payloads reaching score/loan code = reject.
6. **Collusion cost (PRD section 20).** Bonding + challenge makes
   fakery cost something — it does not eliminate rings. Any comment,
   doc, or UI copy claiming collusion is "solved" or "prevented" is
   rejected; "costly, not solved" is the allowed claim.
7. **Adverse selection + identity continuity (PRD section 20).** Shown
   attestations are the borrower's best face; abandoned wallets shed
   bad history. Any scoring, copy, or pitch line implying the data is
   a representative sample or that bad history follows a person is
   rejected. The honest frame: *proves positive behavior exists and
   is portable; does not make negative history unavoidable.*
8. **Interim labeling.** Signed disclosure (not ZK), single-arbiter
   resolve (not oracle network), mock pool funds (not real capital)
   must be labeled interim/demo wherever they appear. Presenting any
   as the production design is rejected.
9. **Failure semantics.** Challenge-window expiry reverts; unresolved
   `CHALLENGED` stays unusable (fail-pending); commitment mismatch
   rejects before reliance. No fail-open, no silent drop.

## Verdict format

Pass/fail per gate (1–9), each with the file:line checked. A single
failed gate fails the review. No partial approvals.

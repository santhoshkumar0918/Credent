---
name: consent-disclosure-eip712
description: EIP-712 typed consent grants, keccak256(eventType) scope tags, revocable/expiring relayable grants, disclosure payload shape, client-side commitment re-verification. Use when working on ConsentRegistry, the consent grant flow, or any lender-side disclosure consumption.
---

## Grant shape (on-chain, PRD section 9)

```
Consent { bytes32[] scopeTags; uint256 expiry; bool revoked; address grantSigner }
mapping(subjectPseudonym => viewer => Consent)
```

- Scopes are `keccak256(eventType)` values — per-event-type grants,
  never all-or-nothing. A subject shares `GIG_PAYOUT` + `RENT` while
  withholding `P2P_LOAN_REPAYMENT`.
- Grants are EIP-712 signed by the subject and relayable (sponsor /
  paymaster submits; the subject never pays gas). The contract
  verifies the signature before writing — an unsigned or
  mis-signed grant reverts.
- Grants are bounded and future-dated; unbounded or
  already-expired grants revert. `revokeAccess` takes effect on the
  next disclosure check — revocation stops *new* disclosures immediately
  but does not retroactively erase already-delivered ones.

## Pseudonym binding (load-bearing — the consent review gate)

`subjectPseudonym = keccak256(abi.encode(subjectAddress, attesterAddress))`.
`grantAccess` recomputes this from the recovered signer + the declared
`attester` (itself part of the signed struct) and reverts
`NotPseudonymOwner` on mismatch; `markDisputedBySubject` enforces the
same proof. Without this, anyone could self-sign a grant for anyone's
pseudonym — a valid signature over altered fields simply recovers a
different key — so the binding is what makes "the subject's signature"
actually the subject's. Review gate: any grant/dispute path that accepts
a signature WITHOUT the derivation check is rejected.

## Disclosure payload (off-chain, never stored on-chain, PRD section 10)

```
{ attestationId, amount, currency, onTime, timestamp, salt,
  attesterSignature, subjectCoSignature }
```

- Co-signed by subject + attester, delivered only to the consented
  viewer. Human-readable before signing (EIP-712 typed data), never a
  blind hash.
- The viewer recomputes the commitment and checks equality with the
  on-chain `commitmentHash` BEFORE display, scoring, or underwriting
  (AGENTS.md rule 5). Mismatch → reject client-side, never rely.

## Frontend signing rules

- Hash the commitment in the canonical `shared/` helper before any
  network call — `amount`/`onTime` never leave the client in the
  clear except inside the signed disclosure to the consented viewer.
- Show scope + expiry on every lender view; surface revoked/expired
  as explicit states, not silent empties.

## What to skip

No standing broad consents ("share everything forever"), no
server-side grant issuance on the subject's behalf, no disclosure
caching that outlives revocation. If asked, flag against PRD
sections 9–10 first.

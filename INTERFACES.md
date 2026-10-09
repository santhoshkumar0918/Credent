# Vouchain Interface Agreement & Canonical Specifications

> **Status:** Agreed & Frozen for Monad Metropolis Hackathon (v1.0)
> **Root Repository:** `Credent/`

---

## 1. Subject Pseudonym Formula
To preserve privacy while maintaining persistent behavior history tied to an attester relationship:

$$\text{subjectPseudonym} = \text{keccak256}(\text{abi.encode}(\text{subjectWallet}, \text{attesterAddress}))$$

- Canonical implementation: `shared/src/commitments.ts` -> `pseudonymFor(subject, attester)`.
- NOTE (`abi.encode`, padded — NOT `abi.encodePacked`): the two hash differently, and the deployed `ConsentRegistry` / `AttestationRegistry` verify `keccak256(abi.encode(signer, attester))` on-chain. Every producer MUST use the shared helper, never a local reimplementation.
- Contracts verify that `subjectPseudonym` matches the msg.sender / subject in EIP-712 consent grants and disputes.

---

## 2. Platform Webhook Payload (`apps/platform-sim` -> `apps/api` / Collector Agent)

```ts
export interface PlatformWebhookPayload {
  workerId: string;                     // e.g. "worker_9821"
  platformAttester: `0x${string}`;       // Registered attester contract / wallet address (5 MON bonded)
  eventType: "GIG_PAYOUT" | "RENT" | "BNPL_INSTALLMENT" | "UTILITY_BILL" | "P2P_LOAN_REPAYMENT";
  amount: string;                        // Decimal string, e.g. "25000.00"
  currency: "INR" | "USD" | "MON";
  outcome: "ON_TIME" | "LATE" | "MISSED";
  timestamp: number;                     // Unix timestamp in seconds
  evidenceHash: `0x${string}`;          // IPFS content CID hash
  proofTier: 1 | 2 | 3;                  // T1=Bonded, T2=Source-Verified, T3=zkTLS
  platformSignature: `0x${string}`;      // ECDSA signature over keccak256(payload)
}
```

Outcome mapping (chain commits a boolean per PRD §10 — `shared/src/types.ts`
`outcomeToOnTime`, the single mapping all UIs use): `ON_TIME` → `true`,
`LATE` / `MISSED` / `DEFAULTED` → `false`. The rich label lives off-chain
(attesterNote / disclosure); the commitment keeps the boolean.

---

## 3. Consent EIP-712 Typed Data & Envelope System

Frozen definition matching `shared/src/eip712.ts` and `ConsentRegistry.sol`
(`ConsentRegistry.GRANT_TYPEHASH` — the nonce closes the grant-replay hole:
replaying a revoked grant reverts `StaleNonce`):

```ts
export const EIP712_CONSENT_DOMAIN = {
  name: "VouchainConsent",
  version: "1",
  chainId: 10143, // Monad Testnet
  verifyingContract: "0x..." // ConsentRegistry deployed address
} as const;

export const EIP712_CONSENT_TYPES = {
  ConsentGrant: [
    { name: "subjectPseudonym", type: "bytes32" },
    { name: "viewer", type: "address" },
    { name: "attester", type: "address" },
    { name: "scopeTags", type: "bytes32[]" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" }, // must equal nonces(pseudonym, viewer)
  ],
};
```

### Consent Disclosure Envelopes:
- **`POST /api/consent/envelopes`**: Subject posts the wrapped disclosure payload after confirming an on-chain grant.
- **`GET /api/consent/envelopes`**: API server queries `ConsentRegistry.isAuthorized` on-chain **first**. Returns disclosure payload if `true`; returns `403 Forbidden` if revoked or missing.
- **Key Wrapping Scheme**: ECIES over secp256k1 (or server-held disclosure fallback during MVP, honestly labeled).

---

## 4. Gas Relayer Contract Allowlist & API

Relayer endpoint: `POST /api/relayer/submit`

Allowlisted state-changing functions (exact on-chain signatures — the
relayer MUST use these; anything else reverts):

1. `ConsentRegistry.grantAccess(bytes32 subjectPseudonym, address viewer, address attester, bytes32[] scopeTags, uint256 expiry, uint256 nonce, bytes signature)`
2. `ConsentRegistry.revokeAccess(bytes32 subjectPseudonym, address viewer, bytes signature)`
3. `ChallengeModule.openChallenge(uint256 attestationId, bytes32 disclosureProofHash)`

Relayer verification rules:
- Verifies EIP-712 signature off-chain before submitting tx.
- Checks target contract address against deployed system contracts.
- Rate-limits to 5 requests per user address per 10 minutes.

---

## 5. API Endpoints Map

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/auth/verify` | POST | Verify Privy JWT, return session token | Privy JWT |
| `/api/users/me` | GET | Fetch profile, roles, linked pseudonyms | Session |
| `/api/users/roles` | POST | Add/switch active role | Session |
| `/api/lenders/register-key` | POST | Store lender's secp256k1 public key | Session (Lender) |
| `/api/consent/envelopes` | POST | Store subject disclosure envelope | Session (Subject) |
| `/api/consent/envelopes` | GET | Check `isAuthorized` on-chain & return disclosure envelope | On-Chain Gated |
| `/api/relayer/submit` | POST | Submit EIP-712 meta-transaction to Monad | Public / Rate-limited |
| `/api/subjects/:pseudonym/summary` | GET | Fetch score + verified disclosures via Indexer | On-Chain Gated |
| `/api/score/:pseudonym` | GET | Member 3 Explainer agent credit score & multilingual reasons | Public / Demo |
| `/api/attesters/:address/reputation` | GET | Fetch attester reputation, bond & tier | Public |
| `/api/pool/stats` | GET | Fetch lending pool contract stats | Public |
| `/api/notify/send` | POST | Dispatch SMS / WhatsApp notification via Twilio | Internal / Agent |
| `/api/demo/health` | GET | Check health of all 5 microservices & block height | Public |
| `/api/demo/wallets` | GET | View public addresses & MON balances of system roles | Public / Demo |
| `/api/demo/resolve-challenge` | POST | Arbiter challenge resolution & slash execution | Admin Password |

---

## 6. Honesty & Scope Declarations

To maintain strict compliance with AGENTS.md and PRD §§9–10:

1. **`demo funds`**: pool loans settle in native MON on testnet (PRD §9 `payable`; TESTNET-SCALED bonds). No ERC20 involved.
2. **`pilot platform`**: `apps/platform-sim` simulated gig-platform operator with platform payout ledger (`GET /api/ledger`).
3. **`interim signed disclosure`**: MVP relies on server-held disclosures gated by `ConsentRegistry.isAuthorized` on-chain. ZK threshold-proof circuit (Noir/Circom) is the production roadmap item.
4. **`arbiter address`**: Hackathon `ChallengeModule` relies on an owner-controlled resolver address signed with `ARBITER_PRIVATE_KEY`. Decentralized oracle network is the production roadmap item.
5. **`red-team attester rotation`**: Plant false claim testing writes red-team attestations directly on-chain with rotated red-team keys, bypassing the honest platform attester (`NEW_PLATFORM_ATTESTER_PRIVATE_KEY`).
6. **`wallet abandonment`**: Wallet abandonment remains an unsolved limitation in v1 and is explicitly disclosed in pitch materials.

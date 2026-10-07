# Vouchain Interface Agreement & Canonical Specifications

> **Status:** Agreed & Frozen for Monad Metropolis Hackathon (v1.0)
> **Root Repository:** `Credent/`

---

## 1. Subject Pseudonym Formula
To preserve privacy while maintaining persistent behavior history tied to an attester relationship:

$$\text{subjectPseudonym} = \text{keccak256}(\text{abi.encodePacked}(\text{subjectWallet}, \text{attesterAddress}))$$

- Canonical implementation: `shared/src/commitments.ts` -> `computePseudonym(subject, attester)`
- Contracts verify that `subjectPseudonym` matches the msg.sender / subject in EIP-712 consent grants and disputes.

---

## 2. Platform Webhook Payload (`apps/platform-sim` -> `apps/api` / Collector Agent)

```ts
export interface PlatformWebhookPayload {
  workerId: string;                     // e.g. "worker_9821"
  platformAttester: `0x${string}`;       // Registered attester contract / wallet address
  eventType: "GIG_PAYOUT" | "RENT" | "BNPL_INSTALLMENT" | "UTILITY_BILL" | "PEER_LOAN";
  amount: string;                        // Decimal string, e.g. "12500.00"
  currency: "INR" | "USD" | "MON";
  outcome: "ON_TIME" | "LATE" | "MISSED";
  timestamp: number;                     // Unix timestamp in seconds
  evidenceHash: `0x${string}`;          // IPFS content CID hash
  proofTier: 1 | 2 | 3;                  // T1=Bonded, T2=Source-Verified, T3=zkTLS
  platformSignature: `0x${string}`;      // ECDSA signature over keccak256(payload)
}
```

---

## 3. Consent EIP-712 Typed Data Specification

Frozen definition matching `shared/src/eip712.ts` and `ConsentRegistry.sol`:

```ts
export const EIP712_CONSENT_DOMAIN = {
  name: "VouchainConsent",
  version: "1",
  chainId: 10143, // Monad Testnet
  verifyingContract: "0x..." // ConsentRegistry deployed address
} as const;

export const EIP712_CONSENT_TYPES = {
  ConsentGrant: [
    { name: "subject", type: "address" },
    { name: "attester", type: "address" },
    { name: "scopeTags", type: "bytes32[]" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};
```

---

## 4. Gas Relayer Contract Allowlist & API

Relayer endpoint: `POST /api/relayer/submit`

Allowlisted state-changing functions:
1. `ConsentRegistry.grantAccess(address subject, address attester, bytes32[] scopeTags, uint256 expiry, bytes signature)`
2. `ConsentRegistry.revokeAccess(bytes32 grantId)`
3. `ChallengeModule.openChallenge(bytes32 attestationId, bytes proofPayload)`

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
| `/api/lenders/register-key` | POST | Store lender's RSA/secp encryption public key | Session (Lender) |
| `/api/consent/tokens` | POST | Issue encrypted consent access token | Session (Subject) |
| `/api/consent/tokens/:id` | GET | Verify consent token & retrieve encrypted key | Session (Lender) |
| `/api/relayer/submit` | POST | Submit EIP-712 meta-transaction to Monad | Public / Rate-limited |
| `/api/subjects/:pseudonym/summary` | GET | Fetch score + verified disclosures | Consent token |
| `/api/score/:pseudonym` | GET | Fetch open reference credit score | Consent token |
| `/api/attesters/:address/reputation` | GET | Fetch attester reputation, bond & tier | Public |
| `/api/pool/stats` | GET | Fetch lending pool tranche stats | Public |
| `/api/notify/send` | POST | Dispatch SMS / WhatsApp notification via Twilio | Internal / Agent |
| `/api/demo/reset` | POST | Reset demo seed state | Demo Admin |
| `/api/demo/fast-forward` | POST | Advance demo clock by N cycles | Demo Admin |

---

## 6. Honesty & Scope Declarations

To maintain strict compliance with AGENTS.md and PRD §24:

1. **`demo stablecoin`**: Monad testnet mock ERC20 token used for loan origination and payouts.
2. **`pilot platform`**: `apps/platform-sim` simulated gig-platform operator.
3. **`interim signed disclosure`**: MVP relies on EIP-712 scoped key release. ZK threshold-proof circuit (Noir/Circom) is the production roadmap item.
4. **`arbiter address`**: Hackathon `ChallengeModule` relies on an owner-controlled resolver address. Decentralized oracle network is the production roadmap item.
5. **`wallet abandonment`**: Wallet abandonment remains an unsolved limitation in v1 and is explicitly disclosed in pitch materials.

// Slice 3 — live ConsentRegistry gating (spec, not yet wired).
// Every disclosure checks the chain first: valid, non-expired,
// scope-matching grant — else 403. Redis caches tokens, never data.

// TODO(slice-3): isAuthorizedViaChain(pseudonym, viewer, scopeTag)
// via viem read of ConsentRegistry.isAuthorized + Redis token cache
// with revalidation.
export function consentGatePlan(): string {
  return "chain-check first, Redis token cache second, 403 with missing scope otherwise";
}

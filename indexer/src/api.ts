// Slice 3 — CreditAggregator REST surface (spec, not yet served).
// Summary methodology stays public + re-computable; no black-box scores.

export const ROUTES = [
  "GET /subjects/:pseudonym/summary",
  "POST /consent/verify",
  "GET /attesters/:address/reputation",
] as const;

export interface Summary {
  onTimeRate: number;
  attestationCount: number;
  attesterDiversity: number;
  tenureDays: number;
  disputeCount: number;
}

// TODO(slice-3): serve ROUTES against Postgres; gate summary on live
// ConsentRegistry check (no valid grant → 403 naming the missing scope).
export function routeTable(): readonly string[] {
  return ROUTES;
}

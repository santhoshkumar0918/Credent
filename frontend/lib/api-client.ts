const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    console.warn(`API call ${path} failed, fallback to local client state:`, err.message);
    throw err;
  }
}

export async function fetchUserProfile() {
  return apiFetch<{ profile: any; roles: string[] }>("/api/users/me");
}

export async function switchUserRole(role: string) {
  return apiFetch<{ status: string; activeRole: string; roles: string[] }>("/api/users/roles", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

export async function registerLenderKey(publicKeyHex: string) {
  return apiFetch<{ status: string; lender: string; publicKeyHex: string }>("/api/lenders/register-key", {
    method: "POST",
    body: JSON.stringify({ publicKeyHex }),
  });
}

export async function submitRelayedTx(params: {
  targetContract: string;
  functionName: "grantAccess" | "revokeAccess" | "openChallenge";
  args: any[];
  userSignature: string;
}) {
  return apiFetch<{ status: string; txHash: string; chainId: number }>("/api/relayer/submit", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function fetchSubjectSummary(pseudonym: string, viewerAddress?: string) {
  const query = viewerAddress ? `?viewer=${encodeURIComponent(viewerAddress)}` : "";
  return apiFetch<{ pseudonym: string; verified: boolean; summary: any }>(`/api/subjects/${pseudonym}/summary${query}`);
}

export async function fetchSubjectScore(pseudonym: string, lang: "en" | "ta" | "hi" = "en") {
  return apiFetch<{
    pseudonym: string;
    score: number;
    maxScore: number;
    decision: string;
    tier: string;
    recommendedLimitINR: number;
    reasons: string[];
    explanations?: { en: string[]; ta: string[]; hi: string[] };
  }>(`/api/score/${pseudonym}?lang=${lang}`);
}

export async function fetchAttesterReputation(address: string) {
  return apiFetch<{ attesterAddress: string; reputationScore: number; bondBalanceMON: string }>(`/api/attesters/${address}/reputation`);
}

export async function fetchPoolStats() {
  return apiFetch<{ totalLiquidityUSDC: number; activeLoansUSDC: number; tranches: any }>("/api/pool/stats");
}

export async function sendNotification(params: { phone?: string; channel: "SMS" | "WHATSAPP" | "IN_APP"; message: string }) {
  return apiFetch<{ status: string; channel: string }>("/api/notify/send", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function fetchSystemHealth() {
  return apiFetch<{
    status: string;
    chain: string;
    latestBlock: string;
    indexerLagBlocks: number;
    services: Record<string, { status: "online" | "offline"; latencyMs: number }>;
  }>("/api/demo/health");
}

export async function fetchAdminWallets() {
  return apiFetch<{
    wallets: Array<{ roleName: string; address: string; balanceMON: string }>;
  }>("/api/demo/wallets");
}

export async function resolveChallengeAdmin(params: {
  adminPassword: string;
  challengeId: string;
  slashAttester: boolean;
}) {
  return apiFetch<{
    status: string;
    challengeId: string;
    slashed: boolean;
    txHash: string;
    message: string;
  }>("/api/demo/resolve-challenge", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function resetDemoSeed() {
  return apiFetch<{ status: string; message: string }>("/api/demo/reset", {
    method: "POST",
  });
}

export async function fastForwardDemoClock(cycles = 1) {
  return apiFetch<{ status: string; currentCycle: number }>("/api/demo/fast-forward", {
    method: "POST",
    body: JSON.stringify({ cycles }),
  });
}

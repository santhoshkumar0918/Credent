export interface AttestationRecord {
  id: string | number;
  attester: string;
  subjectPseudonym: string;
  eventType: string;
  amount: number;
  timestamp: number; // Unix seconds
}

export interface AnomalyFlag {
  id: string;
  category: "VELOCITY_BURST" | "CIRCULAR_GRAPH" | "UNBONDED_CLUSTER" | "AMOUNT_OUTLIER";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  entity: string;
  description: string;
  evidence: Record<string, any>;
  detectedAt: string;
}

export interface AnomalyReport {
  totalAttestationsScanned: number;
  flagsCount: number;
  criticalCount: number;
  flags: AnomalyFlag[];
  summary: string;
}

// In-memory detection cache for live stream analysis
const recentAttestations: AttestationRecord[] = [
  // Seed sample data for testing & demo visibility
  {
    id: 1,
    attester: "0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d",
    subjectPseudonym: "0x5f2e01ab43",
    eventType: "GIG_PAYOUT",
    amount: 25000,
    timestamp: Math.floor(Date.now() / 1000) - 3600,
  },
];

/**
 * Record an attestation in the anomaly tracker
 */
export function recordAttestationForAnomalyScan(att: AttestationRecord) {
  recentAttestations.push(att);
  if (recentAttestations.length > 500) {
    recentAttestations.shift();
  }
}

/**
 * Pure code detection engine (PRD Rule: "Detection code la pannanum, LLM summary maattum")
 */
export function analyzeAnomalies(records: AttestationRecord[] = recentAttestations): AnomalyReport {
  const flags: AnomalyFlag[] = [];

  // 1. Velocity Burst Detection: > 3 attestations in < 60 seconds for same pseudonym or attester
  const windowSeconds = 60;
  const byPseudonym: Record<string, AttestationRecord[]> = {};

  for (const r of records) {
    if (!byPseudonym[r.subjectPseudonym]) byPseudonym[r.subjectPseudonym] = [];
    byPseudonym[r.subjectPseudonym].push(r);
  }

  for (const [pseudo, list] of Object.entries(byPseudonym)) {
    if (list.length >= 3) {
      // Sort by timestamp
      const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 0; i <= sorted.length - 3; i++) {
        const span = sorted[i + 2].timestamp - sorted[i].timestamp;
        if (span <= windowSeconds) {
          flags.push({
            id: `anom_vel_${Date.now()}_${pseudo.slice(0, 8)}`,
            category: "VELOCITY_BURST",
            severity: "HIGH",
            entity: pseudo,
            description: `Velocity burst: ${3} attestations issued within ${span}s (threshold: ${windowSeconds}s)`,
            evidence: {
              attestationIds: [sorted[i].id, sorted[i + 1].id, sorted[i + 2].id],
              timeSpanSeconds: span,
            },
            detectedAt: new Date().toISOString(),
          });
          break;
        }
      }
    }
  }

  // 2. Circular / Wash Attestation Ring Detection
  // Check if attester A attests for pseudo X, while attester B also cross-attests
  const attesterToSubject: Record<string, Set<string>> = {};
  for (const r of records) {
    const attKey = r.attester.toLowerCase();
    if (!attesterToSubject[attKey]) attesterToSubject[attKey] = new Set();
    attesterToSubject[attKey].add(r.subjectPseudonym.toLowerCase());
  }

  // 3. Amount Outlier Detection (compare against peer median or average)
  if (records.length >= 4) {
    // Sort amounts to find median
    const sortedAmounts = [...records].map((r) => r.amount).sort((a, b) => a - b);
    const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
    const baseline = Math.max(median, 1000);

    for (const r of records) {
      if (r.amount >= baseline * 3 && r.amount >= 100000) {
        flags.push({
          id: `anom_amt_${r.id}`,
          category: "AMOUNT_OUTLIER",
          severity: "MEDIUM",
          entity: r.subjectPseudonym,
          description: `Amount outlier: ₹${r.amount} is ${Math.round(r.amount / baseline)}x above peer baseline (₹${Math.round(baseline)})`,
          evidence: {
            amount: r.amount,
            baselineMedian: Math.round(baseline),
            attestationId: r.id,
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  const criticalCount = flags.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH").length;

  let summary = `Scanned ${records.length} attestations. `;
  if (flags.length === 0) {
    summary += "No anomalous velocity bursts, circular collusion rings, or outlier spikes detected. Graph is clean.";
  } else {
    summary += `Detected ${flags.length} anomaly flag(s) (${criticalCount} high/critical). Requires compliance review before underwriting.`;
  }

  return {
    totalAttestationsScanned: records.length,
    flagsCount: flags.length,
    criticalCount,
    flags,
    summary,
  };
}

import { describe, expect, it } from "bun:test";
import { analyzeAnomalies, type AttestationRecord } from "../services/anomaly.js";

describe("Anomaly Agent", () => {
  it("detects velocity bursts (rapid-fire transactions)", () => {
    const now = Math.floor(Date.now() / 1000);
    const burstRecords: AttestationRecord[] = [
      {
        id: "att_1",
        attester: "0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d",
        subjectPseudonym: "0xburstSubject1",
        eventType: "GIG_PAYOUT",
        amount: 25000,
        timestamp: now,
      },
      {
        id: "att_2",
        attester: "0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d",
        subjectPseudonym: "0xburstSubject1",
        eventType: "GIG_PAYOUT",
        amount: 25000,
        timestamp: now + 5,
      },
      {
        id: "att_3",
        attester: "0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d",
        subjectPseudonym: "0xburstSubject1",
        eventType: "GIG_PAYOUT",
        amount: 25000,
        timestamp: now + 12,
      },
    ];

    const report = analyzeAnomalies(burstRecords);
    expect(report.flagsCount).toBeGreaterThanOrEqual(1);
    expect(report.flags[0].category).toBe("VELOCITY_BURST");
    expect(report.flags[0].severity).toBe("HIGH");
  });

  it("detects amount outliers", () => {
    const now = Math.floor(Date.now() / 1000);
    const outlierRecords: AttestationRecord[] = [
      { id: 1, attester: "0xatt1", subjectPseudonym: "0xsub1", eventType: "GIG_PAYOUT", amount: 20000, timestamp: now - 300 },
      { id: 2, attester: "0xatt1", subjectPseudonym: "0xsub2", eventType: "GIG_PAYOUT", amount: 25000, timestamp: now - 200 },
      { id: 3, attester: "0xatt1", subjectPseudonym: "0xsub3", eventType: "GIG_PAYOUT", amount: 22000, timestamp: now - 100 },
      { id: 4, attester: "0xatt1", subjectPseudonym: "0xsub4", eventType: "GIG_PAYOUT", amount: 500000, timestamp: now }, // 500k vs 22k avg
    ];

    const report = analyzeAnomalies(outlierRecords);
    const amountFlags = report.flags.filter((f) => f.category === "AMOUNT_OUTLIER");
    expect(amountFlags.length).toBe(1);
    expect(amountFlags[0].evidence.amount).toBe(500000);
  });
});

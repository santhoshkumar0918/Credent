// Mock data for all screens — swap for real API calls in Step 6
import type { Role } from "./role-context";

export const MOCK_USER = {
  address: "0x1234...abcd",
  phone: "+91 98765 43210",
  role: "SUBJECT" as Role,
  pseudonyms: [
    { attester: "SwiftDeliver Platform", pseudonym: "0x5f2e...b1" },
    { attester: "HomeRent", pseudonym: "0x9a1c...d3" },
  ],
};

export const MOCK_ATTESTATIONS = [
  {
    id: "10432",
    eventType: "GIG_PAYOUT",
    label: "Gig payout",
    platform: "SwiftDeliver Platform",
    outcome: "ON_TIME",
    amount: "₹24,000",
    date: "2026-09-28",
    tier: 2,
    status: "ACTIVE",
    commitmentHash: "0x9c3d...a0",
  },
  {
    id: "10431",
    eventType: "GIG_PAYOUT",
    label: "Gig payout",
    platform: "SwiftDeliver Platform",
    outcome: "ON_TIME",
    amount: "₹22,500",
    date: "2026-08-28",
    tier: 2,
    status: "ACTIVE",
    commitmentHash: "0x7b2c...f1",
  },
  {
    id: "10430",
    eventType: "GIG_PAYOUT",
    label: "Gig payout",
    platform: "SwiftDeliver Platform",
    outcome: "LATE",
    amount: "₹19,000",
    date: "2026-07-30",
    tier: 2,
    status: "ACTIVE",
    commitmentHash: "0x4e1a...c2",
  },
  {
    id: "10429",
    eventType: "RENT",
    label: "Rent",
    platform: "HomeRent",
    outcome: "ON_TIME",
    amount: "₹8,500",
    date: "2026-07-01",
    tier: 1,
    status: "ACTIVE",
    commitmentHash: "0x3d9b...e4",
  },
  {
    id: "10428",
    eventType: "RENT",
    label: "Rent",
    platform: "HomeRent",
    outcome: "ON_TIME",
    amount: "₹8,500",
    date: "2026-06-01",
    tier: 1,
    status: "ACTIVE",
    commitmentHash: "0x2f8a...a5",
  },
  {
    id: "10427",
    eventType: "GIG_PAYOUT",
    label: "Gig payout",
    platform: "SwiftDeliver Platform",
    outcome: "ON_TIME",
    amount: "₹26,000",
    date: "2026-06-28",
    tier: 2,
    status: "CHALLENGED",
    commitmentHash: "0x1e7c...b6",
  },
];

export const MOCK_CONSENTS = [
  {
    id: "c1",
    viewer: "MicroLend Finance",
    viewerAddress: "0xAbCd...1234",
    scopeTags: ["GIG_PAYOUT"],
    expiry: "2026-10-14",
    granted: "2026-10-07",
  },
];

export const MOCK_LOAN = {
  currentLimit: 3000,
  nextLimit: 6000,
  repaymentShare: 10,
  currency: "₹",
  cyclesCompleted: 2,
  cyclesForNextTier: 3,
  activeLoan: { amount: 3000, outstanding: 1800, nextRepayment: "₹240", nextDate: "2026-10-28" },
  explanation: "Based on 5 confirmed on-time payouts from SwiftDeliver Platform over 5 months, your current limit is ₹3,000. Complete 1 more clean cycle to unlock ₹6,000.",
};

export const MOCK_ATTESTERS = [
  {
    address: "0x7a1C...e9",
    name: "SwiftDeliver Platform",
    type: "PLATFORM",
    bond: "50 MON",
    reputation: 94,
    tier: 2,
    attestations: 1284,
    challengesLost: 1,
    active: true,
  },
  {
    address: "0x3b2D...f1",
    name: "HomeRent",
    type: "INSTITUTION",
    bond: "50 MON",
    reputation: 88,
    tier: 1,
    attestations: 342,
    challengesLost: 0,
    active: true,
  },
  {
    address: "0x9e4A...c2",
    name: "QuickBNPL",
    type: "INSTITUTION",
    bond: "75 MON",
    reputation: 71,
    tier: 2,
    attestations: 890,
    challengesLost: 3,
    active: true,
  },
  {
    address: "0x2c8B...d3",
    name: "SundarSACCO",
    type: "INDIVIDUAL",
    bond: "50 MON",
    reputation: 99,
    tier: 1,
    attestations: 56,
    challengesLost: 0,
    active: true,
  },
];

export const MOCK_CHALLENGES = [
  {
    id: "ch-01",
    attestationId: "10427",
    platform: "SwiftDeliver Platform",
    description: "Claimed on-time payout for Sept 2026 — platform records show payout was 11 days late",
    challenger: "0xAbCd...1234",
    challengerBond: "5 MON",
    windowEnds: "2026-10-09T18:00:00Z",
    status: "OPEN",
    subjectPseudonym: "0x5f2e...b1",
  },
];

export const MOCK_POOL = {
  totalDeposited: 500000,
  seniorTranche: 400000,
  firstLossTranche: 100000,
  totalLoaned: 87400,
  totalRepaid: 61200,
  defaultRate: 1.4,
  breakevenDefault: 16.7,
  reserveFund: 8900,
  apy: { senior: 8.5, firstLoss: 22.0 },
  currency: "₹",
};

export const MOCK_SCORE = {
  score: 742,
  onTimeRate: 83,
  attestationCount: 6,
  attesterDiversity: 2,
  tenureDays: 128,
  disputeCount: 0,
  minTier: 1,
  reasons: [
    "5 of 6 payments were on time (83% rate)",
    "2 independent attesters confirm your record",
    "128-day tenure across your history",
    "No open disputes on your record",
  ],
};

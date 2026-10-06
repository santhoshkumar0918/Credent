// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Slice 2 — challenge-lending-agent implements per prd/Credent-prd.md §9.
// DEMO ONLY, not core protocol: transparent score → originateLoan() →
// recordRepayment() writes a NEW attestation (pool is a registered attester).
contract MockLendingPool {}

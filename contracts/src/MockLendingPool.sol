// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AttesterRegistry} from "./AttesterRegistry.sol";
import {AttestationRegistry} from "./AttestationRegistry.sol";

/// @title MockLendingPool — DEMO ONLY, not core protocol. Never holds real funds.
/// @notice Closes the demo loop visibly: consented summary → transparent
/// on-chain score → demo loan in native MON → repayment writes a NEW
/// attestation with the pool itself as a bonded attester.
///
/// Trust boundaries (read before integrating):
/// - Score inputs are CALLER-SUPPLIED. The pool proves the SCORING is
///   deterministic and auditable, not that the inputs are true — input
///   truth comes from the disclosure layer (re-verified commitment hashes),
///   consumed off-chain before calling requestUnderwriting.
/// - Score + rationale ARE emitted on-chain (PRD §9: auditable by design).
///   This is an explicit demo transparency tradeoff, not the production
///   privacy posture.
/// - `LoanRepaid` emits (loanId, attestationId) ONLY. amount / onTime / salt
///   are deliberately NOT emitted — they travel off-chain to the borrower
///   for disclosure construction. Emitting them would publish the exact
///   values the commitment scheme exists to protect.
/// - Repayment salt mixes block.prevrandao so small-value commitments resist
///   brute force. Demo-grade randomness, documented as such.
/// - Origination is owner-only (the demo operator). No credit decision logic
///   beyond MIN_SCORE lives here — lenders plug their own models in production.
contract MockLendingPool is Ownable, ReentrancyGuard {
    struct Underwriting {
        uint256 score;
        uint256 timestamp;
    }

    struct Loan {
        bytes32 borrowerPseudonym;
        address borrower;
        uint256 amount;
        uint256 dueAt;
        bool repaid;
    }

    /// @notice Demo thresholds. Revisited before any real deployment.
    /// REHEARSAL GATE: MIN_SCORE is 0 so the full borrow→repay loop is
    /// exercisable on fresh testnet records (whose honest score is 0 until
    /// ~31 days of tenure). Production lenders set their own thresholds —
    /// this pool never decides real credit. Shown as "Rehearsal pool" in UI.
    uint256 public constant MIN_SCORE = 0;
    uint256 public constant UNDERWRITING_VALIDITY = 30 days;
    uint256 public constant LOAN_TERM = 30 days;

    AttesterRegistry public attesterRegistry;
    AttestationRegistry public attestationRegistry;

    mapping(bytes32 => Underwriting) public underwritings;
    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId;

    event UnderwritingRecorded(
        bytes32 indexed pseudonym,
        uint256 score,
        uint256 onTimeRateBps,
        uint256 tenureDays,
        uint256 distinctAttesters,
        uint256 totalAttestations
    );
    event LoanOriginated(
        uint256 indexed loanId, bytes32 indexed pseudonym, address borrower, uint256 amount, uint256 dueAt
    );
    event LoanRepaid(uint256 indexed loanId, uint256 indexed attestationId);
    event PoolFunded(address indexed funder, uint256 amount);

    error NoUnderwriting();
    error UnderwritingTooWeak();
    error UnderwritingStale();
    error InsufficientPoolFunds();
    error InvalidInput();
    error LoanNotFound();
    error AlreadyRepaid();
    error InsufficientRepayment();
    error TransferFailed();
    error ZeroAddress();

    constructor(address _attesterRegistry, address _attestationRegistry) Ownable(msg.sender) {
        if (_attesterRegistry == address(0) || _attestationRegistry == address(0)) revert ZeroAddress();
        attesterRegistry = AttesterRegistry(_attesterRegistry);
        attestationRegistry = AttestationRegistry(_attestationRegistry);
    }

    /// @notice Accept demo capital. Real money must NEVER enter this contract.
    function fund() external payable {
        emit PoolFunded(msg.sender, msg.value);
    }

    /// @notice Bond the pool itself as an attester (operator step, once).
    function registerAsAttester() external onlyOwner {
        attesterRegistry.register{value: attesterRegistry.MIN_BOND()}(
            AttesterRegistry.AttesterType.INSTITUTION
        );
    }

    /// @notice Deterministic demo scoring. Scale is roughly 0–100+:
    /// score = onTimeRateBps * log2(tenureDays + 1) * diversityBps / 1e7,
    /// where diversityBps = distinctAttesters * 10000 / totalAttestations.
    /// Anyone can recompute it — that recomputability IS the feature.
    function requestUnderwriting(
        bytes32 pseudonym,
        uint256 onTimeRateBps,
        uint256 tenureDays,
        uint256 distinctAttesters,
        uint256 totalAttestations
    ) external returns (uint256 score) {
        if (onTimeRateBps > 10000 || totalAttestations == 0 || distinctAttesters > totalAttestations) {
            revert InvalidInput();
        }
        uint256 tenure = _log2(tenureDays + 1);
        // Multiply-before-divide is INTENTIONAL: dividing first would truncate
        // small attester counts to zero and flatten the diversity signal.
        // forge-lint: disable-next-line(divide-before-multiply)
        uint256 diversityBps = (distinctAttesters * 10000) / totalAttestations;
        // Same intentional ordering as above: divide-first would collapse
        // every realistic score to zero.
        // forge-lint: disable-next-line(divide-before-multiply)
        score = (onTimeRateBps * tenure * diversityBps) / 1e7;
        underwritings[pseudonym] = Underwriting({score: score, timestamp: block.timestamp});
        emit UnderwritingRecorded(
            pseudonym, score, onTimeRateBps, tenureDays, distinctAttesters, totalAttestations
        );
    }

    function originateLoan(bytes32 pseudonym, address borrower, uint256 amount)
        external
        nonReentrant
        onlyOwner
        returns (uint256 loanId)
    {
        Underwriting storage u = underwritings[pseudonym];
        if (u.timestamp == 0) revert NoUnderwriting();
        // Day-scale validity; validator drift (~seconds) is immaterial.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > u.timestamp + UNDERWRITING_VALIDITY) revert UnderwritingStale();
        if (u.score < MIN_SCORE) revert UnderwritingTooWeak();
        if (borrower == address(0) || amount == 0) revert InvalidInput();
        if (address(this).balance < amount) revert InsufficientPoolFunds();
        loanId = nextLoanId++;
        uint256 dueAt = block.timestamp + LOAN_TERM;
        loans[loanId] = Loan({
            borrowerPseudonym: pseudonym,
            borrower: borrower,
            amount: amount,
            dueAt: dueAt,
            repaid: false
        });
        // Event before the payout call (revert-safe order).
        emit LoanOriginated(loanId, pseudonym, borrower, amount, dueAt);
        (bool ok,) = borrower.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Repay in full (demo: 1:1, no interest). Excess stays as pool treasury.
    function recordRepayment(uint256 loanId) external payable nonReentrant {
        if (loanId >= nextLoanId) revert LoanNotFound();
        Loan storage l = loans[loanId];
        if (l.repaid) revert AlreadyRepaid();
        if (msg.value < l.amount) revert InsufficientRepayment();
        // forge-lint: disable-next-line(block-timestamp)
        bool onTime = block.timestamp <= l.dueAt;
        l.repaid = true;
        uint256 ts = block.timestamp;
        // Demo-grade randomness (see contract NatSpec): prevrandao is
        // biasable by block producers, which is immaterial for demo salts
        // that only need to resist offline brute force of small amounts.
        // forge-lint: disable-next-line(weak-prng)
        bytes32 salt = keccak256(abi.encode(loanId, block.prevrandao, ts, l.borrowerPseudonym));
        bytes32 commitment = keccak256(
            abi.encode(
                l.borrowerPseudonym,
                uint8(AttestationRegistry.EventType.P2P_LOAN_REPAYMENT),
                l.amount,
                onTime,
                ts,
                salt
            )
        );
        uint256 attestationId = attestationRegistry.attest(
            l.borrowerPseudonym,
            AttestationRegistry.EventType.P2P_LOAN_REPAYMENT,
            commitment,
            bytes32(0) // No off-chain receipt for pool-written repayments; preimage travels off-chain.
        );
        // attest() touches only trusted registry contracts — no untrusted code
        // executes before this event.
        // forge-lint: disable-next-line(reentrancy-events)
        emit LoanRepaid(loanId, attestationId);
    }

    function _log2(uint256 x) internal pure returns (uint256 result) {
        while (x > 1) {
            x >>= 1;
            unchecked {
                ++result;
            }
        }
    }
}

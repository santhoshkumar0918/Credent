// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AttesterRegistry} from "./AttesterRegistry.sol";
import {AttestationRegistry} from "./AttestationRegistry.sol";
import {ConsentRegistry} from "./ConsentRegistry.sol";

/// @title ChallengeModule — accountability for attestations.
/// @notice Standing belongs to whoever RELIED on a disclosure and bears the
/// loss if it is false (typically the lender) — never the subject alone.
/// Opening a challenge requires (1) the challenger bond (spam deterrent),
/// (2) a live consent grant for the attestation's pseudonym (standing —
/// checked via ConsentRegistry.hasValidGrant), and (3) an open window:
/// 7 days from the attestation's timestamp. The disclosure time itself is
/// off-chain; the window runs from the on-chain write so it is fully
/// verifiable, and disclosures convey the timestamp so lenders know it.
///
/// Settlement: challenger wins → slash min(bond, CHALLENGER_BOND) straight
/// to the challenger + reputation cut + SLASHED; the challenger reclaims
/// their own bond via claim(). Attester wins → attestation cleared back to
/// ACTIVE + small reputation credit, and the forfeited challenger bond
/// compensates the attester via claim(). Demo values throughout (PRD §9).
/// Arbiter is a single address for the hackathon (interim — production path
/// is an oracle/arbitration network, roadmap not demo scope).
contract ChallengeModule is Ownable, ReentrancyGuard {
    enum ChallengeStatus {
        OPEN,
        ATTESTER_WON,
        CHALLENGER_WON
    }

    struct Challenge {
        uint256 attestationId;
        address challenger;
        uint256 challengerBond;
        bytes32 disclosureProofHash;
        bytes32 defenseEvidenceHash;
        uint256 windowEnds;
        ChallengeStatus status;
        bool claimed;
    }

    /// @notice Demo values from PRD §9. Revisited before any real deployment.
    uint256 public constant CHALLENGER_BOND = 5e18;
    uint256 public constant CHALLENGE_WINDOW = 7 days;
    int256 public constant REPUTATION_PENALTY = -10;
    int256 public constant REPUTATION_CREDIT = 2;

    AttestationRegistry public attestationRegistry;
    AttesterRegistry public attesterRegistry;
    ConsentRegistry public consentRegistry;
    address public arbiter;

    mapping(uint256 => Challenge) public challenges;
    uint256 public nextChallengeId;
    /// @notice One OPEN challenge per attestation at a time.
    mapping(uint256 => uint256) public openChallengeOf;

    event ChallengeOpened(
        uint256 indexed challengeId, uint256 indexed attestationId, address indexed challenger
    );
    event DefenseSubmitted(uint256 indexed challengeId, bytes32 evidenceHash);
    event ChallengeResolved(uint256 indexed challengeId, bool challengerWins);
    event ChallengeClaimed(uint256 indexed challengeId, address indexed winner, uint256 amount);
    event ArbiterSet(address indexed arbiter);

    error AttestationNotActive();
    error ChallengeAlreadyOpen();
    error ChallengeNotOpen();
    error ChallengeWindowClosed();
    error InsufficientChallengerBond();
    error NoValidGrant();
    error NotArbiter();
    error NotAttester();
    error NotWinner();
    error AlreadyClaimed();
    error TransferFailed();
    error ZeroAddress();

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert NotArbiter();
        _;
    }

    constructor(
        address _attestationRegistry,
        address _attesterRegistry,
        address _consentRegistry,
        address _arbiter
    ) Ownable(msg.sender) {
        if (
            _attestationRegistry == address(0) || _attesterRegistry == address(0)
                || _consentRegistry == address(0) || _arbiter == address(0)
        ) revert ZeroAddress();
        attestationRegistry = AttestationRegistry(_attestationRegistry);
        attesterRegistry = AttesterRegistry(_attesterRegistry);
        consentRegistry = ConsentRegistry(_consentRegistry);
        arbiter = _arbiter;
    }

    /// @notice Arbiter rotation (by the current arbiter). The deployer owns
    /// the contract but ownership confers NO resolution power.
    function setArbiter(address _arbiter) external onlyArbiter {
        if (_arbiter == address(0)) revert ZeroAddress();
        arbiter = _arbiter;
        emit ArbiterSet(_arbiter);
    }

    /// @notice Open a challenge. `disclosureProofHash` commits to the
    /// off-chain disclosure relied upon (audit trail — content stays off-chain).
    function openChallenge(uint256 attestationId, bytes32 disclosureProofHash)
        external
        nonReentrant
        payable
        returns (uint256 challengeId)
    {
        if (msg.value < CHALLENGER_BOND) revert InsufficientChallengerBond();
        AttestationRegistry.Attestation memory a = attestationRegistry.getAttestation(attestationId);
        // Most-specific errors first: already-open beats wrong-status.
        if (openChallengeOf[attestationId] != 0) revert ChallengeAlreadyOpen();
        if (a.status != AttestationRegistry.AttestationStatus.ACTIVE) revert AttestationNotActive();
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > a.timestamp + CHALLENGE_WINDOW) revert ChallengeWindowClosed();
        if (!consentRegistry.hasValidGrant(a.subjectPseudonym, msg.sender)) revert NoValidGrant();
        challengeId = ++nextChallengeId;
        challenges[challengeId] = Challenge({
            attestationId: attestationId,
            challenger: msg.sender,
            challengerBond: msg.value,
            disclosureProofHash: disclosureProofHash,
            defenseEvidenceHash: bytes32(0),
            windowEnds: a.timestamp + CHALLENGE_WINDOW,
            status: ChallengeStatus.OPEN,
            claimed: false
        });
        openChallengeOf[attestationId] = challengeId;
        // Emit before the external status mark: no event ever follows an
        // external call (revert rolls both back, so ordering is safe).
        emit ChallengeOpened(challengeId, attestationId, msg.sender);
        attestationRegistry.markChallenged(attestationId);
    }

    function submitDefense(uint256 challengeId, bytes32 evidenceHash) external {
        Challenge storage c = challenges[challengeId];
        if (c.status != ChallengeStatus.OPEN) revert ChallengeNotOpen();
        AttestationRegistry.Attestation memory a =
            attestationRegistry.getAttestation(c.attestationId);
        if (msg.sender != a.attester) revert NotAttester();
        c.defenseEvidenceHash = evidenceHash;
        emit DefenseSubmitted(challengeId, evidenceHash);
    }

    function resolve(uint256 challengeId, bool challengerWins) external nonReentrant onlyArbiter {
        Challenge storage c = challenges[challengeId];
        if (c.status != ChallengeStatus.OPEN) revert ChallengeNotOpen();
        AttestationRegistry.Attestation memory a =
            attestationRegistry.getAttestation(c.attestationId);
        delete openChallengeOf[c.attestationId];
        // Status + event first, external settlement after (revert-safe order).
        if (challengerWins) {
            c.status = ChallengeStatus.CHALLENGER_WON;
        } else {
            c.status = ChallengeStatus.ATTESTER_WON;
        }
        emit ChallengeResolved(challengeId, challengerWins);
        if (challengerWins) {
            attestationRegistry.markSlashed(c.attestationId);
            uint256 slashAmount = CHALLENGER_BOND;
            uint256 bond = attesterRegistry.getAttester(a.attester).bond;
            if (slashAmount > bond) slashAmount = bond;
            attesterRegistry.slash(a.attester, slashAmount, c.challenger);
            attesterRegistry.adjustReputation(a.attester, REPUTATION_PENALTY);
        } else {
            attestationRegistry.markActive(c.attestationId);
            attesterRegistry.adjustReputation(a.attester, REPUTATION_CREDIT);
        }
    }

    /// @notice Winner withdraws the challenger bond exactly once.
    /// Challenger win: original bond back (slash payout went direct).
    /// Attester win: forfeited bond compensates the attester.
    function claim(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];
        address winner = c.status == ChallengeStatus.CHALLENGER_WON
            ? c.challenger
            : c.status == ChallengeStatus.ATTESTER_WON
                ? attestationRegistry.getAttestation(c.attestationId).attester
                : address(0);
        if (winner == address(0) || msg.sender != winner) revert NotWinner();
        if (c.claimed) revert AlreadyClaimed();
        c.claimed = true;
        // Effects + event before the payout call (revert-safe order).
        emit ChallengeClaimed(challengeId, winner, c.challengerBond);
        (bool ok,) = winner.call{value: c.challengerBond}("");
        if (!ok) revert TransferFailed();
    }
}

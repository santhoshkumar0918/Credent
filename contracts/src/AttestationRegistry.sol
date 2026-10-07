// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {AttesterRegistry} from "./AttesterRegistry.sol";

/// @title AttestationRegistry — append-only store of payment commitments.
/// @notice Stores subjectPseudonym + commitmentHash + evidenceHash ONLY.
/// Raw amount / onTime / subject address must NEVER enter storage (rule 1).
/// Writes require an active, bonded attester — no backdoor paths.
contract AttestationRegistry is Ownable {
    /// @notice Order MUST match shared/src/types.ts EVENT_TYPE_INDEX.
    enum EventType {
        RENT,
        BNPL_INSTALLMENT,
        GIG_PAYOUT,
        P2P_LOAN_REPAYMENT,
        UTILITY_BILL
    }

    enum AttestationStatus {
        ACTIVE,
        CHALLENGED,
        SLASHED,
        DISPUTED_BY_SUBJECT
    }

    struct Attestation {
        uint256 id;
        address attester;
        bytes32 subjectPseudonym;
        EventType eventType;
        bytes32 commitmentHash;
        bytes32 evidenceHash;
        uint256 timestamp;
        AttestationStatus status;
    }

    AttesterRegistry public attesterRegistry;
    address public challengeModule;

    mapping(uint256 => Attestation) public attestations;
    uint256 public nextAttestationId;

    event AttestationWritten(
        uint256 indexed id,
        address indexed attester,
        bytes32 indexed subjectPseudonym,
        EventType eventType,
        bytes32 commitmentHash,
        bytes32 evidenceHash,
        uint256 timestamp
    );
    event AttestationStatusChanged(uint256 indexed id, AttestationStatus newStatus);
    event ChallengeModuleSet(address indexed challengeModule);

    error AttesterNotActive();
    error AttestationNotFound();
    error EmptyCommitment();
    error InvalidDisputeSignature();
    error NotPseudonymOwner();
    error OnlyChallengeModule();
    error ZeroAddress();

    modifier onlyChallengeModule() {
        if (msg.sender != challengeModule) revert OnlyChallengeModule();
        _;
    }

    constructor(address _attesterRegistry) Ownable(msg.sender) {
        if (_attesterRegistry == address(0)) revert ZeroAddress();
        attesterRegistry = AttesterRegistry(_attesterRegistry);
    }

    /// @notice One-time wiring by the deployer. Cannot write attestations.
    function setChallengeModule(address _challengeModule) external onlyOwner {
        if (_challengeModule == address(0)) revert ZeroAddress();
        challengeModule = _challengeModule;
        emit ChallengeModuleSet(_challengeModule);
    }

    function attest(
        bytes32 subjectPseudonym,
        EventType eventType,
        bytes32 commitmentHash,
        bytes32 evidenceHash
    ) external returns (uint256 id) {
        if (!attesterRegistry.isActiveAttester(msg.sender)) revert AttesterNotActive();
        if (subjectPseudonym == bytes32(0) || commitmentHash == bytes32(0)) revert EmptyCommitment();
        id = nextAttestationId++;
        attestations[id] = Attestation({
            id: id,
            attester: msg.sender,
            subjectPseudonym: subjectPseudonym,
            eventType: eventType,
            commitmentHash: commitmentHash,
            evidenceHash: evidenceHash,
            timestamp: block.timestamp,
            status: AttestationStatus.ACTIVE
        });
        // Emit BEFORE the external count note: no event ever follows an
        // external call (revert rolls both back, so ordering is safe).
        emit AttestationWritten(
            id, msg.sender, subjectPseudonym, eventType, commitmentHash, evidenceHash, block.timestamp
        );
        attesterRegistry.noteAttestation(msg.sender);
    }

    function markChallenged(uint256 id) external onlyChallengeModule {
        if (id >= nextAttestationId) revert AttestationNotFound();
        attestations[id].status = AttestationStatus.CHALLENGED;
        emit AttestationStatusChanged(id, AttestationStatus.CHALLENGED);
    }

    function markSlashed(uint256 id) external onlyChallengeModule {
        if (id >= nextAttestationId) revert AttestationNotFound();
        attestations[id].status = AttestationStatus.SLASHED;
        emit AttestationStatusChanged(id, AttestationStatus.SLASHED);
    }

    /// @notice The subject's own flag path: someone attested against MY pseudonym
    /// and it is false. Signs EIP-191 personal-sign over
    /// keccak256("VOUCHAIN_DISPUTE:", chainid, this, attestationId).
    /// Ownership is proven the same way as grants: the recovered signer must
    /// satisfy keccak256(abi.encode(signer, attester)) == subjectPseudonym —
    /// otherwise anyone could grief any attestation into DISPUTED_BY_SUBJECT
    /// and censor it from underwriting.
    /// @dev PRD §9 types the signature param as bytes32, which cannot hold a
    /// 65-byte ECDSA signature — implemented as `bytes calldata`, and the
    /// `attester` param is added for the ownership proof. Both divergences
    /// documented, not silent.
    /// This path NEVER slashes; it only marks. Slashing needs a relying-party
    /// challenge via the ChallengeModule (slice 2).
    function markDisputedBySubject(uint256 id, address attester, bytes calldata subjectSignature)
        external
    {
        if (id >= nextAttestationId) revert AttestationNotFound();
        Attestation storage a = attestations[id];
        bytes32 message =
            keccak256(abi.encodePacked("VOUCHAIN_DISPUTE:", block.chainid, address(this), id));
        if (subjectSignature.length != 65) revert InvalidDisputeSignature();
        address signer =
            ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(message), subjectSignature);
        if (signer == address(0)) revert InvalidDisputeSignature();
        if (keccak256(abi.encode(signer, attester)) != a.subjectPseudonym) revert NotPseudonymOwner();
        a.status = AttestationStatus.DISPUTED_BY_SUBJECT;
        // Same as elsewhere: internal-library recovery only, no external call.
        // forge-lint: disable-next-line(reentrancy-events)
        emit AttestationStatusChanged(id, AttestationStatus.DISPUTED_BY_SUBJECT);
    }

    function getAttestation(uint256 id) external view returns (Attestation memory) {
        if (id >= nextAttestationId) revert AttestationNotFound();
        return attestations[id];
    }
}

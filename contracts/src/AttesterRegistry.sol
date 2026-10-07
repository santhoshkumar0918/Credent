// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AttesterRegistry — bonded, permissionless attester set.
/// @notice Registration requires MIN_BOND in native MON (payable, per PRD §9).
/// Reputation moves ONLY on challenge outcomes, never on attestation volume.
/// `slash` / `adjustReputation` are callable ONLY by the ChallengeModule.
/// The owner can ONLY wire module addresses — never attest, slash, or bypass bonds.
contract AttesterRegistry is Ownable {
    enum AttesterType {
        PLATFORM,
        INDIVIDUAL,
        INSTITUTION
    }

    struct Attester {
        address addr;
        AttesterType attesterType;
        uint256 bond;
        int256 reputationScore;
        uint256 attestationCount;
        uint256 challengesLost;
        bool active;
    }

    /// @notice Demo value from PRD §9. Revisited before any real deployment.
    uint256 public constant MIN_BOND = 50e18;

    address public challengeModule;
    address public attestationRegistry;

    mapping(address => Attester) public attesters;

    event AttesterRegistered(address indexed attester, AttesterType attesterType, uint256 bond);
    event AttesterSlashed(address indexed attester, uint256 amount, address indexed recipient);
    event AttesterReputationChanged(address indexed attester, int256 newScore);
    event BondToppedUp(address indexed attester, uint256 amount);
    event ChallengeModuleSet(address indexed challengeModule);
    event AttestationRegistrySet(address indexed attestationRegistry);

    error AlreadyRegistered();
    error InsufficientBond();
    error NotRegistered();
    error OnlyAttestationRegistry();
    error OnlyChallengeModule();
    error TransferFailed();
    error ZeroAddress();

    modifier onlyChallengeModule() {
        if (msg.sender != challengeModule) revert OnlyChallengeModule();
        _;
    }

    constructor() Ownable(msg.sender) {}

    /// @notice One-time wiring by the deployer. Cannot move funds or reputation.
    function setChallengeModule(address _challengeModule) external onlyOwner {
        if (_challengeModule == address(0)) revert ZeroAddress();
        challengeModule = _challengeModule;
        emit ChallengeModuleSet(_challengeModule);
    }

    /// @notice One-time wiring by the deployer. Cannot move funds or reputation.
    function setAttestationRegistry(address _attestationRegistry) external onlyOwner {
        if (_attestationRegistry == address(0)) revert ZeroAddress();
        attestationRegistry = _attestationRegistry;
        emit AttestationRegistrySet(_attestationRegistry);
    }

    function register(AttesterType attesterType) external payable {
        if (attesters[msg.sender].addr != address(0)) revert AlreadyRegistered();
        if (msg.value < MIN_BOND) revert InsufficientBond();
        attesters[msg.sender] = Attester({
            addr: msg.sender,
            attesterType: attesterType,
            bond: msg.value,
            reputationScore: 0,
            attestationCount: 0,
            challengesLost: 0,
            active: true
        });
        emit AttesterRegistered(msg.sender, attesterType, msg.value);
    }

    /// @notice Restore a slashed-but-registered attester. Reactivates at MIN_BOND.
    function topUpBond() external payable {
        Attester storage a = attesters[msg.sender];
        if (a.addr == address(0)) revert NotRegistered();
        a.bond += msg.value;
        if (!a.active && a.bond >= MIN_BOND) a.active = true;
        emit BondToppedUp(msg.sender, msg.value);
    }

    /// @notice Seize up to `amount` from the bond, pay the winning challenger.
    /// Deactivates below MIN_BOND. Reentrancy-safe: state first, payout last.
    function slash(address attester, uint256 amount, address recipient) external onlyChallengeModule {
        if (attester == address(0) || recipient == address(0)) revert ZeroAddress();
        Attester storage a = attesters[attester];
        if (a.addr == address(0)) revert NotRegistered();
        uint256 seized = amount > a.bond ? a.bond : amount;
        a.bond -= seized;
        a.challengesLost += 1;
        if (a.bond < MIN_BOND) a.active = false;
        emit AttesterSlashed(attester, seized, recipient);
        (bool ok,) = recipient.call{value: seized}("");
        if (!ok) revert TransferFailed();
    }

    function adjustReputation(address attester, int256 delta) external onlyChallengeModule {
        Attester storage a = attesters[attester];
        if (a.addr == address(0)) revert NotRegistered();
        a.reputationScore += delta;
        emit AttesterReputationChanged(attester, a.reputationScore);
    }

    /// @notice Called by AttestationRegistry on every write. Keeps the public
    /// attestationCount honest without trusting the indexer.
    function noteAttestation(address attester) external {
        if (msg.sender != attestationRegistry) revert OnlyAttestationRegistry();
        Attester storage a = attesters[attester];
        if (a.addr == address(0)) revert NotRegistered();
        a.attestationCount += 1;
    }

    function isActiveAttester(address attester) external view returns (bool) {
        return attesters[attester].active;
    }

    function getAttester(address attester) external view returns (Attester memory) {
        return attesters[attester];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";
import {ChallengeModule} from "../src/ChallengeModule.sol";

/// @notice Ticket 01 tests — standing, window, both settlement paths, claim.
contract ChallengeModuleTest is Test {
    AttesterRegistry attesterRegistry;
    AttestationRegistry attestationRegistry;
    ConsentRegistry consentRegistry;
    ChallengeModule challengeModule;

    address attester = makeAddr("attester");
    address lender = makeAddr("lender");
    address arbiter = makeAddr("arbiter");
    address subject;
    uint256 subjectKey;
    bytes32 PSEUDO;

    bytes32 constant COMMIT = keccak256("commitment-preimage");
    bytes32 constant EVIDENCE = keccak256("ipfs-cid");
    bytes32 constant PROOF = keccak256("disclosure-proof");

    bytes32 constant GRANT_TYPEHASH = keccak256(
        "ConsentGrant(bytes32 subjectPseudonym,address viewer,address attester,bytes32[] scopeTags,uint256 expiry)"
    );

    function setUp() public {
        attesterRegistry = new AttesterRegistry();
        attestationRegistry = new AttestationRegistry(address(attesterRegistry));
        consentRegistry = new ConsentRegistry();
        challengeModule = new ChallengeModule(
            address(attestationRegistry), address(attesterRegistry), address(consentRegistry), arbiter
        );
        attesterRegistry.setAttestationRegistry(address(attestationRegistry));
        attesterRegistry.setChallengeModule(address(challengeModule));
        attestationRegistry.setChallengeModule(address(challengeModule));
        vm.deal(attester, 100e18);
        vm.deal(lender, 100e18);
        vm.prank(attester);
        attesterRegistry.register{value: 50e18}(AttesterRegistry.AttesterType.PLATFORM);
        (subject, subjectKey) = makeAddrAndKey("subject");
        PSEUDO = keccak256(abi.encode(subject, attester));
    }

    /// @dev Attest once, grant the lender, return the attestation id.
    function _attestAndGrant() internal returns (uint256 id) {
        vm.prank(attester);
        id = attestationRegistry.attest(
            PSEUDO, AttestationRegistry.EventType.GIG_PAYOUT, COMMIT, EVIDENCE
        );
        bytes32[] memory scopes = new bytes32[](1);
        scopes[0] = keccak256("GIG_PAYOUT");
        uint256 expiry = block.timestamp + 30 days;
        consentRegistry.grantAccess(
            PSEUDO, lender, attester, scopes, expiry, _grantSig(scopes, expiry)
        );
    }

    function _separator() internal view returns (bytes32) {
        (, string memory name, string memory version, uint256 chainId, address vc,,) =
            consentRegistry.eip712Domain();
        return keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                vc
            )
        );
    }

    function _grantSig(bytes32[] memory scopes, uint256 expiry) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(GRANT_TYPEHASH, PSEUDO, lender, attester, keccak256(abi.encodePacked(scopes)), expiry)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _separator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(subjectKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_ChallengerWinsFullFlow() public {
        uint256 id = _attestAndGrant();
        vm.prank(lender);
        uint256 cid = challengeModule.openChallenge{value: 5e18}(id, PROOF);
        assertEq(
            uint8(attestationRegistry.getAttestation(id).status),
            uint8(AttestationRegistry.AttestationStatus.CHALLENGED)
        );
        vm.prank(attester);
        challengeModule.submitDefense(cid, EVIDENCE);
        uint256 lenderBefore = lender.balance;
        vm.prank(arbiter);
        challengeModule.resolve(cid, true);
        // Slash: min(50, 5) = 5 straight to challenger; reputation cut; SLASHED.
        assertEq(attesterRegistry.getAttester(attester).bond, 45e18);
        assertEq(attesterRegistry.getAttester(attester).reputationScore, -10);
        assertEq(
            uint8(attestationRegistry.getAttestation(id).status),
            uint8(AttestationRegistry.AttestationStatus.SLASHED)
        );
        assertEq(lender.balance - lenderBefore, 5e18);
        // Bond 45 < MIN_BOND 50 → deactivated.
        assertFalse(attesterRegistry.isActiveAttester(attester));
        // Claim: original bond back, exactly once.
        vm.prank(lender);
        challengeModule.claim(cid);
        assertEq(lender.balance - lenderBefore, 10e18);
        vm.prank(lender);
        vm.expectRevert(ChallengeModule.AlreadyClaimed.selector);
        challengeModule.claim(cid);
    }

    function test_AttesterWinsClearsAndCompensates() public {
        uint256 id = _attestAndGrant();
        vm.prank(lender);
        uint256 cid = challengeModule.openChallenge{value: 5e18}(id, PROOF);
        vm.prank(arbiter);
        challengeModule.resolve(cid, false);
        // Cleared to ACTIVE, reputation credit, attester claims forfeited bond.
        assertEq(
            uint8(attestationRegistry.getAttestation(id).status),
            uint8(AttestationRegistry.AttestationStatus.ACTIVE)
        );
        assertEq(attesterRegistry.getAttester(attester).reputationScore, 2);
        uint256 attesterBefore = attester.balance;
        vm.prank(attester);
        challengeModule.claim(cid);
        assertEq(attester.balance - attesterBefore, 5e18);
    }

    function test_OpenWithoutGrantReverts() public {
        vm.prank(attester);
        uint256 id = attestationRegistry.attest(
            PSEUDO, AttestationRegistry.EventType.GIG_PAYOUT, COMMIT, EVIDENCE
        );
        address grantless = makeAddr("grantless");
        vm.deal(grantless, 10e18);
        vm.prank(grantless);
        vm.expectRevert(ChallengeModule.NoValidGrant.selector);
        challengeModule.openChallenge{value: 5e18}(id, PROOF);
    }

    function test_OpenWithoutBondReverts() public {
        uint256 id = _attestAndGrant();
        vm.prank(lender);
        vm.expectRevert(ChallengeModule.InsufficientChallengerBond.selector);
        challengeModule.openChallenge{value: 1e18}(id, PROOF);
    }

    function test_OpenAfterWindowReverts() public {
        uint256 id = _attestAndGrant();
        vm.warp(block.timestamp + 8 days);
        vm.prank(lender);
        vm.expectRevert(ChallengeModule.ChallengeWindowClosed.selector);
        challengeModule.openChallenge{value: 5e18}(id, PROOF);
    }

    function test_OpenNonexistentReverts() public {
        vm.prank(lender);
        vm.expectRevert(AttestationRegistry.AttestationNotFound.selector);
        challengeModule.openChallenge{value: 5e18}(999, PROOF);
    }

    function test_DoubleOpenReverts() public {
        uint256 id = _attestAndGrant();
        vm.prank(lender);
        challengeModule.openChallenge{value: 5e18}(id, PROOF);
        vm.prank(lender);
        vm.expectRevert(ChallengeModule.ChallengeAlreadyOpen.selector);
        challengeModule.openChallenge{value: 5e18}(id, PROOF);
    }

    function test_DefenseOnlyAttester() public {
        uint256 id = _attestAndGrant();
        vm.prank(lender);
        uint256 cid = challengeModule.openChallenge{value: 5e18}(id, PROOF);
        vm.prank(lender);
        vm.expectRevert(ChallengeModule.NotAttester.selector);
        challengeModule.submitDefense(cid, EVIDENCE);
    }

    function test_ResolveOnlyArbiter() public {
        uint256 id = _attestAndGrant();
        vm.prank(lender);
        uint256 cid = challengeModule.openChallenge{value: 5e18}(id, PROOF);
        vm.prank(lender);
        vm.expectRevert(ChallengeModule.NotArbiter.selector);
        challengeModule.resolve(cid, true);
    }

    function test_ClaimOnlyWinner() public {
        uint256 id = _attestAndGrant();
        vm.prank(lender);
        uint256 cid = challengeModule.openChallenge{value: 5e18}(id, PROOF);
        vm.prank(arbiter);
        challengeModule.resolve(cid, true);
        vm.prank(attester);
        vm.expectRevert(ChallengeModule.NotWinner.selector);
        challengeModule.claim(cid);
    }
}

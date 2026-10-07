// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";

/// @notice Slice 1 tests — commitment storage, attester gating, status machine.
/// This contract plays BOTH the attestation registry (for noteAttestation)
/// and the ChallengeModule (for mark* paths).
contract AttestationRegistryTest is Test {
    AttesterRegistry attesterRegistry;
    AttestationRegistry attestationRegistry;
    address attester = makeAddr("attester");
    address outsider = makeAddr("outsider");

    bytes32 constant PSEUDO = keccak256("subject-relationship-1");
    bytes32 constant COMMIT = keccak256("commitment-preimage");
    bytes32 constant EVIDENCE = keccak256("ipfs-cid");

    function setUp() public {
        attesterRegistry = new AttesterRegistry();
        attestationRegistry = new AttestationRegistry(address(attesterRegistry));
        attesterRegistry.setAttestationRegistry(address(attestationRegistry));
        attesterRegistry.setChallengeModule(address(this));
        attestationRegistry.setChallengeModule(address(this));
        vm.deal(attester, 100e18);
        vm.prank(attester);
        attesterRegistry.register{value: 50e18}(AttesterRegistry.AttesterType.PLATFORM);
    }

    function test_AttestStoresCommitmentOnly() public {
        vm.prank(attester);
        uint256 id = attestationRegistry.attest(
            PSEUDO, AttestationRegistry.EventType.GIG_PAYOUT, COMMIT, EVIDENCE
        );
        assertEq(id, 0);
        AttestationRegistry.Attestation memory a = attestationRegistry.getAttestation(0);
        assertEq(a.attester, attester);
        assertEq(a.subjectPseudonym, PSEUDO);
        assertEq(uint8(a.eventType), uint8(AttestationRegistry.EventType.GIG_PAYOUT));
        // Storage round-trips the commitment verbatim. The canonical-encoding
        // cross-check (shared/commitments.ts shape) lives in the next test.
        assertEq(a.commitmentHash, COMMIT);
        assertEq(a.evidenceHash, EVIDENCE);
        assertEq(uint8(a.status), uint8(AttestationRegistry.AttestationStatus.ACTIVE));
        assertEq(attesterRegistry.getAttester(attester).attestationCount, 1);
    }

    function test_AttestMatchesCanonicalEncoding() public {
        // The exact preimage shape both layers must agree on.
        bytes32 pseudo = keccak256("rel-9");
        uint256 amount = 4250;
        bool onTime = true;
        uint256 ts = 1760000000;
        bytes32 salt = keccak256("salt-9");
        bytes32 expected =
            keccak256(abi.encode(pseudo, uint8(AttestationRegistry.EventType.RENT), amount, onTime, ts, salt));
        vm.prank(attester);
        uint256 id = attestationRegistry.attest(
            pseudo, AttestationRegistry.EventType.RENT, expected, EVIDENCE
        );
        assertEq(attestationRegistry.getAttestation(id).commitmentHash, expected);
    }

    function test_AttestUnbondedReverts() public {
        vm.prank(outsider);
        vm.expectRevert(AttestationRegistry.AttesterNotActive.selector);
        attestationRegistry.attest(PSEUDO, AttestationRegistry.EventType.RENT, COMMIT, EVIDENCE);
    }

    function test_AttestZeroCommitmentReverts() public {
        vm.prank(attester);
        vm.expectRevert(AttestationRegistry.EmptyCommitment.selector);
        attestationRegistry.attest(PSEUDO, AttestationRegistry.EventType.RENT, bytes32(0), EVIDENCE);
    }

    function test_MarkChallengedAndSlashed() public {
        vm.prank(attester);
        uint256 id = attestationRegistry.attest(
            PSEUDO, AttestationRegistry.EventType.RENT, COMMIT, EVIDENCE
        );
        attestationRegistry.markChallenged(id);
        assertEq(
            uint8(attestationRegistry.getAttestation(id).status),
            uint8(AttestationRegistry.AttestationStatus.CHALLENGED)
        );
        attestationRegistry.markSlashed(id);
        assertEq(
            uint8(attestationRegistry.getAttestation(id).status),
            uint8(AttestationRegistry.AttestationStatus.SLASHED)
        );
    }

    function test_MarkOnlyChallengeModule() public {
        vm.prank(attester);
        uint256 id = attestationRegistry.attest(
            PSEUDO, AttestationRegistry.EventType.RENT, COMMIT, EVIDENCE
        );
        vm.prank(outsider);
        vm.expectRevert(AttestationRegistry.OnlyChallengeModule.selector);
        attestationRegistry.markChallenged(id);
    }

    function test_DisputedBySubjectMarksWithoutSlashing() public {
        (address subject, uint256 key) = makeAddrAndKey("subject");
        bytes32 pseudo = keccak256(abi.encode(subject, attester));
        vm.prank(attester);
        uint256 id = attestationRegistry.attest(
            pseudo, AttestationRegistry.EventType.RENT, COMMIT, EVIDENCE
        );
        bytes32 message = keccak256(
            abi.encodePacked("VOUCHAIN_DISPUTE:", block.chainid, address(attestationRegistry), id)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        attestationRegistry.markDisputedBySubject(id, attester, abi.encodePacked(r, s, v));
        assertEq(
            uint8(attestationRegistry.getAttestation(id).status),
            uint8(AttestationRegistry.AttestationStatus.DISPUTED_BY_SUBJECT)
        );
        // Bond untouched — this path marks, never slashes.
        assertEq(attesterRegistry.getAttester(attester).bond, 50e18);
    }

    function test_DisputeStrangerReverts() public {
        // Griefing check: a stranger's valid signature does NOT derive the
        // pseudonym, so the dispute is rejected and the record stands.
        (address subject, uint256 key) = makeAddrAndKey("subject");
        bytes32 pseudo = keccak256(abi.encode(subject, attester));
        vm.prank(attester);
        uint256 id = attestationRegistry.attest(
            pseudo, AttestationRegistry.EventType.RENT, COMMIT, EVIDENCE
        );
        (, uint256 strangerKey) = makeAddrAndKey("stranger");
        bytes32 message = keccak256(
            abi.encodePacked("VOUCHAIN_DISPUTE:", block.chainid, address(attestationRegistry), id)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(strangerKey, digest);
        vm.expectRevert(AttestationRegistry.NotPseudonymOwner.selector);
        attestationRegistry.markDisputedBySubject(id, attester, abi.encodePacked(r, s, v));
        assertEq(
            uint8(attestationRegistry.getAttestation(id).status),
            uint8(AttestationRegistry.AttestationStatus.ACTIVE)
        );
        key;
    }

    function test_DisputeShortSigReverts() public {
        vm.prank(attester);
        uint256 id = attestationRegistry.attest(
            PSEUDO, AttestationRegistry.EventType.RENT, COMMIT, EVIDENCE
        );
        vm.expectRevert(AttestationRegistry.InvalidDisputeSignature.selector);
        attestationRegistry.markDisputedBySubject(id, attester, hex"1234");
    }

    function test_GetNonexistentReverts() public {
        vm.expectRevert(AttestationRegistry.AttestationNotFound.selector);
        attestationRegistry.getAttestation(999);
    }
}

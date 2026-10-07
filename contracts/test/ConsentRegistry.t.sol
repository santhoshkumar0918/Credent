// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";

/// @notice Slice 1 tests — EIP-712 grants, scopes, expiry, revocation.
/// Mirrors shared/src/eip712.ts: domain ("VouchainConsent", "1") + typehashes.
/// Pseudonym binding: PSEUDO = keccak256(abi.encode(subject, attester)) —
/// only the subject key the pseudonym derives from can grant.
contract ConsentRegistryTest is Test {
    ConsentRegistry consent;

    bytes32 constant GIG = keccak256("GIG_PAYOUT");
    bytes32 constant RENT = keccak256("RENT");
    bytes32 constant P2P = keccak256("P2P_LOAN_REPAYMENT");

    bytes32 constant GRANT_TYPEHASH = keccak256(
        "ConsentGrant(bytes32 subjectPseudonym,address viewer,address attester,bytes32[] scopeTags,uint256 expiry)"
    );
    bytes32 constant REVOKE_TYPEHASH = keccak256("ConsentRevoke(bytes32 subjectPseudonym,address viewer)");

    address viewer = makeAddr("lender");
    address attester = makeAddr("attester");
    address subject;
    uint256 subjectKey;
    bytes32 PSEUDO;

    function setUp() public {
        consent = new ConsentRegistry();
        (subject, subjectKey) = makeAddrAndKey("subject");
        PSEUDO = keccak256(abi.encode(subject, attester));
    }

    function _separator() internal view returns (bytes32) {
        (, string memory name, string memory version, uint256 chainId, address verifyingContract,,) =
            consent.eip712Domain();
        return keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );
    }

    function _signGrant(bytes32 pseudo, address v, bytes32[] memory scopes, uint256 expiry)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(
            abi.encode(GRANT_TYPEHASH, pseudo, v, attester, keccak256(abi.encodePacked(scopes)), expiry)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _separator(), structHash));
        (uint8 vv, bytes32 r, bytes32 s) = vm.sign(subjectKey, digest);
        return abi.encodePacked(r, s, vv);
    }

    function _signRevoke(bytes32 pseudo, address v, uint256 key) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(REVOKE_TYPEHASH, pseudo, v));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _separator(), structHash));
        (uint8 vv, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, vv);
    }

    function _scopes() internal pure returns (bytes32[] memory) {
        bytes32[] memory scopes = new bytes32[](2);
        scopes[0] = GIG;
        scopes[1] = RENT;
        return scopes;
    }

    function _grant() internal {
        bytes memory sig = _signGrant(PSEUDO, viewer, _scopes(), block.timestamp + 30 days);
        consent.grantAccess(PSEUDO, viewer, attester, _scopes(), block.timestamp + 30 days, sig);
    }

    function test_GrantAuthorizesScopeOnly() public {
        _grant();
        assertTrue(consent.isAuthorized(PSEUDO, viewer, GIG));
        assertTrue(consent.isAuthorized(PSEUDO, viewer, RENT));
        assertFalse(consent.isAuthorized(PSEUDO, viewer, P2P));
        assertFalse(consent.isAuthorized(PSEUDO, makeAddr("other-lender"), GIG));
    }

    function test_GrantEmptyScopeReverts() public {
        bytes32[] memory empty = new bytes32[](0);
        bytes memory sig = _signGrant(PSEUDO, viewer, empty, block.timestamp + 1 days);
        vm.expectRevert(ConsentRegistry.EmptyScope.selector);
        consent.grantAccess(PSEUDO, viewer, attester, empty, block.timestamp + 1 days, sig);
    }

    function test_GrantExpiredReverts() public {
        bytes memory sig = _signGrant(PSEUDO, viewer, _scopes(), block.timestamp - 1);
        vm.expectRevert(ConsentRegistry.GrantExpired.selector);
        consent.grantAccess(PSEUDO, viewer, attester, _scopes(), block.timestamp - 1, sig);
    }

    function test_GrantWrongAttesterReverts() public {
        // Signed for attester A, submitted for attester B: ownership fails.
        bytes memory sig = _signGrant(PSEUDO, viewer, _scopes(), block.timestamp + 30 days);
        vm.expectRevert(ConsentRegistry.NotPseudonymOwner.selector);
        consent.grantAccess(PSEUDO, viewer, makeAddr("other-attester"), _scopes(), block.timestamp + 30 days, sig);
    }

    function test_GrantTamperedFieldsReverts() public {
        // Signed for 30-day expiry, submitted as 90-day: the recovered key
        // no longer derives PSEUDO, so ownership — not just integrity — fails.
        bytes memory sig = _signGrant(PSEUDO, viewer, _scopes(), block.timestamp + 30 days);
        vm.expectRevert(ConsentRegistry.NotPseudonymOwner.selector);
        consent.grantAccess(PSEUDO, viewer, attester, _scopes(), block.timestamp + 90 days, sig);
    }

    function test_StrangerCannotGrantForPseudonym() public {
        // Anyone's own valid signature over PSEUDO recovers themselves —
        // and themselves do not derive PSEUDO. This is the forgeability
        // test the binding exists to defeat.
        (, uint256 strangerKey) = makeAddrAndKey("stranger");
        bytes32 structHash = keccak256(
            abi.encode(
                GRANT_TYPEHASH,
                PSEUDO,
                viewer,
                attester,
                keccak256(abi.encodePacked(_scopes())),
                block.timestamp + 30 days
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _separator(), structHash));
        (uint8 vv, bytes32 r, bytes32 s) = vm.sign(strangerKey, digest);
        vm.expectRevert(ConsentRegistry.NotPseudonymOwner.selector);
        consent.grantAccess(
            PSEUDO, viewer, attester, _scopes(), block.timestamp + 30 days, abi.encodePacked(r, s, vv)
        );
    }

    function test_ExpiryEndsAuthorization() public {
        _grant();
        assertTrue(consent.isAuthorized(PSEUDO, viewer, GIG));
        vm.warp(block.timestamp + 31 days);
        assertFalse(consent.isAuthorized(PSEUDO, viewer, GIG));
    }

    function test_RevokeFlow() public {
        _grant();
        assertTrue(consent.isAuthorized(PSEUDO, viewer, GIG));
        bytes memory rsig = _signRevoke(PSEUDO, viewer, subjectKey);
        consent.revokeAccess(PSEUDO, viewer, rsig);
        assertFalse(consent.isAuthorized(PSEUDO, viewer, GIG));
    }

    function test_RevokeWrongSignerReverts() public {
        _grant();
        (, uint256 attackerKey) = makeAddrAndKey("attacker");
        bytes memory rsig = _signRevoke(PSEUDO, viewer, attackerKey);
        vm.expectRevert(ConsentRegistry.NotGrantSigner.selector);
        consent.revokeAccess(PSEUDO, viewer, rsig);
    }

    function test_RevokeNoGrantReverts() public {
        bytes memory rsig = _signRevoke(PSEUDO, viewer, subjectKey);
        vm.expectRevert(ConsentRegistry.NoGrant.selector);
        consent.revokeAccess(PSEUDO, viewer, rsig);
    }

    function test_RelayedGrantSucceeds() public {
        // Anyone (sponsor/paymaster) may submit; the SUBJECT's signature authorizes.
        bytes memory sig = _signGrant(PSEUDO, viewer, _scopes(), block.timestamp + 30 days);
        vm.prank(makeAddr("relayer"));
        consent.grantAccess(PSEUDO, viewer, attester, _scopes(), block.timestamp + 30 days, sig);
        assertTrue(consent.isAuthorized(PSEUDO, viewer, GIG));
    }
}

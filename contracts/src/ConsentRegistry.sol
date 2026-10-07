// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title ConsentRegistry — scoped, expiring, revocable disclosure grants.
/// @notice Grants are EIP-712 signed by the subject and relayable (sponsor/
/// paymaster submits; subject never pays gas). Scopes are keccak256(eventType)
/// values — per-type, never all-or-nothing. Revocation stops NEW disclosures
/// immediately; already-delivered ones are not retroactively erased.
///
/// PSEUDONYM BINDING (load-bearing): a subject pseudonym is defined as
///   keccak256(abi.encode(subjectAddress, attesterAddress))
/// — per (subject, attester) relationship, unlinkable across attesters.
/// grantAccess recomputes this from the recovered signer and the declared
/// attester and reverts unless it equals the grant's subjectPseudonym.
/// Without this check ANYONE could self-sign a grant for ANYONE's pseudonym
/// (a valid signature over altered fields simply recovers a different key),
/// so the check is what makes "the subject's signature" actually the
/// subject's. The attester is part of the signed struct to prevent
/// cross-attester replay of a subject's grant.
/// @dev Domain ("VouchainConsent", "1") MUST match shared/src/eip712.ts.
/// The recovered grant signer is stored so lenders can check signer
/// consistency across grants and co-signed disclosures.
contract ConsentRegistry is EIP712 {
    struct Consent {
        bytes32[] scopeTags;
        uint256 expiry;
        bool revoked;
        address grantSigner;
    }

    bytes32 private constant GRANT_TYPEHASH = keccak256(
        "ConsentGrant(bytes32 subjectPseudonym,address viewer,address attester,bytes32[] scopeTags,uint256 expiry,uint256 nonce)"
    );
    bytes32 private constant REVOKE_TYPEHASH =
        keccak256("ConsentRevoke(bytes32 subjectPseudonym,address viewer)");

    mapping(bytes32 => mapping(address => Consent)) public consents;
    /// @notice Replay guard: each grant must carry the exact next nonce for
    /// its (pseudonym, viewer) pair. Without this, anyone could replay a
    /// subject's old grant transaction and silently un-revoke it
    /// (signatures are public once submitted). Adopted from the
    /// INTERFACES.md review — the one idea from that doc that fixed a real
    /// hole here.
    mapping(bytes32 => mapping(address => uint256)) public nonces;

    event AccessGranted(
        bytes32 indexed subjectPseudonym, address indexed viewer, address indexed attester, uint256 expiry
    );
    event AccessRevoked(bytes32 indexed subjectPseudonym, address indexed viewer);

    error EmptyScope();
    error GrantExpired();
    error InvalidSignature();
    error NoGrant();
    error NotGrantSigner();
    error NotPseudonymOwner();
    error StaleNonce();

    constructor() EIP712("VouchainConsent", "1") {}

    function grantAccess(
        bytes32 subjectPseudonym,
        address viewer,
        address attester,
        bytes32[] calldata scopeTags,
        uint256 expiry,
        uint256 nonce,
        bytes calldata subjectSignature
    ) external {
        if (scopeTags.length == 0) revert EmptyScope();
        // Grant expiries are day-scale; validator timestamp drift (~seconds) is immaterial.
        // forge-lint: disable-next-line(block-timestamp)
        if (expiry <= block.timestamp) revert GrantExpired();
        if (nonce != nonces[subjectPseudonym][viewer]) revert StaleNonce();
        bytes32 structHash = keccak256(
            abi.encode(
                GRANT_TYPEHASH,
                subjectPseudonym,
                viewer,
                attester,
                keccak256(abi.encodePacked(scopeTags)),
                expiry,
                nonce
            )
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), subjectSignature);
        if (signer == address(0)) revert InvalidSignature();
        // THE subject-ownership check: pseudonym must derive from (signer, attester).
        if (keccak256(abi.encode(signer, attester)) != subjectPseudonym) revert NotPseudonymOwner();
        nonces[subjectPseudonym][viewer] = nonce + 1;
        consents[subjectPseudonym][viewer] =
            Consent({scopeTags: scopeTags, expiry: expiry, revoked: false, grantSigner: signer});
        // ECDSA.recover is an internal library call — no external interaction,
        // so no event can follow a reentrant call here.
        // forge-lint: disable-next-line(reentrancy-events)
        emit AccessGranted(subjectPseudonym, viewer, attester, expiry);
    }

    /// @notice Only the original grant signer can revoke — otherwise anyone
    /// could grief a subject by revoking their grants (underwriting DoS).
    function revokeAccess(bytes32 subjectPseudonym, address viewer, bytes calldata subjectSignature)
        external
    {
        Consent storage c = consents[subjectPseudonym][viewer];
        if (c.grantSigner == address(0)) revert NoGrant();
        bytes32 structHash =
            keccak256(abi.encode(REVOKE_TYPEHASH, subjectPseudonym, viewer));
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), subjectSignature);
        if (signer != c.grantSigner) revert NotGrantSigner();
        c.revoked = true;
        // Same as grantAccess: internal-library recovery only, no external call.
        // forge-lint: disable-next-line(reentrancy-events)
        emit AccessRevoked(subjectPseudonym, viewer);
    }

    function isAuthorized(bytes32 subjectPseudonym, address viewer, bytes32 scopeTag)
        external
        view
        returns (bool)
    {
        Consent storage c = consents[subjectPseudonym][viewer];
        if (c.grantSigner == address(0) || c.revoked) return false;
        // Same day-scale rationale as grantAccess.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp >= c.expiry) return false;
        for (uint256 i = 0; i < c.scopeTags.length; i++) {
            if (c.scopeTags[i] == scopeTag) return true;
        }
        return false;
    }

    /// @notice Standing check for ChallengeModule.openChallenge: does `viewer`
    /// hold ANY live (non-expired, non-revoked) grant for this pseudonym?
    /// Scope-matching is enforced at disclosure delivery (indexer); on-chain
    /// standing is the live grant plus the challenger bond.
    function hasValidGrant(bytes32 subjectPseudonym, address viewer) external view returns (bool) {
        Consent storage c = consents[subjectPseudonym][viewer];
        if (c.grantSigner == address(0) || c.revoked) return false;
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp >= c.expiry) return false;
        return true;
    }
}

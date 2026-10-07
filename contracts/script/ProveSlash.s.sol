// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";
import {ChallengeModule} from "../src/ChallengeModule.sol";

/// @title ProveSlash — ticket 05: scripted live slash proof on Monad testnet.
/// @notice Plants a FALSE attestation, challenges it as a relying lender,
/// resolves via the arbiter, and asserts the slash — every step logged.
/// The attester mounts no defense (there is none: the attestation is false),
/// which is itself the narrative: lies get slashed, truth gets defended.
///
/// Env keys (testnet-only, single-use — passed as env vars, never files):
///   ATTESTER_KEY   — fresh demo wallet, needs 5+ MON (posts its own bond)
///   SUBJECT_KEY    — fresh demo wallet, needs gas only (derives the pseudonym)
///   CHALLENGER_KEY — fresh demo wallet, needs 0.5+ MON (challenger bond)
///   ARBITER_KEY    — deployer key, needs gas only
///
/// Usage:
///   ATTESTER_KEY=0x.. SUBJECT_KEY=0x.. CHALLENGER_KEY=0x.. ARBITER_KEY=0x.. \
///     forge script script/ProveSlash.s.sol --rpc-url monad_testnet --broadcast
contract ProveSlash is Script {
    // Deployed testnet addresses (ANCHOR.md) — script refuses any other chain.
    AttesterRegistry constant ATTESTER_REGISTRY =
        AttesterRegistry(0x84a84Cfe2Fe62499ba0FDF9cf49F617865F4152d);
    AttestationRegistry constant ATTESTATION_REGISTRY =
        AttestationRegistry(0x7FceaA85C5F74d54554BFfD46A41653FD03Da962);
    ConsentRegistry constant CONSENT_REGISTRY =
        ConsentRegistry(0x6f47A618213d44aFdaEB605E3262e2F874471B74);
    ChallengeModule constant CHALLENGE_MODULE =
        ChallengeModule(0xd7Ca8042C236B9c29CbaC8c192100825F5969A0D);

    bytes32 constant GRANT_TYPEHASH = keccak256(
        "ConsentGrant(bytes32 subjectPseudonym,address viewer,address attester,bytes32[] scopeTags,uint256 expiry)"
    );

    function run() external {
        require(block.chainid == 10143, "ProveSlash: Monad testnet only");
        uint256 attesterKey = vm.envUint("ATTESTER_KEY");
        uint256 subjectKey = vm.envUint("SUBJECT_KEY");
        uint256 challengerKey = vm.envUint("CHALLENGER_KEY");
        uint256 arbiterKey = vm.envUint("ARBITER_KEY");
        address attester = vm.addr(attesterKey);
        address subject = vm.addr(subjectKey);
        address challenger = vm.addr(challengerKey);
        bytes32 pseudo = keccak256(abi.encode(subject, attester));
        console.log("pseudonym:", vm.toString(pseudo));

        // 1. Attester registers (skipped if already active) and plants the
        //    FALSE attestation: a GIG_PAYOUT that never happened.
        uint256 bondBefore = ATTESTER_REGISTRY.getAttester(attester).bond;
        vm.startBroadcast(attesterKey);
        if (!ATTESTER_REGISTRY.isActiveAttester(attester)) {
            ATTESTER_REGISTRY.register{value: 5e18}(AttesterRegistry.AttesterType.INDIVIDUAL);
            console.log("attester registered with 5 MON bond");
        }
        uint256 attestationId = ATTESTATION_REGISTRY.nextAttestationId();
        bytes32 commitment = keccak256(
            abi.encode(
                pseudo,
                uint8(AttestationRegistry.EventType.GIG_PAYOUT),
                uint256(10000), // $100.00 — never earned, never paid
                true,
                block.timestamp,
                keccak256(abi.encode(block.timestamp, attester))
            )
        );
        ATTESTATION_REGISTRY.attest(pseudo, AttestationRegistry.EventType.GIG_PAYOUT, commitment, bytes32(0));
        vm.stopBroadcast();
        console.log("false attestation planted, id:", attestationId);

        // 2. Subject grants the challenger a scoped disclosure.
        bytes32[] memory scopes = new bytes32[](1);
        scopes[0] = keccak256("GIG_PAYOUT");
        uint256 expiry = block.timestamp + 30 days;
        bytes memory grantSig =
            _grantSig(subjectKey, pseudo, challenger, attester, scopes, expiry);
        vm.startBroadcast(subjectKey);
        CONSENT_REGISTRY.grantAccess(pseudo, challenger, attester, scopes, expiry, grantSig);
        vm.stopBroadcast();
        console.log("subject granted GIG_PAYOUT disclosure to challenger");

        // 3. Challenger opens the challenge with its bond.
        uint256 challengeId = CHALLENGE_MODULE.nextChallengeId() + 1;
        vm.startBroadcast(challengerKey);
        CHALLENGE_MODULE.openChallenge{value: 0.5e18}(attestationId, keccak256("demo-disclosure"));
        vm.stopBroadcast();
        console.log("challenge opened, id:", challengeId);

        // 4. Arbiter resolves: challenger wins (the attestation is false).
        vm.startBroadcast(arbiterKey);
        CHALLENGE_MODULE.resolve(challengeId, true);
        vm.stopBroadcast();
        console.log("arbiter resolved: CHALLENGER_WON");

        // 5. Challenger claims; assert the slash landed on-chain.
        vm.startBroadcast(challengerKey);
        CHALLENGE_MODULE.claim(challengeId);
        vm.stopBroadcast();
        require(
            ATTESTATION_REGISTRY.getAttestation(attestationId).status
                == AttestationRegistry.AttestationStatus.SLASHED,
            "ProveSlash: attestation not SLASHED"
        );
        require(
            ATTESTER_REGISTRY.getAttester(attester).bond < bondBefore,
            "ProveSlash: bond not slashed"
        );
        require(
            ATTESTER_REGISTRY.getAttester(attester).reputationScore < 0,
            "ProveSlash: reputation not cut"
        );
        console.log("SLASH PROVEN: bond seized, reputation cut, attestation SLASHED");
    }

    function _grantSig(
        uint256 subjectKey,
        bytes32 pseudo,
        address challenger,
        address attester,
        bytes32[] memory scopes,
        uint256 expiry
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                GRANT_TYPEHASH, pseudo, challenger, attester, keccak256(abi.encodePacked(scopes)), expiry
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _separator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(subjectKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _separator() internal view returns (bytes32) {
        (, string memory name, string memory version, uint256 chainId, address vc,,) =
            CONSENT_REGISTRY.eip712Domain();
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
}

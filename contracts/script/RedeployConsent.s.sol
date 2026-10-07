// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";
import {ChallengeModule} from "../src/ChallengeModule.sol";

/// @notice Redeploys ConsentRegistry (grant-nonce replay guard) + ChallengeModule
/// (which immutably references the consent address). AttesterRegistry,
/// AttestationRegistry, and MockLendingPool are UNCHANGED — only the
/// challenge-module pointer on the two registries moves (deployer is owner).
/// New addresses go to ANCHOR.md + shared/constants.ts + ProveSlash.s.sol.
///
/// Usage:
///   forge script script/RedeployConsent.s.sol --rpc-url monad_testnet --broadcast
///   (deployer key via --account or env — never committed)
contract RedeployConsent is Script {
    AttesterRegistry constant ATTESTER_REGISTRY =
        AttesterRegistry(0x84a84Cfe2Fe62499ba0FDF9cf49F617865F4152d);
    AttestationRegistry constant ATTESTATION_REGISTRY =
        AttestationRegistry(0x7FceaA85C5F74d54554BFfD46A41653FD03Da962);

    function run() external {
        require(block.chainid == 10143, "RedeployConsent: Monad testnet only");
        address arbiter = vm.envOr("ARBITER_ADDRESS", msg.sender);
        vm.startBroadcast();
        ConsentRegistry consent = new ConsentRegistry();
        ChallengeModule challenge = new ChallengeModule(
            address(ATTESTATION_REGISTRY), address(ATTESTER_REGISTRY), address(consent), arbiter
        );
        ATTESTER_REGISTRY.setChallengeModule(address(challenge));
        ATTESTATION_REGISTRY.setChallengeModule(address(challenge));
        vm.stopBroadcast();
        console.log("ConsentRegistry: ", address(consent));
        console.log("ChallengeModule: ", address(challenge));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";
import {ChallengeModule} from "../src/ChallengeModule.sol";
import {MockLendingPool} from "../src/MockLendingPool.sol";

// Slice 1 deployed the registries in dependency order:
// AttesterRegistry → AttestationRegistry → ConsentRegistry, then wired
// the attestation registry into the attester registry for count notes.
// Ticket 01 appends: ChallengeModule + setChallengeModule on all three.
// Ticket 02 appends: MockLendingPool (funding + registerAsAttester are
// operator steps post-deploy, not part of this script).
// Every address is recorded in ANCHOR.md.
//
// Usage:
//   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
//   (deployer key via --account or env — never committed)
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        AttesterRegistry attesterRegistry = new AttesterRegistry();
        AttestationRegistry attestationRegistry = new AttestationRegistry(address(attesterRegistry));
        ConsentRegistry consentRegistry = new ConsentRegistry();
        attesterRegistry.setAttestationRegistry(address(attestationRegistry));
        // Ticket 01: ChallengeModule (arbiter via env, else deployer).
        // Ticket 02: MockLendingPool.
        address arbiter = vm.envOr("ARBITER_ADDRESS", msg.sender);
        ChallengeModule challengeModule = new ChallengeModule(
            address(attestationRegistry),
            address(attesterRegistry),
            address(consentRegistry),
            arbiter
        );
        attesterRegistry.setChallengeModule(address(challengeModule));
        attestationRegistry.setChallengeModule(address(challengeModule));
        MockLendingPool pool =
            new MockLendingPool(address(attesterRegistry), address(attestationRegistry));
        vm.stopBroadcast();

        console.log("AttesterRegistry:    ", address(attesterRegistry));
        console.log("AttestationRegistry: ", address(attestationRegistry));
        console.log("ConsentRegistry:     ", address(consentRegistry));
        console.log("ChallengeModule:     ", address(challengeModule));
        console.log("MockLendingPool:     ", address(pool));
    }
}

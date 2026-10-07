// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";

// Slice 1 deploys the registries in dependency order:
// AttesterRegistry → AttestationRegistry → ConsentRegistry, then wires
// the attestation registry into the attester registry for count notes.
// Slice 2 appends: ChallengeModule + MockLendingPool + setChallengeModule
// calls on all three. Every address is recorded in ANCHOR.md.
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
        vm.stopBroadcast();

        console.log("AttesterRegistry:    ", address(attesterRegistry));
        console.log("AttestationRegistry: ", address(attestationRegistry));
        console.log("ConsentRegistry:     ", address(consentRegistry));
        // TODO(slice-2): deploy ChallengeModule + MockLendingPool, wire setChallengeModule.
    }
}

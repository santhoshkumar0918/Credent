// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";

// Slice 1 fills in deployments in dependency order:
// AttesterRegistry → AttestationRegistry → ConsentRegistry →
// ChallengeModule → MockLendingPool. Every address is recorded in ANCHOR.md.
//
// Usage:
//   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
//   (deployer key via --account or env — never committed)
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        // TODO(slice-1): deploy registries.
        // TODO(slice-2): deploy ChallengeModule + MockLendingPool.
        vm.stopBroadcast();
    }
}

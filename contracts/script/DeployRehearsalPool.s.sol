// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {MockLendingPool} from "../src/MockLendingPool.sol";

/// @notice Deploys ONLY the rehearsal MockLendingPool (MIN_SCORE = 0).
/// Registries/consent/challenge are untouched — existing addresses reused.
///   ATTESTER_KEY=0x.. forge script script/DeployRehearsalPool.s.sol \
///     --rpc-url https://testnet-rpc.monad.xyz --broadcast
contract DeployRehearsalPool is Script {
    address internal constant ATTESTER_REGISTRY = 0x84a84Cfe2Fe62499ba0FDF9cf49F617865F4152d;
    address internal constant ATTESTATION_REGISTRY = 0x7FceaA85C5F74d54554BFfD46A41653FD03Da962;

    function run() external {
        uint256 key = vm.envUint("ATTESTER_KEY");
        vm.startBroadcast(key);
        MockLendingPool pool = new MockLendingPool(ATTESTER_REGISTRY, ATTESTATION_REGISTRY);
        vm.stopBroadcast();
        console.log("Rehearsal MockLendingPool:", address(pool));
        console.log("MIN_SCORE:", pool.MIN_SCORE());
        console.log("owner:", pool.owner());
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";

/// @notice Slice 1 tests — bonding gates, slash accounting, wiring guards.
/// Bond values are read from the contract (MIN_BOND), never hardcoded —
/// so testnet-scaling the constants cannot silently desync the suite.
/// This contract plays the ChallengeModule wherever onlyChallengeModule
/// paths are exercised (it IS the configured module in these tests).
contract AttesterRegistryTest is Test {
    AttesterRegistry registry;
    address attester = makeAddr("attester");
    address challenger = makeAddr("challenger");
    uint256 MIN;

    function setUp() public {
        registry = new AttesterRegistry();
        registry.setAttestationRegistry(address(this));
        registry.setChallengeModule(address(this));
        MIN = registry.MIN_BOND();
        vm.deal(attester, MIN * 10);
    }

    function test_RegisterSetsBondAndActive() public {
        vm.prank(attester);
        registry.register{value: MIN}(AttesterRegistry.AttesterType.PLATFORM);
        AttesterRegistry.Attester memory a = registry.getAttester(attester);
        assertEq(a.addr, attester);
        assertEq(uint8(a.attesterType), uint8(AttesterRegistry.AttesterType.PLATFORM));
        assertEq(a.bond, MIN);
        assertEq(a.reputationScore, 0);
        assertTrue(a.active);
        assertTrue(registry.isActiveAttester(attester));
    }

    function test_RegisterBelowMinBondReverts() public {
        vm.prank(attester);
        vm.expectRevert(AttesterRegistry.InsufficientBond.selector);
        registry.register{value: MIN - 1e18}(AttesterRegistry.AttesterType.INDIVIDUAL);
    }

    function test_DoubleRegisterReverts() public {
        vm.startPrank(attester);
        registry.register{value: MIN}(AttesterRegistry.AttesterType.INDIVIDUAL);
        vm.expectRevert(AttesterRegistry.AlreadyRegistered.selector);
        registry.register{value: MIN}(AttesterRegistry.AttesterType.INDIVIDUAL);
        vm.stopPrank();
    }

    function test_SlashDeactivatesAndPaysChallenger() public {
        vm.prank(attester);
        registry.register{value: MIN}(AttesterRegistry.AttesterType.INSTITUTION);
        uint256 before = challenger.balance;
        registry.slash(attester, 1e18, challenger);
        AttesterRegistry.Attester memory a = registry.getAttester(attester);
        assertEq(a.bond, MIN - 1e18);
        assertEq(a.challengesLost, 1);
        assertFalse(a.active);
        assertEq(challenger.balance - before, 1e18);
    }

    function test_SlashCapsAtBond() public {
        vm.prank(attester);
        registry.register{value: MIN}(AttesterRegistry.AttesterType.PLATFORM);
        registry.slash(attester, MIN * 100, challenger);
        assertEq(registry.getAttester(attester).bond, 0);
        assertEq(challenger.balance, MIN);
    }

    function test_TopUpReactivatesAtMinBond() public {
        vm.prank(attester);
        registry.register{value: MIN}(AttesterRegistry.AttesterType.PLATFORM);
        registry.slash(attester, MIN - 0.4e18, challenger);
        assertFalse(registry.isActiveAttester(attester));
        vm.prank(attester);
        registry.topUpBond{value: MIN}();
        AttesterRegistry.Attester memory a = registry.getAttester(attester);
        assertEq(a.bond, MIN + 0.4e18);
        assertTrue(a.active);
    }

    function test_SlashOnlyChallengeModule() public {
        vm.prank(attester);
        registry.register{value: MIN}(AttesterRegistry.AttesterType.PLATFORM);
        vm.prank(challenger);
        vm.expectRevert(AttesterRegistry.OnlyChallengeModule.selector);
        registry.slash(attester, 1e18, challenger);
    }

    function test_AdjustReputationMovesScore() public {
        vm.prank(attester);
        registry.register{value: MIN}(AttesterRegistry.AttesterType.PLATFORM);
        registry.adjustReputation(attester, 5);
        assertEq(registry.getAttester(attester).reputationScore, 5);
        registry.adjustReputation(attester, -8);
        assertEq(registry.getAttester(attester).reputationScore, -3);
    }

    function test_NoteAttestationCountsAndGuardsCaller() public {
        vm.prank(attester);
        registry.register{value: MIN}(AttesterRegistry.AttesterType.PLATFORM);
        registry.noteAttestation(attester);
        assertEq(registry.getAttester(attester).attestationCount, 1);
        vm.prank(challenger);
        vm.expectRevert(AttesterRegistry.OnlyAttestationRegistry.selector);
        registry.noteAttestation(attester);
    }

    function test_WiringOnlyOwner() public {
        vm.prank(challenger);
        vm.expectRevert();
        registry.setChallengeModule(challenger);
    }
}

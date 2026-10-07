// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";

/// @notice Slice 1 tests — bonding gates, slash accounting, wiring guards.
/// This contract plays the ChallengeModule wherever onlyChallengeModule
/// paths are exercised (it IS the configured module in these tests).
contract AttesterRegistryTest is Test {
    AttesterRegistry registry;
    address attester = makeAddr("attester");
    address challenger = makeAddr("challenger");

    function setUp() public {
        registry = new AttesterRegistry();
        registry.setAttestationRegistry(address(this));
        registry.setChallengeModule(address(this));
        vm.deal(attester, 200e18);
    }

    function test_RegisterSetsBondAndActive() public {
        vm.prank(attester);
        registry.register{value: 50e18}(AttesterRegistry.AttesterType.PLATFORM);
        AttesterRegistry.Attester memory a = registry.getAttester(attester);
        assertEq(a.addr, attester);
        assertEq(uint8(a.attesterType), uint8(AttesterRegistry.AttesterType.PLATFORM));
        assertEq(a.bond, 50e18);
        assertEq(a.reputationScore, 0);
        assertTrue(a.active);
        assertTrue(registry.isActiveAttester(attester));
    }

    function test_RegisterBelowMinBondReverts() public {
        vm.prank(attester);
        vm.expectRevert(AttesterRegistry.InsufficientBond.selector);
        registry.register{value: 49e18}(AttesterRegistry.AttesterType.INDIVIDUAL);
    }

    function test_DoubleRegisterReverts() public {
        vm.startPrank(attester);
        registry.register{value: 50e18}(AttesterRegistry.AttesterType.INDIVIDUAL);
        vm.expectRevert(AttesterRegistry.AlreadyRegistered.selector);
        registry.register{value: 50e18}(AttesterRegistry.AttesterType.INDIVIDUAL);
        vm.stopPrank();
    }

    function test_SlashDeactivatesAndPaysChallenger() public {
        vm.prank(attester);
        registry.register{value: 50e18}(AttesterRegistry.AttesterType.INSTITUTION);
        uint256 before = challenger.balance;
        registry.slash(attester, 10e18, challenger);
        AttesterRegistry.Attester memory a = registry.getAttester(attester);
        assertEq(a.bond, 40e18);
        assertEq(a.challengesLost, 1);
        assertFalse(a.active);
        assertEq(challenger.balance - before, 10e18);
    }

    function test_SlashCapsAtBond() public {
        vm.prank(attester);
        registry.register{value: 50e18}(AttesterRegistry.AttesterType.PLATFORM);
        registry.slash(attester, 500e18, challenger);
        assertEq(registry.getAttester(attester).bond, 0);
        assertEq(challenger.balance, 50e18);
    }

    function test_TopUpReactivatesAtMinBond() public {
        vm.prank(attester);
        registry.register{value: 50e18}(AttesterRegistry.AttesterType.PLATFORM);
        registry.slash(attester, 46e18, challenger);
        assertFalse(registry.isActiveAttester(attester));
        vm.prank(attester);
        registry.topUpBond{value: 50e18}();
        AttesterRegistry.Attester memory a = registry.getAttester(attester);
        assertEq(a.bond, 54e18);
        assertTrue(a.active);
    }

    function test_SlashOnlyChallengeModule() public {
        vm.prank(attester);
        registry.register{value: 50e18}(AttesterRegistry.AttesterType.PLATFORM);
        vm.prank(challenger);
        vm.expectRevert(AttesterRegistry.OnlyChallengeModule.selector);
        registry.slash(attester, 1e18, challenger);
    }

    function test_AdjustReputationMovesScore() public {
        vm.prank(attester);
        registry.register{value: 50e18}(AttesterRegistry.AttesterType.PLATFORM);
        registry.adjustReputation(attester, 5);
        assertEq(registry.getAttester(attester).reputationScore, 5);
        registry.adjustReputation(attester, -8);
        assertEq(registry.getAttester(attester).reputationScore, -3);
    }

    function test_NoteAttestationCountsAndGuardsCaller() public {
        vm.prank(attester);
        registry.register{value: 50e18}(AttesterRegistry.AttesterType.PLATFORM);
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";
import {ChallengeModule} from "../src/ChallengeModule.sol";
import {MockLendingPool} from "../src/MockLendingPool.sol";

/// @notice Ticket 02 tests — transparent scoring, gated origination,
/// repayment that writes a new attestation (and leaks no preimage).
contract MockLendingPoolTest is Test {
    AttesterRegistry attesterRegistry;
    AttestationRegistry attestationRegistry;
    ConsentRegistry consentRegistry;
    ChallengeModule challengeModule;
    MockLendingPool pool;

    bytes32 constant PSEUDO = keccak256("borrower-relationship");
    address borrower = makeAddr("borrower");

    function setUp() public {
        attesterRegistry = new AttesterRegistry();
        attestationRegistry = new AttestationRegistry(address(attesterRegistry));
        consentRegistry = new ConsentRegistry();
        challengeModule = new ChallengeModule(
            address(attestationRegistry), address(attesterRegistry), address(consentRegistry), address(this)
        );
        attesterRegistry.setAttestationRegistry(address(attestationRegistry));
        attesterRegistry.setChallengeModule(address(challengeModule));
        attestationRegistry.setChallengeModule(address(challengeModule));
        pool = new MockLendingPool(address(attesterRegistry), address(attestationRegistry));
        vm.deal(address(pool), 100e18);
        vm.deal(borrower, 10e18);
        pool.registerAsAttester();
    }

    function _underwriteStrong() internal returns (uint256 score) {
        // 9000 * log2(366)=8 * (4*10000/5)=8000 / 1e7 = 57.
        score = pool.requestUnderwriting(PSEUDO, 9000, 365, 4, 5);
    }

    function test_ScoreIsTransparentAndRecomputable() public {
        assertEq(_underwriteStrong(), 57);
    }

    function test_ScoreRejectsBadInputs() public {
        vm.expectRevert(MockLendingPool.InvalidInput.selector);
        pool.requestUnderwriting(PSEUDO, 10001, 365, 4, 5);
        vm.expectRevert(MockLendingPool.InvalidInput.selector);
        pool.requestUnderwriting(PSEUDO, 9000, 365, 6, 5);
        vm.expectRevert(MockLendingPool.InvalidInput.selector);
        pool.requestUnderwriting(PSEUDO, 9000, 365, 0, 0);
    }

    function test_FullLoanLoopWritesAttestation() public {
        _underwriteStrong();
        uint256 countBefore = attestationRegistry.nextAttestationId();
        uint256 loanId = pool.originateLoan(PSEUDO, borrower, 1e18);
        assertEq(borrower.balance, 10e18 + 1e18);
        vm.prank(borrower);
        pool.recordRepayment{value: 1e18}(loanId);
        assertEq(attestationRegistry.nextAttestationId(), countBefore + 1);
        AttestationRegistry.Attestation memory a =
            attestationRegistry.getAttestation(countBefore);
        assertEq(a.attester, address(pool));
        assertEq(a.subjectPseudonym, PSEUDO);
        assertEq(uint8(a.eventType), uint8(AttestationRegistry.EventType.P2P_LOAN_REPAYMENT));
        assertEq(uint8(a.status), uint8(AttestationRegistry.AttestationStatus.ACTIVE));
        assertTrue(a.commitmentHash != bytes32(0));
    }

    function test_OriginateOnlyOwner() public {
        _underwriteStrong();
        vm.prank(borrower);
        vm.expectRevert();
        pool.originateLoan(PSEUDO, borrower, 1e18);
    }

    function test_OriginateWithoutUnderwritingReverts() public {
        vm.expectRevert(MockLendingPool.NoUnderwriting.selector);
        pool.originateLoan(PSEUDO, borrower, 1e18);
    }

    function test_OriginateWeakScoreReverts() public {
        // 1000 * 8 * 8000 / 1e7 = 6 < MIN_SCORE 50.
        pool.requestUnderwriting(PSEUDO, 1000, 365, 4, 5);
        vm.expectRevert(MockLendingPool.UnderwritingTooWeak.selector);
        pool.originateLoan(PSEUDO, borrower, 1e18);
    }

    function test_OriginateStaleUnderwritingReverts() public {
        _underwriteStrong();
        vm.warp(block.timestamp + 31 days);
        vm.expectRevert(MockLendingPool.UnderwritingStale.selector);
        pool.originateLoan(PSEUDO, borrower, 1e18);
    }

    function test_RepayUnderpayReverts() public {
        _underwriteStrong();
        uint256 loanId = pool.originateLoan(PSEUDO, borrower, 1e18);
        vm.prank(borrower);
        vm.expectRevert(MockLendingPool.InsufficientRepayment.selector);
        pool.recordRepayment{value: 0.5e18}(loanId);
    }

    function test_DoubleRepayReverts() public {
        _underwriteStrong();
        uint256 loanId = pool.originateLoan(PSEUDO, borrower, 1e18);
        vm.prank(borrower);
        pool.recordRepayment{value: 1e18}(loanId);
        vm.prank(borrower);
        vm.expectRevert(MockLendingPool.AlreadyRepaid.selector);
        pool.recordRepayment{value: 1e18}(loanId);
    }

    function test_RepayNonexistentReverts() public {
        vm.prank(borrower);
        vm.expectRevert(MockLendingPool.LoanNotFound.selector);
        pool.recordRepayment{value: 1e18}(999);
    }

    function test_PoolIsBondedAttester() public {
        assertTrue(attesterRegistry.isActiveAttester(address(pool)));
    }
}

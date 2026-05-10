// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBlockRide {
    function bookSeats(uint256 rideId, uint8 numSeats) external payable;
    function withdrawRefund() external;
}

/// @notice Test helper. Books a seat as a contract, then on receiving its
///         refund attempts to reenter `withdrawRefund`. The ReentrancyGuard
///         on the target must revert the second call.
contract MaliciousPassenger {
    IBlockRide public immutable target;
    bool public attackInFlight;
    uint256 public reentryAttempts;

    constructor(address _target) {
        target = IBlockRide(_target);
    }

    function book(uint256 rideId, uint8 seats) external payable {
        target.bookSeats{value: msg.value}(rideId, seats);
    }

    /// @notice Triggers the withdrawal that should land funds in this contract,
    ///         then sets up the reentrancy attempt via {receive}.
    function attack() external {
        attackInFlight = true;
        target.withdrawRefund();
        attackInFlight = false;
    }

    receive() external payable {
        if (attackInFlight) {
            reentryAttempts++;
            // Should revert inside ReentrancyGuard; we swallow the failure so
            // the outer withdrawRefund still completes its (single, legitimate)
            // transfer to this contract.
            try target.withdrawRefund() {
                // If this branch ever executes, the guard failed.
            } catch {}
        }
    }
}

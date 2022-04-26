// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity ^0.8.4;

import "../trades/VivTimer.sol";

contract VivTimerMock is VivTimer {
    function getWithdrawAmountInternal(bytes calldata tid, uint256 currentTime)
        external
        view
        returns (
            uint256 canWithdraw,
            uint256 withdrawed,
            uint256 totalPenalty
        )
    {
        return _getWithdrawAmount(tid, currentTime);
    }

    function purchaseInternal(
        address[] memory users,
        uint256[] memory values,
        uint256[] memory times,
        bytes calldata tid,
        uint256 penaltyRate,
        uint256 feeRate,
        uint256 value,
        uint256 deposit,
        uint256 currentTime
    ) external payable {
        _purchase(users, values, times, tid, penaltyRate, feeRate, value, deposit, currentTime);
    }

    function withdrawInternal(
        bytes memory signedValue1,
        bytes memory signedValue2,
        bytes memory signedValue3,
        uint256 value,
        uint256 couponRate,
        uint256 arbitrateFee,
        bytes memory tid,
        bytes memory couponId,
        uint256 currentTime
    ) external {
        _withdraw(
            signedValue1,
            signedValue2,
            signedValue3,
            value,
            couponRate,
            arbitrateFee,
            tid,
            couponId,
            currentTime
        );
    }

    function refundDepositInternal(bytes memory tid, uint256 currentTime) external {
        _refundDeposit(tid, currentTime);
    }
}

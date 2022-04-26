// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity ^0.8.4;

import "../trades/VivTrust.sol";

contract VivTrustrMock is VivTrust {
    function getAmountInternal(bytes calldata tid, uint256 currentTime)
        external
        view
        returns (
            uint256 value,
            uint256 remainderAmount,
            uint256 principalWithdrawed,
            uint256 trusteeWithdrawed,
            uint256 currentWithdrawed,
            uint256 canWithdraw
        )
    {
        return _getAmount(tid, currentTime);
    }

    function withdrawInternal(
        bytes memory signedValue,
        uint256 value,
        uint256 couponRate,
        bytes memory tid,
        bytes memory couponId,
        uint256 currentTime
    ) external {
        _withdraw(signedValue, value, couponRate, tid, couponId, currentTime);
    }
}

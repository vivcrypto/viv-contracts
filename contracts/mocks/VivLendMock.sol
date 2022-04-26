// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity ^0.8.4;

import "../trades/VivLend.sol";

contract VivLendMock is VivLend {
    function repayInternal(
        uint256 value,
        bytes memory tid,
        uint256 currentTime
    ) external payable {
        _repay(value, tid, currentTime);
    }

    function withdrawInternal(
        uint256 value,
        bytes memory tid,
        uint256 currentTime
    ) external payable {
        _withdraw(value, tid, currentTime);
    }
}

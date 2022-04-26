// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity ^0.8.4;

import "../trades/VivAuction.sol";

contract VivAuctionMock is VivAuction {
    function biddingInternal(uint256 id, uint256 currentTime) external payable {
        return _bidding(id, currentTime);
    }

    function endAuctionInternal(uint256 id, uint256 currentTime) external returns (address winner, uint256 price) {
        return _endAuction(id, currentTime);
    }

    function withdrawInternal(
        uint256 id,
        bytes calldata sign1,
        bytes calldata sign2,
        uint256 couponRate,
        bytes memory couponId,
        uint256 currentTime
    ) external {
        _withdraw(id, sign1, sign2, couponRate, couponId, currentTime);
    }

    function infoInternal(
        uint256 id,
        address user,
        uint256 currentTime
    )
        external
        view
        returns (
            uint256 sysTime,
            uint256 endTime,
            uint256 topPrice,
            uint256 myPrice
        )
    {
        return _info(id, user, currentTime);
    }
}

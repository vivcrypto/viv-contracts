// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity 0.8.4;

import "../erc20/Token.sol";

contract TokenMock is Token {
    function balanceOf(address token) public view returns (uint256) {
        return _balanceOf(token);
    }

    function allowance(
        address token,
        address owner,
        address spender
    ) public view returns (uint256) {
        return _allowance(token, owner, spender);
    }

    function transfer(
        address token,
        address to,
        uint256 value
    ) public {
        _transfer(token, to, value);
    }

    function transferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) public {
        _transferFrom(token, from, to, value);
    }

    function checkTransferIn(
        address token,
        address owner,
        address to,
        uint256 value
    ) public payable {
        __checkTransferIn(token, owner, value);
        _transferFrom(token, owner, to, value);
    }

    receive() external payable {}
}

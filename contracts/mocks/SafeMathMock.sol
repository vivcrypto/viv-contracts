// SPDX-License-Identifier: MIT
// Viv Contracts

import "../util/SafeMath.sol";

pragma solidity ^0.8.0;

contract SafeMathMock {
    function doAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return SafeMath.add(a, b);
    }

    function doSub(uint256 a, uint256 b) public pure returns (uint256) {
        return SafeMath.sub(a, b);
    }

    function doMul(uint256 a, uint256 b) public pure returns (uint256) {
        return SafeMath.mul(a, b);
    }

    function doDiv(uint256 a, uint256 b) public pure returns (uint256) {
        return SafeMath.div(a, b);
    }

    function doRate(uint256 a, uint256 b) public pure returns (uint256) {
        return SafeMath.rate(a, b);
    }
}

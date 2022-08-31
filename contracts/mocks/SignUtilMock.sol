// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity 0.8.4;

import "../util/SignUtil.sol";

contract SignUtilMock {
    function checkSign1(
        bytes32 hashValue,
        bytes memory signedValue1,
        bytes memory signedValue2,
        address buyer,
        address seller,
        address guarantor
    ) external pure returns (bool) {
        return SignUtil.checkSign(hashValue, signedValue1, signedValue2, buyer, seller, guarantor);
    }

    function checkSign2(
        bytes32 hashValue,
        bytes memory signedValue1,
        bytes memory signedValue2,
        address user,
        address guarantor
    ) external pure returns (bool) {
        return SignUtil.checkSign(hashValue, signedValue1, signedValue2, user, guarantor);
    }

    function checkSign3(
        bytes32 hashValue,
        bytes memory signedValue,
        address user
    ) external pure returns (bool) {
        return SignUtil.checkSign(hashValue, signedValue, user);
    }
}

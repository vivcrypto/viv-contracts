// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./VivDaoToken.sol";
import "../erc20/Token.sol";
import "../util/SafeMath.sol";
import "../util/SignUtil.sol";

/**
 * The DAO contract is used to raise funds for a project. As a reward,
 * the DAO contract will issue a certain number of ERC20 tokens to the participants,
 * and the tokens held by the participants can be traded twice.
 */
contract VivDao is Token, Ownable {
    using SafeMath for uint256;

    struct Trade {
        address payToken;
        address payable buyer;
        uint256 payValue;
        uint256 getValue;
        bytes tid;
        uint256 round;
    }

    struct Target {
        uint256 round;
        uint256 target;
        uint256 fact;
        uint256 reserved;
        uint256 discount;
    }

    mapping(bytes => Trade) _trades;

    bytes[] _tids;

    mapping(uint256 => Target) _targets;

    address _payToken;

    address _daoToken;

    uint256 _exchange;

    uint256 _currentRound = 0;

    uint256 _feeRate;

    mapping(bytes => bool) _couponIds;

    address _platform;

    /**
     * constructor
     * @param payToken The address of token to pay
     * @param exchange The rate of pay Token exchange to dao token
     * @param target   The target of current round to raise.
     * @param reserved The rate of keep DAO token
     * @param discount The rate of deflation
     * @param platform platfrom address
     * @param feeRate fee rate
     */
    constructor(
        address payToken,
        uint256 exchange,
        uint256 target,
        uint256 reserved,
        uint256 discount,
        address platform,
        uint256 feeRate
    ) {
        require(platform != address(0), "VIV5002");
        _payToken = payToken;
        _exchange = exchange;
        _feeRate = feeRate;
        _platform = platform;
        _newRound(target, reserved, discount);
    }

    /**
     * new round
     * @param target   The target of current round to raise.
     * @param reserved The rate of keep DAO token
     * @param discount The rate of deflation
     */
    function newRound(
        uint256 target,
        uint256 reserved,
        uint256 discount
    ) external onlyOwner {
        _newRound(target, reserved, discount);
    }

    function _newRound(
        uint256 amount,
        uint256 reserved,
        uint256 discount
    ) internal {
        require(amount > 0, "VIV5201");
        _currentRound++;
        Target storage target = _targets[_currentRound];
        target.round = _currentRound;
        target.target = amount;
        target.fact = 0;
        target.reserved = reserved;
        target.discount = discount;
    }

    function getTrades() external view returns (Trade[] memory result) {
        uint256 length = _tids.length;
        result = new Trade[](length);
        for (uint256 i = 0; i < _tids.length; i++) {
            result[i] = _trades[_tids[i]];
        }
        return result;
    }

    function getTargets() external view returns (Target[] memory result) {
        result = new Target[](_currentRound);
        for (uint256 i = 0; i < _currentRound; i++) {
            result[i] = _targets[i + 1];
        }
        return result;
    }

    function getTotalTarget() external view returns (uint256 result) {
        for (uint256 i = 1; i <= _currentRound; i++) {
            result = result.add(_targets[i].target);
        }
        return result;
    }

    function getTotalFact() external view returns (uint256 result) {
        for (uint256 i = 1; i <= _currentRound; i++) {
            result = result.add(_targets[i].fact);
        }
        return result;
    }

    /**
     * purchase
     * @param value The amount the buyer need to pay
     * @param daoToken The address of dao token
     * @param tid The trade id
     */
    function purchase(
        uint256 value,
        address daoToken,
        bytes calldata tid
    ) external payable {
        require(value > 0, "VIV0001");
        require(daoToken != address(0), "VIV5202");
        if (_daoToken == address(0)) {
            _daoToken = daoToken;
        } else {
            require(_daoToken == daoToken, "VIV0059");
        }
        _checkTransferIn(_payToken, value);

        Target storage currentTarget = _targets[_currentRound];
        if (currentTarget.target > 0) {
            require(currentTarget.fact + value <= currentTarget.target, "VIV0058");
        }
        currentTarget.fact += value;

        Trade storage trade = _trades[tid];
        require(trade.buyer == address(0), "VIV0060");

        trade.payToken = _payToken;
        trade.buyer = payable(msg.sender);
        trade.payValue = value;
        trade.tid = tid;
        trade.round = currentTarget.round;

        _tids.push(tid);

        // 1) pay for the contract
        _transferFrom(trade.payToken, trade.buyer, address(this), trade.payValue);

        // 2) mint
        // amount = value*exchange - value*exchange*discount/100
        uint256 amount = value.mul(_exchange).sub(value.mul(_exchange).rate(currentTarget.discount));
        VivDaoToken(_daoToken).mint(amount);

        // 3) dao token tansfer to buyer
        // tansferToken = amount - amount*reserved/100
        uint256 tansferToken = amount.sub(amount.rate(currentTarget.reserved));
        VivDaoToken(_daoToken).transfer(trade.buyer, tansferToken);
        trade.getValue = tansferToken;
    }

    /**
     * Withdraw
     * @param payTokenValue get payToken
     * @param daoTokenValue get daoToken
     * @param couponRate coupon rate
     * @param couponId coupon id
     * @param tid trade id
     */
    function withdraw(
        uint256 payTokenValue,
        uint256 daoTokenValue,
        bytes memory signedValue,
        uint256 couponRate,
        bytes memory couponId,
        bytes memory tid
    ) external onlyOwner {
        require(payTokenValue > 0 || daoTokenValue > 0, "VIV5203");
        require(_balanceOf(_payToken) >= payTokenValue, "VIV0061");
        require(VivDaoToken(_daoToken).balanceOf(address(this)) >= daoTokenValue, "VIV0062");

        uint256 payFee = payTokenValue.rate(_feeRate);
        uint256 daoFee = daoTokenValue.rate(_feeRate);
        // Calculate the discounted price when couponRate more than 0
        if (couponRate > 0) {
            // Coupon cannot be reused
            require(!_couponIds[couponId], "VIV0006");
            // Check if platform signed
            bytes32 h = ECDSA.toEthSignedMessageHash(abi.encode(couponRate, couponId, tid));
            require(SignUtil.checkSign(h, signedValue, _platform), "VIV0007");
            // Use a coupon
            payFee = payFee.sub(payFee.rate(couponRate));
            daoFee = daoFee.sub(daoFee.rate(couponRate));
            _couponIds[couponId] = true;
        }

        // pay for fee
        if (payFee > 0) {
            _transfer(_payToken, _platform, payFee);
        }
        if (daoFee > 0) {
            VivDaoToken(_daoToken).transfer(_platform, daoFee);
        }

        // pay for owner
        _transfer(_payToken, owner(), payTokenValue.sub(payFee));
        VivDaoToken(_daoToken).transfer(owner(), daoTokenValue.sub(daoFee));
    }
}

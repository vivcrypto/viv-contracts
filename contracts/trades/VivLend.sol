// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "../erc20/Token.sol";
import "../util/SafeMath.sol";

/**
 * When NFT holders have capital needs, selling NFTs faces the risk of rising prices and not being able to buy them back.
 * At this time, they can choose to borrow NFTs by mortgage. The staked NFT must support the ERC721 protocol.
 */
contract VivLend is Token, IERC721Receiver {
    using SafeMath for uint256;

    enum State {
        Published,
        Lending,
        Closed
    }

    struct Target {
        address token;
        uint256 value;
        uint256 interest;
        uint256 endDate;
    }

    struct Trade {
        address borrower;
        address lender;
        address platform;
        address nftAddress;
        uint256 nftTokenId;
        Target target;
        uint256 feeRate;
        uint256 penaltyRate;
        bytes tid;
        State state;
    }

    mapping(bytes => Trade) _trades;

    bytes[] _tids;

    mapping(bytes => bool) _couponIds;

    uint256 constant _OVER_DUE_HOURS = 86400;

    function getTarget(bytes memory tid)
        public
        view
        returns (
            address token,
            uint256 value,
            uint256 interest,
            uint256 endDate
        )
    {
        return (
            _trades[tid].target.token,
            _trades[tid].target.value,
            _trades[tid].target.interest,
            _trades[tid].target.endDate
        );
    }

    function getNft(bytes memory tid)
        public
        view
        returns (
            address borrower,
            address nftAddress,
            uint256 nftTokenId
        )
    {
        return (_trades[tid].borrower, _trades[tid].nftAddress, _trades[tid].nftTokenId);
    }

    function getProject(bytes memory tid)
        public
        view
        returns (
            address borrower,
            address lender,
            address platform,
            uint256 feeRate,
            uint256 penaltyRate,
            State state
        )
    {
        return (
            _trades[tid].borrower,
            _trades[tid].lender,
            _trades[tid].platform,
            _trades[tid].feeRate,
            _trades[tid].penaltyRate,
            _trades[tid].state
        );
    }

    function getWaitPay(bytes memory tid) 
        public
        view
        returns ( 
            uint256 needRepay)
    {
        Trade storage trade = _trades[tid];
        if(trade.borrower == address(0)) {
            return 0;
        }

        uint256 currentTime = block.timestamp;
        needRepay = trade.target.value.add(trade.target.interest);
        if (currentTime > trade.target.endDate) {
            // 86400
            uint256 overdueDays = currentTime.sub(trade.target.endDate).div(_OVER_DUE_HOURS);
            uint256 penaltyAmount = overdueDays.rate(trade.penaltyRate);
            needRepay = needRepay.add(penaltyAmount);
        }
    }
     

    event ReceviedNft(address indexed operator, address indexed from, uint256 indexed tokenId, bytes data);

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) public virtual override returns (bytes4) {
        // Trade memory trade = _trades[data];
        // if(trade.borrower == operator
        //     && trade.nftAddress == from
        //     && trade.nftTokenId == tokenId) {
        //         return this.onERC721Received.selector;
        //     }
        // return this.myName.selector;
        emit ReceviedNft(operator, from, tokenId, data);
        return this.onERC721Received.selector;
    }

    function myName() public pure returns (string memory) {
        return "VivLendTrade";
    }

    function publish(
        address nftAddress,
        uint256 nftTokenId,
        bytes memory tid,
        uint256[] memory values,
        address platform,
        address token
    ) external {
        require(nftAddress != address(0), "VIV5610");
        require(platform != address(0), "VIV5002");
        require(values[0] > 0, "VIV5612");

        Trade storage trade = _trades[tid];
        require(trade.borrower == address(0), "VIV5004");

        trade.nftAddress = nftAddress;
        trade.nftTokenId = nftTokenId;
        trade.target.value = values[0];
        trade.target.interest = values[1];
        trade.feeRate = values[2];
        trade.penaltyRate = values[3];
        trade.tid = tid;
        trade.target.token = token;
        trade.borrower = msg.sender;
        trade.platform = platform;
        trade.state = State.Published;

        // transfer NFT for this contract
        IERC721(nftAddress).safeTransferFrom(msg.sender, address(this), nftTokenId, tid);
    }

    function lendOut(
        uint256 value,
        bytes memory tid,
        uint256 endDate
    ) external payable {
        require(value > 0, "VIV5613");
        Trade storage trade = _trades[tid];
        require(trade.borrower != address(0), "VIV5005");
        require(trade.state == State.Published, "VIV5601");
        require(value == trade.target.value, "VIV5602");
        _checkTransferIn(trade.target.token, value);

        _transferFrom(trade.target.token, msg.sender, address(this), value);
        _transfer(trade.target.token, trade.borrower, value);

        trade.lender = msg.sender;
        trade.state = State.Lending;
        trade.target.endDate = endDate;
    }

    function repay(uint256 value, bytes memory tid) external payable {
        _repay(value, tid, block.timestamp);
    }

    function _repay(
        uint256 value,
        bytes memory tid,
        uint256 currentTime
    ) internal {
        Trade storage trade = _trades[tid];
        require(trade.borrower != address(0), "VIV5005");
        require(trade.state == State.Lending, "VIV5603");

        _checkTransferIn(trade.target.token, value);

        uint256 needRepay = trade.target.value.add(trade.target.interest);
        uint256 penaltyAmount = 0;
        if (currentTime > trade.target.endDate) {
            // 86400
            uint256 overdueDays = currentTime.sub(trade.target.endDate).div(_OVER_DUE_HOURS);
            penaltyAmount = overdueDays.rate(trade.penaltyRate);
            needRepay = needRepay.add(penaltyAmount);
        }

        require(value >= needRepay, "VIV5604");
        _transferFrom(trade.target.token, msg.sender, address(this), value);

        // Fees are charged only if the fee is less than the interest and penalty.
        uint256 fee = needRepay.rate(trade.feeRate);
        if (fee < trade.target.interest.add(penaltyAmount)) {
            _transfer(trade.target.token, trade.platform, fee);
            _transfer(trade.target.token, trade.lender, value.sub(fee));
        } else {
            _transfer(trade.target.token, trade.lender, value);
        }

        _withdrawNft(trade.nftAddress, trade.nftTokenId, trade.borrower);
        trade.state = State.Closed;
    }

    function withdraw(uint256 value, bytes memory tid) external payable {
        _withdraw(value, tid, block.timestamp);
    }

    function _withdraw(
        uint256 value,
        bytes memory tid,
        uint256 currentTime
    ) internal {
        Trade storage trade = _trades[tid];
        require(trade.borrower == msg.sender || trade.lender == msg.sender, "VIV5605");
        if (trade.borrower == msg.sender) {
            // Borrowers can only withdraw if state is Published
            require(trade.state == State.Published, "VIV5606");
            _withdrawNft(trade.nftAddress, trade.nftTokenId, trade.borrower);
        } else {
            // The lender can only withdraw after the borrower is overdue
            require(trade.state == State.Lending, "VIV5607");
            require(currentTime > trade.target.endDate + _OVER_DUE_HOURS, "VIV5608");

            uint256 fee = trade.target.value.add(trade.target.interest).rate(trade.feeRate);
            require(value >= fee, "VIV5609");
            _checkTransferIn(trade.target.token, value);
            _transferFrom(trade.target.token, msg.sender, address(this), fee);
            _transfer(trade.target.token, trade.platform, fee);

            _withdrawNft(trade.nftAddress, trade.nftTokenId, trade.lender);
        }
        trade.state = State.Closed;
    }

    function _withdrawNft(
        address nftAddress,
        uint256 nftTokenId,
        address to
    ) private {
        IERC721(nftAddress).approve(to, nftTokenId);
        IERC721(nftAddress).safeTransferFrom(address(this), to, nftTokenId);
    }
}

// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity 0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../util/SignUtil.sol";

/**
 * The multi-signature contract is used for multiple people to manage a fund, and the transfer can only be completed after the confirmation of the designated number of people.
 * At the same time, multi-signature contracts can change the number of confirmed members and confirmed members, and these operations also require confirmation by a designated number of people.
 */
interface MultiSign {
    // multi-sign transaction going out of the wallet (record who signed for it last, the operation hash, how much, and to whom it's going).
    event MultiTransact(address member, bytes32 operation, uint256 value, address to, bytes data);

    // Confirmation still needed for a transaction.
    event ConfirmationNeeded(bytes32 operation, address initiator, uint256 value, address to, bytes data);

    // FUNCTIONS
    function isMember(address addr) external view returns (bool);

    function hasConfirmed(address member, bytes calldata data) external view returns (bool);

    function execute(
        address to,
        uint256 value,
        address token,
        bytes calldata data
    ) external payable returns (bytes32);

    function confirm(bytes calldata data) external payable returns (bool);
}


/**
 * Viv multi sign
 */
contract VivMultiSign is MultiSign, ReentrancyGuard {

    using SafeERC20 for IERC20;
    using Address for address payable;

    // Transaction structure to remember details of transaction lest it need be saved for a later call.
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        address token;
    }

    // struct for the status of a pending operation.
    struct PendingState {
        uint256 yetNeeded;
        uint256 membersDone;
        uint256 index;
    }

    // pending transactions we have at present.
    mapping(bytes32 => Transaction) _txs;

    // the number of members that must confirm the same operation before it is run.
    uint256 private _threshold;
    // pointer used to find a free slot in _members
    uint256 private _numMembers;

    // list of members
    address[11] _members;
    // max members
    uint256 public constant MAX_MEMBERS_COUNT = 10;
    // index on the list of members to allow reverse lookup
    mapping(address => uint256) _memberIndex;
    // the ongoing operations.
    mapping(bytes32 => PendingState) _pending;
    // index of pending
    bytes32[] _pendingIndex;

    // this contract only has five types of events: it can accept a confirmation, in which case
    // we record member and operation (hash) alongside it.
    event Confirmation(address member, bytes32 operation);

    event Transfer(address indexed from, address indexed to, uint256 value);

    // MODIFIERS

    // multi-sign function modifier: the operation must have an intrinsic hash in order
    // that later attempts can be realised as the same underlying operation and
    // thus count as confirmations.
    modifier onlyManyMembers(bytes calldata data) {
        if (_confirmAndCheck(ECDSA.toEthSignedMessageHash(abi.encode(data)))) _;
    }

    
    /**
     * Contract constructor sets initial members and required number of confirmations.
     * @param members List of initial members. Max of members is 10.
     * @param threshold Number of required confirmations. Min of threshold is 2.
     */
    constructor(address[] memory members, uint256 threshold) {
        require(members.length <= MAX_MEMBERS_COUNT, "VIV1404");
        require(threshold <= members.length && threshold >= 2, "VIV0033");
        _numMembers = members.length;
        for (uint256 i = 0; i < members.length; ++i) {
            require(members[i] != address(0), "VIV0034");
            require(_memberIndex[members[i]] == 0, "VIV0035");
            _members[1 + i] = members[i];
            _memberIndex[members[i]] = 1 + i;
        }
        _threshold = threshold;
    }

    /**
     * Returns size of members 
     * @return size of members.
     */
    function numberOfMembers() external view returns (uint256) {
        return _numMembers;
    }

    /**
     * Returns size of required confirmations
     * @return size of required confirmations.
     */
    function numberOfThreshold() external view returns (uint256) {
        return _threshold;
    }

    /**
     * Returns list of members
     * @return List of owner members.
     */
    function getMembers() external view returns (address[] memory) {
        address[] memory temp = new address[](_numMembers);
        for (uint256 i = 1; i <= _numMembers; ++i) {
            temp[i - 1] = _members[i];
        }
        return temp;
    }

    /**
     * Returns array with members addresses, which confirmed transaction. 
     * @return Returns array of owner addresses.
     * @return Returns size of confirmed members.
     */
    function getConfirm(bytes calldata data) external view returns (uint256, address[] memory) {
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        PendingState memory pending = _pending[operation];
        address[] memory confirmMembers = new address[](_numMembers);
        // There are no operation
        if (pending.yetNeeded == 0) {
            return (0, confirmMembers);
        }
        uint256 count = 0;
        for (uint256 i = 1; i <= _numMembers; ++i) {
            uint256 memberIndexBit = 2**i;
            if (pending.membersDone & memberIndexBit > 0) {
                count++;
                confirmMembers[i - 1] = _members[i];
            }
        }
        return (count, confirmMembers);
    }

    /**
     * Determine whether it is one of the members
     * @return true/false
     */
    function isMember(address member) external view override returns (bool) {
        return _memberIndex[member] > 0;
    }

    /**
     * Determine whether the member has confirmed the transaction
     * @param member Member
     * @param data Transaction Id
     */
    function hasConfirmed(address member, bytes calldata data) external view override returns (bool) {
        uint256 memberIndex = _memberIndex[member];
        if (memberIndex == 0) return false;
        // determine the bit to set for this member.
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        PendingState memory pending = _pending[operation];
        uint256 memberIndexBit = 2**memberIndex;
        if (pending.membersDone & memberIndexBit == 0) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Confirm and check
     * 1) If the transaction does not exist, record a new transaction, and set the number of times to be confirmed as threshold.
     * 2) If the transaction is exists, judge whether the current member has confirmed it, and throw an exception if it has been confirmed. 
     *    If it has not been confirmed, it will be judged whether the number of confirmations has reached the threshold. 
     *    If yes, the transaction will be deleted and true will be returned. 
     *    Otherwise, the number of confirmations needs to be reduced by one. The current confirmation member will be recorded and false will be returned.
     * @param operation operation hash
     */
    function _confirmAndCheck(bytes32 operation) internal returns (bool) {
        // determine what index the present sender is:
        uint256 memberIndex = _memberIndex[msg.sender];

        PendingState storage pending = _pending[operation];
        // if we're not yet working on this operation, switch over and reset the confirmation status.
        if (pending.yetNeeded == 0) {
            // reset count of confirmations needed.
            pending.yetNeeded = _threshold;
            // reset which members have confirmed (none) - set our bitmap to 0.
            pending.membersDone = 0;
            pending.index = _pendingIndex.length;
            _pendingIndex.push(operation);
        }
        // determine the bit to set for this member.
        uint256 memberIndexBit = 2**memberIndex;
        // make sure we (the message sender) haven't confirmed this operation previously.
        if (pending.membersDone & memberIndexBit != 0) {
            revert("VIV1402");
        }
        emit Confirmation(msg.sender, operation);
        // ok - check if count is enough to go ahead.
        if (pending.yetNeeded <= 1) {
            // enough confirmations: reset and run interior.
            delete _pendingIndex[_pending[operation].index];
            delete _pending[operation];
            return true;
        } else {
            // not enough: record that this member in particular confirmed.
            pending.yetNeeded--;
            pending.membersDone |= memberIndexBit;
        }
        return false;
    }

    receive() external payable {}

    /* 
     * Members of this contract can initiate a transfer transaction through this method. 
     * The other members confirm the transaction through the confirm method.
     * @param to Destination address of transaction.
     * @param value Payment of transaction.
     * @param token Token address (or 0 if ETH) that is used for the payment.
     * @param data Transaction Id
     */
    function execute(
        address to,
        uint256 value,
        address token,
        bytes calldata data
    ) external payable override nonReentrant() returns (bytes32 operation) {
        require(_memberIndex[msg.sender] > 0, "VIV0005");
        require(to != address(0), "VIV1401");
        require(value > 0, "VIV0001");
        
        if (token == address(0)) {
            require(address(this).balance >= value, "VIV0036");
        } else {
            require(IERC20(token).balanceOf(address(this)) >= value, "VIV0037");
        }

        // Determine our operation hash.
        operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        // Initiator indicates a confirmation
        if (!_confirm(data)) {
            _txs[operation].to = to;
            _txs[operation].value = value;
            _txs[operation].data = data;
            _txs[operation].token = token;
            emit ConfirmationNeeded(operation, msg.sender, value, to, data);
        }
    }

    /**
     * Members of this contract use this method to confirm transactions initiated by execute.
     * @param data Transaction Id
     */
    function confirm(bytes calldata data) public payable nonReentrant() override returns (bool result) {
        require(_memberIndex[msg.sender] > 0, "VIV0005");
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        require(_txs[operation].to != address(0), "VIV5005");
        return _confirm(data);
    }

    /**
     * Members of this contract use this method to confirm transactions initiated by execute.
     * Use onlyManyMembers to determine whether the threshold is reached. If so, execute the code in the function body.
     * @param data Input in the execute method
     */
    function _confirm(bytes calldata data) internal onlyManyMembers(data) returns (bool result) {
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        if (_txs[operation].to != address(0)) {
            if (_txs[operation].token == address(0)) {
                payable(_txs[operation].to).transfer(_txs[operation].value);
                emit Transfer(address(this), _txs[operation].to, _txs[operation].value);
            } else {
                IERC20(_txs[operation].token).safeTransfer(_txs[operation].to, _txs[operation].value);
            }
            emit MultiTransact(msg.sender, operation, _txs[operation].value, _txs[operation].to, _txs[operation].data);
            delete _txs[operation];
            return true;
        }
        return false;
    }
}

// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../util/SignUtil.sol";

/**
 * The multi-signature contract is used for multiple people to manage a fund, and the transfer can only be completed after the confirmation of the designated number of people.
 * At the same time, multi-signature contracts can change the number of confirmed members and confirmed members, and these operations also require confirmation by a designated number of people.
 */
interface MultiSign {
    // Single transaction going out of the wallet (record who signed for it, how much, and to whom it's going).
    event SingleTransact(address owner, uint256 value, address to, bytes data);

    // multi-sign transaction going out of the wallet (record who signed for it last, the operation hash, how much, and to whom it's going).
    event MultiTransact(address owner, bytes32 operation, uint256 value, address to, bytes data);

    // Confirmation still needed for a transaction.
    event ConfirmationNeeded(bytes32 operation, address initiator, uint256 value, address to, bytes data);

    // FUNCTIONS
    function isOwner(address addr) external view returns (bool);

    function hasConfirmed(address owner, bytes calldata data) external view returns (bool);

    function execute(
        address to,
        uint256 value,
        address token,
        bytes calldata data
    ) external payable returns (bytes32);

    function confirm(bytes calldata data) external payable returns (bool);

    function revoke(bytes calldata data) external;

    function changeOwner(
        address oldOwenr,
        address newOwner,
        bytes calldata data
    ) external;

    function addOwner(
        address owner,
        uint256 threshold,
        bytes calldata data
    ) external;

    function removeOwner(
        address owner,
        uint256 threshold,
        bytes calldata data
    ) external;

    function changeRequirement(uint256 threshold, bytes calldata data) external;

    function changeDailyLimit(uint256 newLimit, bytes calldata data) external;

    function clearSpentToday(bytes calldata data) external;
}

/**
 * multi-signn, daily-limited account proxy/wallet.
 */
abstract contract MultiOwned is MultiSign {
    // struct for the status of a pending operation.
    struct PendingState {
        uint256 yetNeeded;
        uint256 ownersDone;
        uint256 index;
    }

    // the number of owners that must confirm the same operation before it is run.
    uint256 private _threshold;
    // pointer used to find a free slot in _owners
    uint256 private _numOwners;

    // list of owners
    address[11] _owners;
    // max owners allow to set

    uint256 public constant MAX_OWNER_COUNT = 10;
    // index on the list of owners to allow reverse lookup
    mapping(address => uint256) _ownerIndex;
    // the ongoing operations.
    mapping(bytes32 => PendingState) _pending;
    // index of pending
    bytes32[] _pendingIndex;

    // this contract only has five types of events: it can accept a confirmation, in which case
    // we record owner and operation (hash) alongside it.
    event Confirmation(address owner, bytes32 operation);
    event Revoke(address owner, bytes32 operation);
    // some others are in the case of an owner changing.
    event OwnerChanged(address oldOwner, address newOwner, bytes32 operation);
    event OwnerAdded(address newOwner, bytes32 operation);
    event OwnerRemoved(address oldOwner, bytes32 operation);
    // the last one is emitted if the threshold signatures change
    event RequirementChanged(uint256 newRequirement, bytes32 operation);

    // MODIFIERS

    // allow owner modifier
    modifier onlyOwner(address addr) {
        require(_ownerIndex[addr] > 0, "VIV0005");
        _;
    }

    // not owner function modifier.
    modifier notOwner(address addr) {
        require(_ownerIndex[addr] == 0, "VIV0031");
        _;
    }

    // multi-sign function modifier: the operation must have an intrinsic hash in order
    // that later attempts can be realised as the same underlying operation and
    // thus count as confirmations.
    modifier onlyManyOwners(bytes calldata data) {
        if (_confirmAndCheck(ECDSA.toEthSignedMessageHash(abi.encode(data)))) _;
    }

    modifier minThreshold(uint256 threshold, uint256 numOwners) {
        require(threshold > 0 && threshold <= numOwners, "VIV0032");
        _;
    }

    modifier maxMembers(uint256 maxOwners, uint256 numOwners) {
        require(numOwners <= maxOwners, "VIV1404");
        _;
    }

    modifier validAddress(address owner) {
        require(owner != address(0), "VIV1405");
        _;
    }

    // constructor is given number of signs threshold to do protected "onlyManyOwners" transactions
    // as well as the selection of addresses capable of confirming them.
    constructor(address[] memory owners, uint256 threshold) {
        require(threshold <= owners.length && threshold >= 2, "VIV0033");
        _numOwners = owners.length;
        for (uint256 i = 0; i < owners.length; ++i) {
            require(owners[i] != address(0), "VIV0034");
            require(_ownerIndex[owners[i]] == 0, "VIV0035");
            _owners[1 + i] = owners[i];
            _ownerIndex[owners[i]] = 1 + i;
        }
        _threshold = threshold;
    }

    function numberOfOwners() external view returns (uint256) {
        return _numOwners;
    }

    function numberOfThreshold() external view returns (uint256) {
        return _threshold;
    }

    function getOwners() external view returns (address[] memory) {
        address[] memory temp = new address[](_numOwners);
        for (uint256 i = 1; i <= _numOwners; ++i) {
            temp[i - 1] = _owners[i];
        }
        return temp;
    }

    function getConfirm(bytes calldata data) external view returns (uint256, address[] memory) {
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        PendingState memory pending = _pending[operation];
        address[] memory confirmOwners = new address[](_numOwners);
        // There are no operation
        if (pending.yetNeeded == 0) {
            return (0, confirmOwners);
        }
        uint256 count = 0;
        for (uint256 i = 1; i <= _numOwners; ++i) {
            uint256 ownerIndexBit = 2**i;
            if (pending.ownersDone & ownerIndexBit > 0) {
                count++;
                confirmOwners[i - 1] = _owners[i];
            }
        }
        return (count, confirmOwners);
    }

    // Allows an owner to revoke a confirmation for a transaction.
    function revoke(bytes calldata data) external override onlyOwner(msg.sender) {
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        require(_pending[operation].yetNeeded > 0, "VIV5005");
        uint256 ownerIndex = _ownerIndex[msg.sender];
        uint256 ownerIndexBit = 2**ownerIndex;
        PendingState storage pending = _pending[operation];
        require(pending.ownersDone & ownerIndexBit > 0, "VIV1403");
        pending.yetNeeded++;
        pending.ownersDone -= ownerIndexBit;
        emit Revoke(msg.sender, operation);
    }

    // Replace an owner `from` with another `to`.
    function changeOwner(
        address from,
        address to,
        bytes calldata data
    ) external override validAddress(from) validAddress(to) onlyOwner(from) notOwner(to) onlyManyOwners(data) {
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        _clearPending();
        uint256 ownerIndex = _ownerIndex[from];
        _owners[ownerIndex] = to;
        _ownerIndex[from] = 0;
        _ownerIndex[to] = ownerIndex;
        emit OwnerChanged(from, to, operation);
    }

    // Add an owner
    function addOwner(
        address owner,
        uint256 newthreshold,
        bytes calldata data
    )
        external
        override
        validAddress(owner)
        notOwner(owner)
        minThreshold(newthreshold, _numOwners + 1)
        maxMembers(MAX_OWNER_COUNT, _numOwners + 1)
        onlyManyOwners(data)
    {
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        _clearPending();
        _numOwners++;
        _owners[_numOwners] = owner;
        _ownerIndex[owner] = _numOwners;
        emit OwnerAdded(owner, operation);

        _changeThreshold(newthreshold, operation);
    }

    // Remove an owner
    function removeOwner(
        address owner,
        uint256 newthreshold,
        bytes calldata data
    )
        external
        override
        validAddress(owner)
        minThreshold(newthreshold, _numOwners - 1)
        onlyOwner(owner)
        onlyManyOwners(data)
    {
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        uint256 ownerIndex = _ownerIndex[owner];
        _owners[ownerIndex] = address(0);
        _ownerIndex[owner] = 0;
        _clearPending();
        _reorganizeOwners(); //make sure m_numOwner is equal to the number of owners and always points to the optimal free slot
        emit OwnerRemoved(owner, operation);

        _changeThreshold(newthreshold, operation);
    }

    // Change requirement
    function changeRequirement(uint256 newthreshold, bytes calldata data)
        external
        override
        minThreshold(newthreshold, _numOwners)
        onlyManyOwners(data)
    {
        _changeThreshold(newthreshold, ECDSA.toEthSignedMessageHash(abi.encode(data)));
    }

    function _changeThreshold(uint256 newthreshold, bytes32 operation) internal {
        if (newthreshold == _threshold) return;
        _threshold = newthreshold;
        _clearPending();
        emit RequirementChanged(newthreshold, operation);
    }

    function isOwner(address owner) external view override returns (bool) {
        return _ownerIndex[owner] > 0;
    }

    function hasConfirmed(address owner, bytes calldata data) external view override returns (bool) {
        uint256 ownerIndex = _ownerIndex[owner];
        if (ownerIndex == 0) return false;
        // determine the bit to set for this owner.
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        PendingState memory pending = _pending[operation];
        uint256 ownerIndexBit = 2**ownerIndex;
        if (pending.ownersDone & ownerIndexBit == 0) {
            return false;
        } else {
            return true;
        }
    }

    // confirm and check
    function _confirmAndCheck(bytes32 operation) internal onlyOwner(msg.sender) returns (bool) {
        // determine what index the present sender is:
        uint256 ownerIndex = _ownerIndex[msg.sender];

        PendingState storage pending = _pending[operation];
        // if we're not yet working on this operation, switch over and reset the confirmation status.
        if (pending.yetNeeded == 0) {
            // reset count of confirmations needed.
            pending.yetNeeded = _threshold;
            // reset which owners have confirmed (none) - set our bitmap to 0.
            pending.ownersDone = 0;
            pending.index = _pendingIndex.length;
            _pendingIndex.push(operation);
        }
        // determine the bit to set for this owner.
        uint256 ownerIndexBit = 2**ownerIndex;
        // make sure we (the message sender) haven't confirmed this operation previously.
        if (pending.ownersDone & ownerIndexBit != 0) {
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
            // not enough: record that this owner in particular confirmed.
            pending.yetNeeded--;
            pending.ownersDone |= ownerIndexBit;
        }
        return false;
    }

    function _reorganizeOwners() private {
        uint256 free = 1;
        while (free < _numOwners) {
            while (free < _numOwners && _owners[free] != address(0)) free++;
            while (_numOwners > 1 && _owners[_numOwners] == address(0)) _numOwners--;
            if (free < _numOwners && _owners[_numOwners] != address(0) && _owners[free] == address(0)) {
                _owners[free] = _owners[_numOwners];
                _ownerIndex[_owners[free]] = free;
                _owners[_numOwners] = address(0);
            }
        }
    }

    function _clearPending() internal virtual {
        uint256 length = _pendingIndex.length;
        for (uint256 i = 0; i < length; ++i) if (_pendingIndex[i] != 0) delete _pending[_pendingIndex[i]];
        delete _pendingIndex;
    }
}

/**
 * inheritable "property" contract that enables methods to be protected by placing a linear limit (specifiable)
 * on a particular resource per calendar day. is multiowned to allow the limit to be altered. resource that method
 * uses is specified in the modifier.
 */
contract DayLimit {
    uint256 internal _dailyLimit;
    uint256 internal _spentToday;
    uint256 internal _lastDay;

    event DailyLimitChanged(uint256 newLimit);
    event SpentTodayCleared(uint256 spentToday);

    // constructor - stores initial daily limit and records the present day's index.
    constructor(uint256 limit) {
        _dailyLimit = limit;
        _lastDay = _today();
    }

    // (re)sets the daily limit. needs many of the owners to confirm. doesn't alter the amount already spent today.
    function _setDailyLimit(uint256 newLimit) internal {
        _dailyLimit = newLimit;
        emit DailyLimitChanged(newLimit);
    }

    // (re)sets the daily limit. needs many of the owners to confirm. doesn't alter the amount already spent today.
    function _resetSpentToday() internal {
        _spentToday = 0;
        emit SpentTodayCleared(_spentToday);
    }

    // checks to see if there is at least `value` left from the daily limit today. if there is, subtracts it and
    // returns true. otherwise just returns false.
    function _underLimit(uint256 value) internal returns (bool) {
        // reset the spend limit if we're on a different day to last time.
        if (_today() > _lastDay) {
            _spentToday = 0;
            _lastDay = _today();
        }
        // check to see if there's enough left - if so, subtract and return true.
        if (_spentToday + value >= _spentToday && _spentToday + value <= _dailyLimit) {
            _spentToday += value;
            return true;
        }
        return false;
    }

    // determines today's index.
    function _today() private view returns (uint256) {
        return block.timestamp / 1 days;
    }
}

/**
 * Viv multi sign
 */
contract VivMultiSign is MultiSign, MultiOwned, DayLimit, ReentrancyGuard {

    using SafeERC20 for IERC20;
    using Address for address payable;

    // Transaction structure to remember details of transaction lest it need be saved for a later call.
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        address token;
    }

    // pending transactions we have at present.
    mapping(bytes32 => Transaction) _txs;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Destruct(address indexed to);

    // constructor - just pass on the owner array to the multiowned and
    // the limit to daylimit
    constructor(
        address[] memory owners,
        uint256 threshold,
        uint256 daylimit
    ) MultiOwned(owners, threshold) DayLimit(daylimit) {}

    function dailyLimit() external view returns (uint256) {
        return _dailyLimit;
    }

    function spentToday() external view returns (uint256) {
        return _spentToday;
    }

    // (re)sets the daily limit. needs many of the owners to confirm. doesn't alter the amount already spent today.
    function changeDailyLimit(uint256 newLimit, bytes calldata data) external override onlyManyOwners(data) {
        _setDailyLimit(newLimit);
    }

    // (re)sets the daily limit. needs many of the owners to confirm. doesn't alter the amount already spent today.
    function clearSpentToday(bytes calldata data) external override onlyManyOwners(data) {
        _resetSpentToday();
    }

    function _clearPending() internal override {
        uint256 length = _pendingIndex.length;
        for (uint256 i = 0; i < length; ++i) delete _txs[_pendingIndex[i]];
        super._clearPending();
    }

    receive() external payable {}

    /* Outside-visible transact entry point. Executes transacion immediately if below daily spend limit.
     * If not, goes into multisig process. We provide a hash on return to allow the sender to provide
     * shortcuts for the other confirmations (allowing them to avoid replicating the to, value
     * and data arguments). They still get the option of using them if they want, anyways.
     * @param to Destination address of transaction.
     * @param value Payment of transaction.
     * @param token Token address (or 0 if ETH) that is used for the payment.
     * @param data Data payload of transaction.
     */
    function execute(
        address to,
        uint256 value,
        address token,
        bytes calldata data
    ) external payable override nonReentrant() onlyOwner(msg.sender) returns (bytes32 operation) {
        require(to != address(0), "VIV1401");
        require(value > 0, "VIV0001");

        if (token == address(0)) {
            require(address(this).balance >= value, "VIV0036");
        } else {
            require(IERC20(token).balanceOf(address(this)) >= value, "VIV0037");
        }

        // first, take the opportunity to check that we're under the daily limit.
        if (_underLimit(value)) {
            emit SingleTransact(msg.sender, value, to, data);
            // yes - just execute the call.
            if (token == address(0)) {
                payable(to).sendValue(value);
                emit Transfer(address(this), to, value);
            } else {
                IERC20(token).safeTransfer(to, value);
            }
            return 0;
        }
        // determine our operation hash.
        operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        if (!_confirm(data)) {
            _txs[operation].to = to;
            _txs[operation].value = value;
            _txs[operation].data = data;
            _txs[operation].token = token;
            emit ConfirmationNeeded(operation, msg.sender, value, to, data);
        }
    }

    function confirm(bytes calldata data) public payable nonReentrant() override returns (bool result) {
        bytes32 operation = ECDSA.toEthSignedMessageHash(abi.encode(data));
        require(_txs[operation].to != address(0), "VIV5005");
        return _confirm(data);
    }

    /**
     * confirm a transaction through just the hash. we use the previous transactions map, _txs, in order
     * to determine the body of the transaction from the hash provided.
     * @param data Input in the execute method
     */
    function _confirm(bytes calldata data) internal onlyManyOwners(data) returns (bool result) {
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
